// backend/models/AuditLog.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  taskId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task',
    required: true 
  },
  action: { 
    type: String, 
    enum: ['TASK_CREATED', 'TASK_UPDATED', 'TASK_DELETED', 'TASK_MOVED'],
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  userInfo: {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    email: String
  },
  // For moves
  oldStatus: String,
  newStatus: String,
  oldOrder: Number,
  newOrder: Number,
  // For updates/deletes
  oldData: mongoose.Schema.Types.Mixed,
  newData: mongoose.Schema.Types.Mixed,
  // Additional metadata
  metadata: mongoose.Schema.Types.Mixed,
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
});

// Index for better query performance
auditLogSchema.index({ taskId: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);