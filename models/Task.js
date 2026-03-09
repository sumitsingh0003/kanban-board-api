// backend/models/Task.js
const mongoose = require('mongoose');

const userInfoSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true }
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
    // Remove index: true from here
  },
  order: { 
    type: Number, 
    default: 0 
  },
  version: { 
    type: Number, 
    default: 1 
  },
  // User info
  createdBy: userInfoSchema,
  updatedBy: userInfoSchema,
  assignedTo: [userInfoSchema],
  comments: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Comment' 
  }]
}, {
  timestamps: true
});

// Define indexes here instead of in schema
taskSchema.index({ status: 1, order: 1 });
// Remove duplicate taskNumber index from here if you already have unique: true in schema

const Task = mongoose.model('Task', taskSchema);
module.exports = Task;