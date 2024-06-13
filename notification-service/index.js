const express = require("express");
const app = express();
const PORT = 5050;
const mongoose = require("mongoose");
const Notification = require("./notification");
const amqp = require("amqplib");

var channel, connection;

mongoose
  .connect("mongodb://127.0.0.1:27017/notification-service", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log(`Notification Service DB connected`);
  });

app.use(express.json());

async function connect() {
  try {
    const amqpServer = "amqp://localhost:5672";
    connection = await amqp.connect(amqpServer);
    channel = await connection.createChannel();
    await channel.assertQueue("NOTIFICATION");
    console.log(`Connected to RabbitMQ`);

    // Consume messages from the TASK queue
    channel.consume("TASK", async (data) => {
      const task = JSON.parse(data.content);
      const newNotification = new Notification({
        user: task.user,
        message: `Task ${task.title} is not completed yet.`,
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
  const notifications = await Notification.find();
  return res.json(notifications);
});

app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
});
