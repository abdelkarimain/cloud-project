const express = require("express");
const app = express();
const PORT = 6060;
const mongoose = require("mongoose");
const Task = require("./task");
const amqp = require("amqplib");
const isAuthenticated = require("../isAuthenticated");

var channel, connection;

mongoose
  .connect("mongodb://127.0.0.1:27017/task-service", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log(`Task Service DB connected`);
  });

app.use(express.json());

async function connect() {
  const amqpServer = "amqp://localhost:5672";
  connection = await amqp.connect(amqpServer);
  channel = await connection.createChannel();
  await channel.assertQueue("TASK");
  console.log(`Connected to RabbitMQ`);
}
connect();

app.post("/task/create", isAuthenticated, async (req, res) => {
  const { title, description, dueDate } = req.body;
  const newTask = new Task({
    title,
    description,
    dueDate,
    user: req.user.email,
  });
  newTask.save();
  return res.json(newTask);
});

app.post("/task/complete", isAuthenticated, async (req, res) => {
  const { taskId } = req.body;
  const task = await Task.findById(taskId);
  if (task) {
    task.completed = true;
    await task.save();
    return res.json(task);
  } else {
    return res.json({ message: "Task not found" });
  }
});

app.listen(PORT, () => {
  console.log(`Task Service running on port ${PORT}`);
});
