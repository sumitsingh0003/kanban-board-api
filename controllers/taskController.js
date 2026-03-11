// backend/controllers/taskController.js
const taskService = require("../services/taskService");
const AuditLog = require("../models/AuditLog");

exports.getTasks = async (req, res, next) => {
  try {
    const tasks = await taskService.getAllTasks();
    res.json(tasks);
  } catch (err) {
    next(err);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const task = await taskService.createTask(req.body);
    
    // Create audit log
    await AuditLog.create({
      taskId: task._id,
      action: "TASK_CREATED",
      userId: req.body.createdBy?._id,
      userInfo: req.body.createdBy,
      newData: task,
      metadata: {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json(task);
  } catch (err) {
    next(err);
  }
};

exports.moveTask = async (req, res, next) => {
  try {
    const { status, order, user } = req.body;
    const task = await taskService.moveTask(req.params.id, status, order, user);
    
    // Create audit log for move
    await AuditLog.create({
      taskId: task._id,
      action: "TASK_MOVED",
      userId: user?._id,
      userInfo: user,
      oldData: { status: task.status, order: task.order },
      newData: { status, order },
      metadata: {
        fromStatus: task.status,
        toStatus: status,
        fromOrder: task.order,
        toOrder: order,
        timestamp: new Date().toISOString()
      }
    });

    res.json(task);
  } catch (err) {
    next(err);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deletedBy } = req.body;
    
    const task = await taskService.findTaskById(id);
    
    if (!task) {
      return res.status(404).json({ 
        success: false,
        msg: 'Task not found' 
      });
    }

    // Create audit log before deletion
    await AuditLog.create({
      taskId: task._id,
      action: "TASK_DELETED",
      userId: deletedBy?._id,
      userInfo: deletedBy,
      oldData: task,
      metadata: {
        timestamp: new Date().toISOString(),
        deletedBy: deletedBy?.name
      }
    });

    await taskService.deleteTask(id, { deletedBy });
    
    res.json({ 
      success: true,
      msg: 'Task deleted successfully' 
    });
  } catch (err) {
    next(err);
  }
};

exports.getLatestTaskNumber = async (req, res, next) => {
  try {
    const latestNumber = await taskService.getLatestTaskNumber();
    res.json({ 
      success: true,
      latestNumber 
    });
  } catch (err) {
    next(err);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const oldTask = await taskService.findTaskById(id);
    const task = await taskService.updateTask(id, updateData);
    
    if (!task) {
      return res.status(404).json({ 
        success: false,
        msg: 'Task not found' 
      });
    }

    // Create audit log for update
    await AuditLog.create({
      taskId: task._id,
      action: "TASK_UPDATED",
      userId: updateData.updatedBy?._id,
      userInfo: updateData.updatedBy,
      oldData: oldTask,
      newData: task,
      metadata: {
        timestamp: new Date().toISOString(),
        changes: Object.keys(updateData).filter(k => 
          oldTask[k]?.toString() !== updateData[k]?.toString()
        )
      }
    });
    
    res.json({ 
      success: true,
      data: task,
      msg: 'Task updated successfully' 
    });
  } catch (err) {
    next(err);
  }
};

// Get task history
exports.getTaskHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const history = await AuditLog.find({ taskId: id })
      .sort({ timestamp: -1 })
      .limit(50);
    
    res.json({
      success: true,
      data: history
    });
  } catch (err) {
    next(err);
  }
};