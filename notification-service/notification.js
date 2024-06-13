const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
  user: String,
  message: String,
  created_at: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model("Notification", NotificationSchema);
