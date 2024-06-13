const express = require("express");
const app = express();
const PORT = 6060;
const mongoose = require("mongoose");
const Task = require("./task");
const amqp = require("amqplib");
const isAuthenticated = require("../isAuthenticated");
var channel, connection;

// MongoDB connection
mongoose
  .connect("mongodb://127.0.0.1:27017/task-service", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log(`Task Service DB connected`);
  });

// Middleware to parse JSON
app.use(express.json());

// RabbitMQ connection
async function connect() {
  const amqpServer = "amqp://localhost:5672";
  connection = await amqp.connect(amqpServer);
  channel = await connection.createChannel();
  await channel.assertQueue("TASK");
  console.log(`Connected to RabbitMQ`);
}
connect();

// Routes
// Create a task
app.post("/task/create", isAuthenticated, async (req, res) => {
  try {
    const { title, description, dueDate } = req.body;
    const newTask = new Task({
      title,
      description,
      dueDate,
      user: req.user.email,
    });
    await newTask.save();
    return res.json(newTask);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Complete a task
// Complete a task
app.post("/task/complete", isAuthenticated, async (req, res) => {
  try {
    const { taskId } = req.body;
    const task = await Task.findById(taskId);
    if (task) {
      task.completed = true;
      await task.save();

      // Publish message to RabbitMQ
      channel.sendToQueue(
        "TASK",
        Buffer.from(
          JSON.stringify({
            taskId: task._id,
            title: task.title,
            user: task.user,
            completed: task.completed,
          })
        )
      );

      return res.json(task);
    } else {
      return res.status(404).json({ message: "Task not found" });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Update a task
app.put("/task/update/:taskId", isAuthenticated, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, dueDate, completed } = req.body;
    const task = await Task.findById(taskId);
    if (task) {
      task.title = title || task.title;
      task.description = description || task.description;
      task.dueDate = dueDate || task.dueDate;
      task.completed = completed !== undefined ? completed : task.completed;
      await task.save();
      return res.json(task);
    } else {
      return res.status(404).json({ message: "Task not found" });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get all tasks
app.get("/task/getAll", isAuthenticated, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.email });
    return res.json(tasks);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get a task by ID
app.get("/task/get/:taskId", isAuthenticated, async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId);
    if (task) {
      return res.json(task);
    } else {
      return res.status(404).json({ message: "Task not found" });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete a task
app.delete("/task/delete/:taskId", isAuthenticated, async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findByIdAndDelete(taskId);
    if (task) {
      return res.json({ message: "Task deleted successfully" });
    } else {
      return res.status(404).json({ message: "Task not found" });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Task Service running on port ${PORT}`);
});
