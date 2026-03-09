// backend/socket/socketHandler.js
/**
 * @typedef {Object} User
 * @property {string} _id
 * @property {string} name
 * @property {string} email
 */

/**
 * @typedef {Object} TaskEditingData
 * @property {string} taskId
 * @property {User} user
 */

/**
 * @typedef {Object} TaskEditStoppedData
 * @property {string} taskId
 * @property {User} user
 */

/**
 * @typedef {Object} TaskMovedData
 * @property {Object} task
 * @property {User} movedBy
 */

/**
 * @typedef {Object} TaskDeletedData
 * @property {string} taskId
 * @property {User} deletedBy
 */

module.exports = function(io) {
  // Store active editing sessions
  /** @type {Map<string, string>} */
  const editingSessions = new Map(); // taskId -> userId

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // When user starts editing a task
    socket.on("taskEditing", (/** @type {TaskEditingData} */ data) => {
      const { taskId, user } = data;
      
      // Check if someone else is already editing
      if (editingSessions.has(taskId) && editingSessions.get(taskId) !== user._id) {
        // Notify the user that task is being edited by someone else
        socket.emit("taskEditBlocked", {
          taskId,
          message: `Task is being edited by another user`
        });
        return;
      }

      // Store editing session
      editingSessions.set(taskId, user._id);
      
      // Broadcast to all other users that this task is being edited
      socket.broadcast.emit("taskEditingStarted", {
        taskId,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email
        }
      });

      console.log(`User ${user.name} started editing task ${taskId}`);
    });

    // When user stops editing (closes modal)
    socket.on("taskEditingStopped", (/** @type {TaskEditingData} */ data) => {
      const { taskId, user } = data;
      
      // Remove editing session
      if (editingSessions.get(taskId) === user._id) {
        editingSessions.delete(taskId);
      }
      
      // Broadcast to all users that editing has stopped
      socket.broadcast.emit("taskEditingStopped", {
        taskId,
        user: {
          _id: user._id,
          name: user.name
        }
      });

      console.log(`User ${user.name} stopped editing task ${taskId}`);
    });

    // When task is updated
    socket.on("taskUpdated", (/** @type {Task} */ task) => {
      // Remove editing session
      if (editingSessions.has(task._id)) {
        editingSessions.delete(task._id);
      }
      
      // Broadcast updated task to all users
      socket.broadcast.emit("taskUpdated", task);
    });

    // When task is moved
    socket.on("taskMoved", (/** @type {TaskMovedData} */ data) => {
      socket.broadcast.emit("taskMoved", data.task);
    });

    // When task is created
    socket.on("taskCreated", (/** @type {Task} */ task) => {
      socket.broadcast.emit("taskAdded", task);
    });

    // When task is deleted
    socket.on("taskDeleted", (/** @type {TaskDeletedData} */ data) => {
      const { taskId, deletedBy } = data;
      
      // Remove editing session if exists
      if (editingSessions.has(taskId)) {
        editingSessions.delete(taskId);
      }
      
      socket.broadcast.emit("taskDeleted", taskId);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      
      // Note: In a production app, you'd want to track socket-user mapping
      // to remove editing sessions on disconnect
    });
  });
};