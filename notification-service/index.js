const express = require("express");
const app = express();
const mongoose = require("mongoose");
const amqp = require("amqplib");
const cron = require("node-cron");
require("dotenv").config();

let fetch;
(async () => {
  fetch = (await import("node-fetch")).default;
})();

const PORT = process.env.NOTIFICATION_PORT || 7072;
let channel, connection;

// Notification Schema
const notificationSchema = new mongoose.Schema(
  {
    user: String,
    message: String,
    status: { type: String, default: "unread" },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);

// MongoDB Connection
mongoose
  .connect(
    process.env.MONGO_URL || "mongodb://localhost:27017/notification-service",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log(`Notification-Service DB Connected`);
  })
  .catch((err) => {
    console.error(
      `Error connecting to Notification-Service DB: ${err.message}`
    );
  });

// RabbitMQ Connection
async function connect() {
  try {
    const amqpServer = process.env.RABBIT_URL || "amqp://localhost:5672";
    connection = await amqp.connect(amqpServer);
    channel = await connection.createChannel();
    await channel.assertQueue("NOTIFICATION");

    channel.consume("NOTIFICATION", async (msg) => {
      const { user, message } = JSON.parse(msg.content.toString());
      const newNotification = new Notification({ user, message });
      await newNotification.save();
      console.log("Notification saved:", newNotification);
      channel.ack(msg);
    });
  } catch (error) {
    console.error(`Error connecting to RabbitMQ: ${error.message}`);
  }
}

connect();

app.use(express.json());

// Get Notifications
app.get("/notifications", async (req, res) => {
  try {
    const notifications = await Notification.find();
    return res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Mark Notification as Read
app.put("/notifications/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { status: "read" },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    return res.json(notification);
  } catch (error) {
    console.error("Error updating notification:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Schedule a job to check for tasks nearing deadline
cron.schedule("*/5 * * * *", async () => {
  // Run every 5 minutes for testing
  try {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now

    console.log("Checking for tasks nearing deadline...");

    // Fetch tasks nearing deadline
    const response = await fetch(
      `http://localhost:${process.env.TASK_SERVICE_PORT || 7071}/task`,
      {
        headers: {
          Authorization: `Bearer <your_jwt_token>`, // Replace with your actual JWT token
        },
      }
    );
    const tasks = await response.json();

    console.log("Fetched tasks:", tasks);

    const tasksNearingDeadline = tasks.filter((task) => {
      const deadline = new Date(task.deadline);
      return deadline > now && deadline <= soon;
    });

    console.log("Tasks nearing deadline:", tasksNearingDeadline);

    // Send notifications
    for (const task of tasksNearingDeadline) {
      const notificationMessage = {
        user: task.user,
        message: `Task "${task.title}" is nearing its deadline.`,
      };
      channel.sendToQueue(
        "NOTIFICATION",
        Buffer.from(JSON.stringify(notificationMessage))
      );
      console.log("Sent notification for task:", task);
    }
  } catch (error) {
    console.error("Error checking tasks nearing deadline:", error);
  }
});

// Manually trigger the cron job for testing
app.get("/trigger-cron", async (req, res) => {
  try {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now

    console.log("Manually triggering cron job...");

    // Fetch tasks nearing deadline
    const response = await fetch(
      `http://localhost:${process.env.TASK_SERVICE_PORT || 7071}/task`,
      {
        headers: {
          Authorization: `Bearer <your_jwt_token>`, // Replace with your actual JWT token
        },
      }
    );
    const tasks = await response.json();

    console.log("Fetched tasks:", tasks);

    const tasksNearingDeadline = tasks.filter((task) => {
      const deadline = new Date(task.deadline);
      return deadline > now && deadline <= soon;
    });

    console.log("Tasks nearing deadline:", tasksNearingDeadline);

    // Send notifications
    for (const task of tasksNearingDeadline) {
      const notificationMessage = {
        user: task.user,
        message: `Task "${task.title}" is nearing its deadline.`,
      };
      channel.sendToQueue(
        "NOTIFICATION",
        Buffer.from(JSON.stringify(notificationMessage))
      );
      console.log("Sent notification for task:", task);
    }

    res.json({ message: "Cron job triggered manually" });
  } catch (error) {
    console.error("Error manually triggering cron job:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Notification-Service at ${PORT}`);
});
