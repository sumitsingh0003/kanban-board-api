// backend/models/AuditLog.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  taskId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task',
    required: true,
    index: true
  },
  action: { 
    type: String, 
    enum: [
      'TASK_CREATED', 
      'TASK_UPDATED', 
      'TASK_DELETED', 
      'TASK_MOVED',
      'TASK_VIEWED',
      'TASK_EDITED_START',
      'TASK_EDITED_STOP'
    ],
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    index: true
  },
  userInfo: {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    email: String
  },
  oldData: mongoose.Schema.Types.Mixed,
  newData: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
auditLogSchema.index({ taskId: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);