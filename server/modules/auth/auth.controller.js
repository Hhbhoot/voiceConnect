import jwt from "jsonwebtoken";
import User from "../user/user.model.js";
import { loginSchema, registerSchema } from "./auth.schema.js";

export const login = async (req, res) => {
  try {
    const safeUser = loginSchema.parse(req.body);
    const { email, password } = safeUser;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user by username
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Set user as online
    await user.setOnline();

    console.log(`✅ User logged in: ${email} (${user._id})`);

    const generateJWT = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      user: user.toPublicJSON(),
      token: generateJWT,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

export const register = async (req, res) => {
  try {
    const safeUser = registerSchema.parse(req.body);

    const { username, password, gender, email } = safeUser;

    if (!username || !password || !gender || !email) {
      return res
        .status(400)
        .json({ error: "Username, password, gender, and email are required" });
    }

    if (username.length < 3) {
      return res
        .status(400)
        .json({ error: "Username must be at least 3 characters long" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Create new user
    const user = new User({
      username: username.trim(),
      password,
      gender,
      email,
    });

    await user.save();

    // Set user as online
    await user.setOnline();

    console.log(`✅ New user registered: ${email} (${user._id})`);

    const generateJWT = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(201).json({
      user: user.toPublicJSON(),
      token: generateJWT,
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Registration failed" });
  }
};
