const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TaskSchema = new Schema({
  title: String,
  description: String,
  dueDate: Date,
  completed: {
    type: Boolean,
    default: false,
  },
  user: String,
  created_at: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model("Task", TaskSchema);
