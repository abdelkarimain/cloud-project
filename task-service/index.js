const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Task = require("./Task");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
require("dotenv").config();
const amqp = require("amqplib");
const isAuthenticated = require("../isAuthenticated"); // Correctly import the middleware

const PORT = process.env.TASK_PORT || 7071;
let channel, connection;

app.use(express.json());

mongoose.connect(
  process.env.MONGO_URL || "mongodb://localhost:27017/task-service",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
).then(() => {
  console.log(`Task-Service DB Connected`);
}).catch((err) => {
  console.error(`Error connecting to Task-Service DB: ${err.message}`);
});

// RabbitMQ Connection
async function connect() {
  try {
    const amqpServer = process.env.RABBIT_URL || "amqp://localhost:5672";
    connection = await amqp.connect(amqpServer);
    channel = await connection.createChannel();
    await channel.assertQueue("TASK");
  } catch (error) {
    console.error(`Error connecting to RabbitMQ: ${error.message}`);
  }
}
connect();

const taskSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  deadline: Joi.date(),
});

// Create Task
app.post("/task/create", isAuthenticated, async (req, res) => {
  try {
    const { error } = taskSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { title, description, deadline } = req.body;
    const newTask = new Task({
      title,
      description,
      deadline,
      user: req.user.email,
    });

    await newTask.save();
    return res.status(201).json(newTask);
  } catch (error) {
    console.error("Error creating task:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get Tasks
app.get("/task", isAuthenticated, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.email });
    return res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get Single Task
app.get("/task/:id", isAuthenticated, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.email,
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    return res.json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Update Task
app.put("/task/:id", isAuthenticated, async (req, res) => {
  try {
    const { error } = taskSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { title, description, deadline } = req.body;
    const updatedTask = await Task.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.email,
      },
      { title, description, deadline },
      { new: true }
    );
    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }
    return res.json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Delete Task
app.delete("/task/:id", isAuthenticated, async (req, res) => {
  try {
    const deletedTask = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user.email,
    });
    if (!deletedTask) {
      return res.status(404).json({ message: "Task not found" });
    }
    return res.json(deletedTask);
  } catch (error) {
    console.error("Error deleting task:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Task-Service at ${PORT}`);
});