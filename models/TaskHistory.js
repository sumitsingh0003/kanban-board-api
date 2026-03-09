const TaskHistory = new mongoose.Schema({

  taskId: mongoose.Schema.Types.ObjectId,

  user: String,

  action: String,

  oldStatus: String,

  newStatus: String

}, { timestamps: true });

export default mongoose.model("TaskHistory", TaskHistory);