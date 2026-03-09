const taskService = require("../services/taskService");

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
    res.json(task);
  } catch (err) {
    next(err);
  }
};

exports.moveTask = async (req, res, next) => {
  try {
    const { status, order, user  } = req.body;
    const task = await taskService.moveTask(
      req.params.id,
      status,
      order, user
    );
    res.json(task);
  } catch (err) {
    next(err);
  }
};

// Delete task
exports.deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deletedBy } = req.body;
    
    // Use taskService to find and delete
   const task = await taskService.findTaskById(id);
    
    if (!task) {
      return res.status(404).json({ 
        success: false,
        msg: 'Task not found' 
      });
    }

    await taskService.deleteTask(id, { deletedBy });
    
    res.json({ 
      success: true,
      msg: 'Task deleted successfully' 
    });
  } catch (err) {
    next(err);
  }
};

// Get latest task number
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

// Update task
exports.updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const task = await taskService.updateTask(id, updateData);
    
    if (!task) {
      return res.status(404).json({ 
        success: false,
        msg: 'Task not found' 
      });
    }
    
    res.json({ 
      success: true,
      data: task,
      msg: 'Task updated successfully' 
    });
  } catch (err) {
    next(err);
  }
};