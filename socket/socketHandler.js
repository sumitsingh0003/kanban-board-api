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

module.exports = function(io) {
  // Store active editing sessions
  /** @type {Map<string, {userId: string, userName: string, socketId: string}>} */
  const editingSessions = new Map();

  // Store socket to user mapping
  /** @type {Map<string, string>} */
  const socketToUser = new Map();

  io.on("connection", (socket) => {
    console.log(`🟢 User connected: ${socket.id}`);

    // User identifies themselves after connection
    socket.on("userConnected", (userData) => {
      if (userData?._id) {
        socketToUser.set(socket.id, userData._id);
        socket.join(`user:${userData._id}`);
        console.log(`👤 User ${userData.name} (${userData._id}) mapped to socket ${socket.id}`);
      }
    });

    // When user starts editing a task
    socket.on("taskEditing", (data) => {
      try {
        const { taskId, user } = data || {};
        
        if (!taskId || !user?._id) {
          console.error("Invalid editing data:", data);
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

        console.log(`✏️ User ${user.name} started editing task ${taskId}`);
      } catch (error) {
        console.error("Error in taskEditing:", error);
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

          console.log(`✅ User ${user.name} stopped editing task ${taskId}`);
        }
      } catch (error) {
        console.error("Error in taskEditingStopped:", error);
      }
    });

    // When task is updated
    socket.on("taskUpdated", (data) => {
      try {
        // ✅ FIX: Check if data is task object or has task property
        const task = data?.task || data;
        const updatedBy = data?.updatedBy || data?.user || null;
        
        if (!task?._id) {
          console.error("Invalid task update data:", data);
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

        console.log(`🔄 Task ${task._id} updated by ${updatedBy?.name || 'unknown'}`);
      } catch (error) {
        console.error("Error in taskUpdated:", error);
      }
    });

    // When task is moved
    socket.on("taskMoved", (data) => {
      try {
        const task = data?.task || data;
        const movedBy = data?.movedBy || data?.user || null;

        if (!task?._id) {
          console.error("Invalid task move data:", data);
          return;
        }
        
        io.emit("taskMoved", {
          task,
          movedBy,
          timestamp: new Date().toISOString()
        });

        console.log(`📦 Task ${task._id} moved by ${movedBy?.name || 'unknown'}`);
      } catch (error) {
        console.error("Error in taskMoved:", error);
      }
    });

    // When task is created
    socket.on("taskCreated", (data) => {
      try {
        const task = data?.task || data;
        const createdBy = data?.createdBy || data?.user || null;

        if (!task?._id) {
          console.error("Invalid task create data:", data);
          return;
        }
        
        io.emit("taskAdded", {
          task,
          createdBy,
          timestamp: new Date().toISOString()
        });

        console.log(`✨ Task ${task._id} created by ${createdBy?.name || 'unknown'}`);
      } catch (error) {
        console.error("Error in taskCreated:", error);
      }
    });

    // When task is deleted
    socket.on("taskDeleted", (data) => {
      try {
        const taskId = data?.taskId || data;
        const deletedBy = data?.deletedBy || data?.user || null;

        if (!taskId) {
          console.error("Invalid task delete data:", data);
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

        console.log(`🗑️ Task ${taskId} deleted by ${deletedBy?.name || 'unknown'}`);
      } catch (error) {
        console.error("Error in taskDeleted:", error);
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
              
              console.log(`🔴 User ${session.userName} disconnected, released task ${taskId}`);
            }
          }
        }

        socketToUser.delete(socket.id);
        console.log(`🔴 User disconnected: ${socket.id}`);
      } catch (error) {
        console.error("Error in disconnect:", error);
      }
    });
  });
};