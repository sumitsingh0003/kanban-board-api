const taskService = require("../services/taskService");
const AuditLog = require("../models/AuditLog");
const { logger } = require("../utils/logger");

// Get all tasks
exports.getTasks = async (req, res, next) => {
  try {
    logger.info('Fetching all tasks', {}, req);
    const tasks = await taskService.getAllTasks();
    logger.info(`Successfully fetched ${tasks.length} tasks`, {}, req);
    res.json(tasks);
  } catch (err) {
    logger.error('Error fetching tasks', err, {}, req);
    next(err);
  }
};

// Get single task by ID
exports.getTaskById = async (req, res, next) => {
  const start = Date.now();
  try {
    const { id } = req.params;
    logger.info('Fetching task by ID', { taskId: id }, req);
    
    // Validate ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      logger.warn('Invalid task ID format', { taskId: id }, req);
      return res.status(400).json({
        success: false,
        msg: 'Invalid task ID format'
      });
    }

    const task = await taskService.getTaskWithHistory(id);
    
    if (!task) {
      logger.warn('Task not found', { taskId: id }, req);
      return res.status(404).json({
        success: false,
        msg: 'Task not found'
      });
    }

    // Check if task is active
    if (task.active_status === 0) {
      logger.warn('Task is deleted', { taskId: id, taskNumber: task.taskNumber }, req);
      return res.status(404).json({
        success: false,
        msg: 'Task has been deleted'
      });
    }

    // Create audit log for view (non-blocking)
    if (req.user && req.user._id) {
      AuditLog.create({
        taskId: task._id,
        taskNumber: task.taskNumber,
        taskTitle: task.title,
        action: "TASK_VIEWED",
        userId: req.user._id,
        userInfo: {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email
        },
        metadata: {
          timestamp: new Date().toISOString(),
          ip: req.ip,
          userAgent: req.get('user-agent')
        }
      }).catch(err => {
        logger.error('Failed to create view audit log', err, { taskId: id });
      });
    }

    const responseTime = Date.now() - start;
    logger.info(`Task fetched successfully in ${responseTime}ms`, { 
      taskId: id, 
      taskNumber: task.taskNumber 
    }, req);

    res.json({
      success: true,
      data: task
    });

  } catch (err) {
    logger.error('Error in getTaskById', err, { taskId: req.params.id }, req);
    next(err);
  }
};

// Create task
exports.createTask = async (req, res, next) => {
  const start = Date.now();
  try {
    logger.info('Creating new task', { body: req.body }, req);
    
    const task = await taskService.createTask(req.body);
    
    const responseTime = Date.now() - start;
    logger.info(`Task created successfully in ${responseTime}ms`, { 
      taskId: task._id, 
      taskNumber: task.taskNumber 
    }, req);

    res.json(task);
  } catch (err) {
    logger.error('Error creating task', err, { body: req.body }, req);
    next(err);
  }
};

// Move task
exports.moveTask = async (req, res, next) => {
  const start = Date.now();
  try {
    const { status, order, user } = req.body;
    logger.info('Moving task', { 
      taskId: req.params.id, 
      toStatus: status, 
      toOrder: order 
    }, req);
    
    const task = await taskService.moveTask(req.params.id, status, order, user);
    
    const responseTime = Date.now() - start;
    logger.info(`Task moved successfully in ${responseTime}ms`, { 
      taskId: task._id, 
      taskNumber: task.taskNumber 
    }, req);

    res.json(task);
  } catch (err) {
    logger.error('Error moving task', err, { taskId: req.params.id }, req);
    next(err);
  }
};

// Delete task (soft delete)
exports.deleteTask = async (req, res, next) => {
  const start = Date.now();
  try {
    const { id } = req.params;
    const { deletedBy } = req.body;
    
    logger.info('Soft deleting task', { taskId: id, deletedBy: deletedBy?.email }, req);
    
    const task = await taskService.findTaskById(id, true);
    
    if (!task) {
      logger.warn('Task not found for deletion', { taskId: id }, req);
      return res.status(404).json({ 
        success: false,
        msg: 'Task not found' 
      });
    }

    await taskService.deleteTask(id, { deletedBy });
    
    const responseTime = Date.now() - start;
    logger.info(`Task soft deleted successfully in ${responseTime}ms`, { 
      taskId: id, 
      taskNumber: task.taskNumber 
    }, req);
    
    res.json({ 
      success: true,
      msg: 'Task deleted successfully' 
    });
  } catch (err) {
    logger.error('Error deleting task', err, { taskId: req.params.id }, req);
    next(err);
  }
};

// Get latest task number
exports.getLatestTaskNumber = async (req, res, next) => {
  const start = Date.now();
  try {
    logger.debug('Fetching latest task number', {}, req);
    
    const latestNumber = await taskService.getLatestTaskNumber();
    
    const responseTime = Date.now() - start;
    logger.debug(`Latest task number fetched in ${responseTime}ms`, { 
      latestNumber 
    }, req);
    
    res.json({ 
      success: true,
      latestNumber 
    });
  } catch (err) {
    logger.error('Error fetching latest task number', err, {}, req);
    next(err);
  }
};

// Update task
exports.updateTask = async (req, res, next) => {
  const start = Date.now();
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    logger.info('Updating task', { 
      taskId: id, 
      updatedBy: updateData.updatedBy?.email 
    }, req);
    
    const task = await taskService.updateTask(id, updateData);
    
    const responseTime = Date.now() - start;
    logger.info(`Task updated successfully in ${responseTime}ms`, { 
      taskId: task._id, 
      taskNumber: task.taskNumber 
    }, req);
    
    res.json({ 
      success: true,
      data: task,
      msg: 'Task updated successfully' 
    });
  } catch (err) {
    logger.error('Error updating task', err, { taskId: req.params.id }, req);
    next(err);
  }
};

// Get task history
exports.getTaskHistory = async (req, res, next) => {
  const start = Date.now();
  try {
    const { id } = req.params;
    logger.debug('Fetching task history', { taskId: id }, req);
    
    const history = await AuditLog.find({ taskId: id })
      .sort({ timestamp: -1 })
      .limit(100);
    
    const responseTime = Date.now() - start;
    logger.debug(`Task history fetched in ${responseTime}ms`, { 
      taskId: id,
      historyCount: history.length 
    }, req);
    
    res.json({
      success: true,
      data: history
    });
  } catch (err) {
    logger.error('Error fetching task history', err, { taskId: req.params.id }, req);
    next(err);
  }
};