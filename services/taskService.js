const Task = require("../models/Task");
const AuditLog = require("../models/AuditLog");

// Get all tasks
exports.getAllTasks = async () => { 
  return await Task.find().sort({ order: 1 });
};

// Get task by ID
exports.findTaskById = async (id) => {
  return await Task.findById(id);
};

// Create new task
exports.createTask = async (data) => {
  if (!data.createdBy) {
    throw new Error("User information is required");
  }
  
  const task = await Task.create(data);
  
  await AuditLog.create({
    taskId: task._id,
    action: "TASK_CREATED",
    userId: data.createdBy._id,
    userInfo: data.createdBy,
    newData: data
  });
  
  return task;
};

// Update task
exports.updateTask = async (id, updateData) => {
  if (!updateData.updatedBy) {
    throw new Error("User information is required for update");
  }
  
  const task = await Task.findByIdAndUpdate(
    id, 
    updateData, 
    { new: true, runValidators: true }
  );
  
  if (task) {
    await AuditLog.create({
      taskId: task._id,
      action: "TASK_UPDATED",
      userId: updateData.updatedBy._id,
      userInfo: updateData.updatedBy,
      newData: updateData
    });
  }
  
  return task;
};

// Delete task
exports.deleteTask = async (id, deleteData) => {
  const task = await Task.findById(id);
  
  if (task) {
    await AuditLog.create({
      taskId: task._id,
      action: "TASK_DELETED",
      userId: deleteData.deletedBy?._id,
      userInfo: deleteData.deletedBy,
      oldData: task
    });
    
    await Task.findByIdAndDelete(id);
  }
  
  return task;
};

// Move task (drag and drop) - UPDATED with user info
exports.moveTask = async (id, status, order, userInfo) => {
  const task = await Task.findById(id);
  
  if (!task) {
    throw new Error("Task not found");
  }

  const oldStatus = task.status;
  const oldOrder = task.order;
  
  task.status = status;
  task.order = order;
  task.version = (task.version || 1) + 1;
  
  // Add updatedBy info when moving task
  if (userInfo) {
    task.updatedBy = {
      _id: userInfo._id,
      name: userInfo.name,
      email: userInfo.email
    };
  }

  await task.save();
  
  // Create detailed audit log for move action
  await AuditLog.create({
    taskId: task._id,
    action: "TASK_MOVED",
    userId: userInfo?._id,
    userInfo: userInfo,
    oldStatus,
    newStatus: status,
    oldOrder,
    newOrder: order,
    metadata: {
      from: oldStatus,
      to: status,
      fromPosition: oldOrder,
      toPosition: order
    }
  });

  return task;
};

// Get latest task number
exports.getLatestTaskNumber = async () => {
  const latestTask = await Task.findOne()
    .sort({ taskNumber: -1 })
    .select('taskNumber');
    
  if (!latestTask || !latestTask.taskNumber) {
    return 0;
  }
  
  const taskNumber = latestTask.taskNumber;
  if (typeof taskNumber === 'string') {
    const numericPart = taskNumber.replace(/[^0-9]/g, '');
    return parseInt(numericPart) || 0;
  }
  
  return parseInt(taskNumber) || 0;
};