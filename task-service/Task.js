const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TaskSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: "pending",
    enum: ["pending", "completed"],
  },
  deadline: {
    type: Date,
    required: true,
  },
  user: String,
  created_at: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = Task = mongoose.model("task", TaskSchema);
