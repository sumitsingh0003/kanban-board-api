const Task = require("../models/Task");
const AuditLog = require("../models/AuditLog");
const emailService = require("./emailService");
const { logger } = require("../utils/logger");

// Get all active tasks (newest first)
exports.getAllTasks = async () => { 
  logger.debug('Fetching all tasks');
  const tasks = await Task.find({ active_status: 1 }).sort({ createdAt: -1 });
  logger.info(`Fetched ${tasks.length} tasks`);
  return tasks;
};

// Get task by ID
exports.findTaskById = async (id, includeInactive = false) => {
  logger.debug('Finding task by ID', { taskId: id, includeInactive });
  const query = { _id: id };
  if (!includeInactive) {
    query.active_status = 1;
  }
  const task = await Task.findOne(query);
  if (task) {
    logger.debug('Task found', { taskId: id, taskNumber: task.taskNumber });
  } else {
    logger.warn('Task not found', { taskId: id });
  }
  return task;
};

// Create new task
exports.createTask = async (data) => {
  logger.info('Creating new task', { createdBy: data.createdBy?.email });

  if (!data.createdBy) {
    logger.error('User information is required for task creation');
    throw new Error("User information is required");
  }
  
  const task = await Task.create({
    ...data,
    active_status: 1,
    editHistory: []
  });
  
  logger.info(`Task created successfully`, { 
    taskId: task._id, 
    taskNumber: task.taskNumber,
    title: task.title 
  });

  // Create audit log
  await AuditLog.create({
    taskId: task._id,
    taskNumber: task.taskNumber,
    taskTitle: task.title,
    action: "TASK_CREATED",
    userId: data.createdBy._id,
    userInfo: data.createdBy,
    assignedTo: task.assignedTo,
    newData: task,
    metadata: {
      createdBy: data.createdBy.name,
      timestamp: new Date().toISOString()
    }
  });

  logger.debug('Audit log created for task creation', { taskId: task._id });

  // Send assignment emails if any
  if (task.assignedTo && task.assignedTo.length > 0) {
    logger.info(`Sending assignment emails to ${task.assignedTo.length} users`);
    for (const assignee of task.assignedTo) {
      await emailService.sendAssignmentEmail(task, assignee, data.createdBy, 'assigned');
    }
  }

  return task;
};

// Update task with edit history
exports.updateTask = async (id, updateData) => {
  logger.info('Updating task', { taskId: id, updatedBy: updateData.updatedBy?.email });

  if (!updateData.updatedBy) {
    logger.error('User information is required for update');
    throw new Error("User information is required for update");
  }

  const oldTask = await Task.findById(id);
  if (!oldTask) {
    logger.error('Task not found for update', { taskId: id });
    throw new Error("Task not found");
  }

  // Track changes
  const changes = {};
  const changedFields = [];
  
  for (const key of Object.keys(updateData)) {
    if (key !== 'updatedBy' && key !== 'editHistory' && key !== 'assignedTo') {
      const oldValue = oldTask[key];
      const newValue = updateData[key];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = { old: oldValue, new: newValue };
        changedFields.push(key);
      }
    }
  }

  // Check if assignment changed
  const oldAssignees = oldTask.assignedTo || [];
  const newAssignees = updateData.assignedTo || [];
  
  const oldIds = oldAssignees.map(a => a._id.toString());
  const newIds = newAssignees.map(a => a._id.toString());

  const addedAssignees = newAssignees.filter(a => !oldIds.includes(a._id.toString()));
  const removedAssignees = oldAssignees.filter(a => !newIds.includes(a._id.toString()));

  if (addedAssignees.length > 0 || removedAssignees.length > 0) {
    logger.info('Assignment changes detected', { 
      taskId: id,
      added: addedAssignees.length,
      removed: removedAssignees.length
    });
  }

  // Create edit history entry
  const editHistoryEntry = {
    updatedBy: updateData.updatedBy,
    changes: changes,
    timestamp: new Date()
  };

  // Update task with new data and push to editHistory
  const task = await Task.findByIdAndUpdate(
    id,
    {
      ...updateData,
      $push: { editHistory: editHistoryEntry }
    },
    { new: true, runValidators: true }
  );

  logger.info('Task updated successfully', { 
    taskId: task._id, 
    taskNumber: task.taskNumber,
    changes: changedFields 
  });

  // Create audit log
  await AuditLog.create({
    taskId: task._id,
    taskNumber: task.taskNumber,
    taskTitle: task.title,
    action: "TASK_UPDATED",
    userId: updateData.updatedBy._id,
    userInfo: updateData.updatedBy,
    oldData: oldTask,
    newData: task,
    assignedTo: task.assignedTo,
    metadata: {
      changes,
      changedFields,
      addedAssignees,
      removedAssignees,
      timestamp: new Date().toISOString()
    }
  });

  // Send emails for new assignments
  if (addedAssignees.length > 0) {
    logger.info(`Sending assignment emails to ${addedAssignees.length} new assignees`);
    for (const assignee of addedAssignees) {
      await emailService.sendAssignmentEmail(task, assignee, updateData.updatedBy, 'assigned');
    }
  }

  return task;
};

