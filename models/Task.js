const mongoose = require('mongoose');

const userInfoSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true }
}, { _id: false });

// Schema for edit history
const editHistorySchema = new mongoose.Schema({
  updatedBy: { type: userInfoSchema, required: true },
  changes: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const taskSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters']
  },
  description: { 
    type: String, 
    trim: true 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'medium' 
  },
  dueDate: { 
    type: Date,
    validate: {
      validator: function(value) {
        if (!value) return true;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return value >= today;
      },
      message: 'Due date cannot be in the past'
    }
  },
  status: { 
    type: String, 
    enum: ['todo', 'inprogress', 'done', 'deployedonprod'], 
    default: 'todo' 
  },
  taskNumber: { 
    type: String,
    unique: true,
    sparse: true
  },
  order: { 
    type: Number, 
    default: 0 
  },
  version: { 
    type: Number, 
    default: 1 
  },
  active_status: {
    type: Number,
    enum: [0, 1],
    default: 1 
  },
  
  createdBy: { type: userInfoSchema, required: true },
  updatedBy: { type: userInfoSchema }, 
  editHistory: [editHistorySchema], 
  assignedTo: [userInfoSchema], 
  comments: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Comment' 
  }]
}, {
  timestamps: true
});

// Indexes
taskSchema.index({ status: 1, order: 1 });
taskSchema.index({ active_status: 1 });
taskSchema.index({ 'assignedTo._id': 1 });

const Task = mongoose.model('Task', taskSchema);
module.exports = Task;