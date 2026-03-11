const { logger } = require('../utils/logger');

module.exports = function(io) {
  // Store active editing sessions
  const editingSessions = new Map();
  const socketToUser = new Map();

  io.on("connection", (socket) => {
    logger.socket('connection', { socketId: socket.id });

    // User identifies themselves after connection
    socket.on("userConnected", (userData) => {
      if (userData?._id) {
        socketToUser.set(socket.id, userData._id);
        socket.join(`user:${userData._id}`);
        logger.socket('userConnected', { 
          socketId: socket.id,
          userId: userData._id,
          userName: userData.name 
        });
      }
    });

    // When user starts editing a task
    socket.on("taskEditing", (data) => {
      try {
        const { taskId, user } = data || {};
        
        if (!taskId || !user?._id) {
          logger.socket('taskEditing - invalid data', { data, socketId: socket.id });
          return;
        }

        // Check if someone else is already editing
        if (editingSessions.has(taskId)) {
          const currentEditor = editingSessions.get(taskId);
          if (currentEditor.userId !== user._id) {
            socket.emit("taskEditBlocked", {
              taskId,
              message: `Task is being edited by ${currentEditor.userName}`,
              editor: currentEditor
            });
            logger.socket('taskEditBlocked', { 
              taskId, 
              userId: user._id,
              blockedBy: currentEditor.userId 
            });
            return;
          }
        }

        // Store editing session
        editingSessions.set(taskId, {
          userId: user._id,
          userName: user.name,
          socketId: socket.id
        });

        // Broadcast to ALL OTHER users
        socket.broadcast.emit("taskEditingStarted", {
          taskId,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email
          },
          timestamp: new Date().toISOString()
        });

        logger.socket('taskEditingStarted', { 
          taskId, 
          userId: user._id,
          userName: user.name 
        });
      } catch (error) {
        logger.socket('taskEditing error', { error: error.message, socketId: socket.id });
      }
    });

    // When user stops editing
    socket.on("taskEditingStopped", (data) => {
      try {
        const { taskId, user } = data || {};
        
        if (!taskId || !user?._id) return;

        const session = editingSessions.get(taskId);
        if (session?.userId === user._id) {
          editingSessions.delete(taskId);

          io.emit("taskEditingStopped", {
            taskId,
            user: {
              _id: user._id,
              name: user.name
            },
            timestamp: new Date().toISOString()
          });

          logger.socket('taskEditingStopped', { 
            taskId, 
            userId: user._id,
            userName: user.name 
          });
        }
      } catch (error) {
        logger.socket('taskEditingStopped error', { error: error.message, socketId: socket.id });
      }
    });

    // When task is updated
    socket.on("taskUpdated", (data) => {
      try {
        const task = data?.task || data;
        const updatedBy = data?.updatedBy || data?.user || null;
        
        if (!task?._id) {
          logger.socket('taskUpdated - invalid data', { data, socketId: socket.id });
          return;
        }

        // Remove editing session
        if (editingSessions.has(task._id)) {
          editingSessions.delete(task._id);
        }

        // Broadcast updated task to ALL users
        io.emit("taskUpdated", {
          task,
          updatedBy,
          timestamp: new Date().toISOString()
        });

        logger.socket('taskUpdated', { 
          taskId: task._id,
          updatedBy: updatedBy?.email 
        });
      } catch (error) {
        logger.socket('taskUpdated error', { error: error.message, socketId: socket.id });
      }
    });

    // When task is moved
    socket.on("taskMoved", (data) => {
      try {
        const task = data?.task || data;
        const movedBy = data?.movedBy || data?.user || null;

        if (!task?._id) {
          logger.socket('taskMoved - invalid data', { data, socketId: socket.id });
          return;
        }
        
        io.emit("taskMoved", {
          task,
          movedBy,
          timestamp: new Date().toISOString()
        });

        logger.socket('taskMoved', { 
          taskId: task._id,
          movedBy: movedBy?.email 
        });
      } catch (error) {
        logger.socket('taskMoved error', { error: error.message, socketId: socket.id });
      }
    });

    // When task is created
    socket.on("taskCreated", (data) => {
      try {
        const task = data?.task || data;
        const createdBy = data?.createdBy || data?.user || null;

        if (!task?._id) {
          logger.socket('taskCreated - invalid data', { data, socketId: socket.id });
          return;
        }
        
        io.emit("taskAdded", {
          task,
          createdBy,
          timestamp: new Date().toISOString()
        });

        logger.socket('taskCreated', { 
          taskId: task._id,
          createdBy: createdBy?.email 
        });
      } catch (error) {
        logger.socket('taskCreated error', { error: error.message, socketId: socket.id });
      }
    });

    // When task is deleted
    socket.on("taskDeleted", (data) => {
      try {
        const taskId = data?.taskId || data;
        const deletedBy = data?.deletedBy || data?.user || null;

        if (!taskId) {
          logger.socket('taskDeleted - invalid data', { data, socketId: socket.id });
          return;
        }
        
        if (editingSessions.has(taskId)) {
          editingSessions.delete(taskId);
        }

        io.emit("taskDeleted", {
          taskId,
          deletedBy,
          timestamp: new Date().toISOString()
        });

        logger.socket('taskDeleted', { 
          taskId,
          deletedBy: deletedBy?.email 
        });
      } catch (error) {
        logger.socket('taskDeleted error', { error: error.message, socketId: socket.id });
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      try {
        const userId = socketToUser.get(socket.id);
        
        if (userId) {
          // Release all tasks edited by this user
          for (const [taskId, session] of editingSessions.entries()) {
            if (session.socketId === socket.id || session.userId === userId) {
              editingSessions.delete(taskId);
              
              io.emit("taskEditingStopped", {
                taskId,
                user: { _id: session.userId, name: session.userName },
                reason: "disconnect",
                timestamp: new Date().toISOString()
              });
              
              logger.socket('taskEditingStopped - disconnect', { 
                taskId, 
                userId: session.userId,
                userName: session.userName 
              });
            }
          }
        }

        socketToUser.delete(socket.id);
        logger.socket('disconnect', { socketId: socket.id });
      } catch (error) {
        logger.socket('disconnect error', { error: error.message, socketId: socket.id });
      }
    });
  });
};