// Soft delete task
exports.deleteTask = async (id, deleteData) => {
  logger.info('Soft deleting task', { taskId: id, deletedBy: deleteData.deletedBy?.email });

  const task = await Task.findById(id);
  
  if (!task) {
    logger.error('Task not found for deletion', { taskId: id });
    throw new Error("Task not found");
  }

  // Soft delete - just update active_status
  task.active_status = 0;
  await task.save();

  logger.info('Task soft deleted successfully', { 
    taskId: task._id, 
    taskNumber: task.taskNumber,
    title: task.title 
  });

  // Create audit log for deletion
  await AuditLog.create({
    taskId: task._id,
    taskNumber: task.taskNumber,
    taskTitle: task.title,
    action: "TASK_DELETED",
    userId: deleteData.deletedBy?._id,
    userInfo: deleteData.deletedBy,
    assignedTo: task.assignedTo,
    oldData: task,
    metadata: {
      deletedBy: deleteData.deletedBy?.name,
      deletedByEmail: deleteData.deletedBy?.email,
      timestamp: new Date().toISOString()
    }
  });
  
  return task;
};

// Move task with edit history
exports.moveTask = async (id, status, order, userInfo) => {
  logger.info('Moving task', { taskId: id, toStatus: status, by: userInfo?.email });

  const task = await Task.findById(id);
  
  if (!task) {
    logger.error('Task not found for move', { taskId: id });
    throw new Error("Task not found");
  }

  const oldStatus = task.status;
  const oldOrder = task.order;
  
  // Create changes object
  const changes = {
    status: { old: oldStatus, new: status },
    order: { old: oldOrder, new: order }
  };

  // Create edit history entry
  const editHistoryEntry = {
    updatedBy: userInfo,
    changes: changes,
    timestamp: new Date()
  };

  task.status = status;
  task.order = order;
  task.version = (task.version || 1) + 1;
  task.updatedBy = userInfo;
  
  // Push to edit history
  task.editHistory.push(editHistoryEntry);

  await task.save();
  
  logger.info('Task moved successfully', { 
    taskId: task._id, 
    taskNumber: task.taskNumber,
    from: oldStatus,
    to: status 
  });
  
  // Create audit log
  await AuditLog.create({
    taskId: task._id,
    taskNumber: task.taskNumber,
    taskTitle: task.title,
    action: "TASK_MOVED",
    userId: userInfo?._id,
    userInfo: userInfo,
    assignedTo: task.assignedTo,
    oldData: { status: oldStatus, order: oldOrder },
    newData: { status, order },
    metadata: {
      from: oldStatus,
      to: status,
      fromPosition: oldOrder,
      toPosition: order,
      movedBy: userInfo?.name,
      timestamp: new Date().toISOString()
    }
  });

  return task;
};

// Get latest task number
exports.getLatestTaskNumber = async () => {
  logger.debug('Fetching latest task number');
  
  const latestTask = await Task.findOne({ active_status: 1 })
    .sort({ taskNumber: -1 })
    .select('taskNumber');
    
  if (!latestTask || !latestTask.taskNumber) {
    logger.debug('No existing tasks, returning 0');
    return 0;
  }
  
  const taskNumber = latestTask.taskNumber;
  let numericValue = 0;
  
  if (typeof taskNumber === 'string') {
    const numericPart = taskNumber.replace(/[^0-9]/g, '');
    numericValue = parseInt(numericPart) || 0;
  } else {
    numericValue = parseInt(taskNumber) || 0;
  }
  
  logger.debug('Latest task number', { latestNumber: numericValue });
  return numericValue;
};

// Get task with full edit history
exports.getTaskWithHistory = async (id) => {
  logger.debug('Fetching task with history', { taskId: id });
  const task = await Task.findById(id);
  if (task) {
    logger.debug('Task history fetched', { 
      taskId: id,
      editCount: task.editHistory?.length || 0 
    });
  }
  return task;
};