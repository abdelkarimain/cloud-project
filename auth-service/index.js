const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./User");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const bcrypt = require("bcryptjs");

const PORT = process.env.AUTH_PORT || 7070;

// MongoDB Connection
mongoose.connect(
  process.env.MONGO_URL || "mongodb://localhost:27017/auth-service",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  (err) => {
    if (err) {
      console.error("Database connection error:", err);
    } else {
      console.log(`Auth-Service DB Connected`);
    }
  }
);

app.use(express.json());

// Validation Schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const registerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

// Login Route
app.post("/auth/login", async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User doesn't exist" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Password Incorrect" });
    }

    const payload = {
      email,
      name: user.name,
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1h" },
      (err, token) => {
        if (err) {
          console.error("Error generating token:", err);
          return res.status(500).json({ message: "Internal Server Error" });
        } else {
          return res.json({ token });
        }
      }
    );
  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Register Route
app.post("/auth/register", async (req, res) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password, name } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    } else {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({
        email,
        name,
        password: hashedPassword,
      });
      await newUser.save();
      return res.status(201).json(newUser);
    }
  } catch (error) {
    console.error("Error registering user:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Auth-Service at ${PORT}`);
});