const express = require("express");
const app = express();
const PORT = 5050;
const mongoose = require("mongoose");
const Notification = require("./notification");
const amqp = require("amqplib");

var channel, connection;

// MongoDB connection
mongoose
  .connect("mongodb://127.0.0.1:27017/notification-service", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log(`Notification Service DB connected`);
  })
  .catch((err) => console.error("MongoDB connection error:", err));

app.use(express.json());

// RabbitMQ connection
async function connect() {
  try {
    const amqpServer = "amqp://localhost:5672";
    connection = await amqp.connect(amqpServer);
    channel = await connection.createChannel();
    await channel.assertQueue("NOTIFICATION");
    console.log(`Connected to RabbitMQ`);

    // Consume messages from the NOTIFICATION queue
    channel.consume("NOTIFICATION", async (data) => {
      const notificationData = JSON.parse(data.content.toString());
      const newNotification = new Notification({
        user: notificationData.user,
        message: notificationData.message,
      });
      await newNotification.save();
      channel.ack(data);
    });
  } catch (error) {
    console.error("Error connecting to RabbitMQ", error);
  }
}

connect();

app.get("/notifications", async (req, res) => {
  try {
    const notifications = await Notification.find();
    return res.json(notifications);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error fetching notifications", error });
  }
});

app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
});
