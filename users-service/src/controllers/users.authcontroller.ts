import { Request, Response } from "express";
import { Types } from "mongoose";
import UserModel from "../models/users.model";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import mongoSanitize from "mongo-sanitize";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Sanitize user-controlled strings before logging to prevent log injection
const sanitizeForLog = (value: unknown): string =>
  String(value).replaceAll("\r", " ").replaceAll("\n", " ");

const isLikelyValidEmail = (email: string): boolean => {
  if (
    !email ||
    email.length > 254 ||
    email.includes("\r") ||
    email.includes("\n")
  ) {
    return false;
  }

  const atIndex = email.indexOf("@");
  if (atIndex <= 0 || atIndex !== email.lastIndexOf("@")) return false;

  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex + 1);
  if (!localPart || !domainPart) return false;
  if (domainPart.startsWith(".") || domainPart.endsWith(".")) return false;
  if (!domainPart.includes(".")) return false;
  if (email.includes(" ")) return false;

  return true;
};

const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!isLikelyValidEmail(normalized)) return null;
  return normalized;
};

const sanitizeEmailValue = (email: string): string | null => {
  const sanitizedValue = mongoSanitize(email);
  if (typeof sanitizedValue !== "string") {
    return null;
  }

  return sanitizedValue === email ? sanitizedValue : null;
};

const findUserByEmail = async (email: string) => {
  const safeEmail = sanitizeEmailValue(email);
  if (!safeEmail) {
    return null;
  }

  return UserModel.findOne().where("email").equals(safeEmail);
};

const findExistingUserIdByEmail = async (email: string) => {
  const safeEmail = sanitizeEmailValue(email);
  if (!safeEmail) {
    return null;
  }

  return UserModel.findOne()
    .where("email")
    .equals(safeEmail)
    .select("_id")
    .lean();
};

const ensureValidObjectId = (id: string, res: Response): boolean => {
  if (!Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: "Invalid user ID" });
    return false;
  }
  return true;
};

// REGISTER
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, phone, address } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (
      typeof name !== "string" ||
      typeof password !== "string" ||
      !normalizedEmail
    ) {
      return res.status(400).json({ message: "Invalid registration input" });
    }

    console.log("Register request received:", {
      name: sanitizeForLog(name),
      email: sanitizeForLog(normalizedEmail),
      role: sanitizeForLog(role),
    });

    const existingUser = await findExistingUserIdByEmail(normalizedEmail);
    if (existingUser === null) {
      return res.status(400).json({ message: "Invalid registration input" });
    }

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const newUser = new UserModel({
      name,
      email: normalizedEmail,
      password,
      role,
      phone,
      address,
    });

    await newUser.save();
    console.log("New user registered with ID:", newUser._id.toString());
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Registration failed", error: err });
  }
};

// LOGIN
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || typeof password !== "string") {
      return res.status(400).json({ message: "Invalid credentials format" });
    }

    const user = await findUserByEmail(normalizedEmail);
    if (user === null) {
      return res.status(400).json({ message: "Invalid credentials format" });
    }

    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id.toString(), role: user.role },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    console.log("User logged in with ID:", user._id.toString()); // Debug: Track login

    const response = {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
      },
    };

    console.log("User response:", {
      id: response.user.id,
      name: sanitizeForLog(response.user.name),
      email: sanitizeForLog(response.user.email),
      role: sanitizeForLog(response.user.role),
    });
    res.json(response);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login failed", error: err });
  }
};

// GET ALL USERS – Admin Only
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await UserModel.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users", error: err });
  }
};

// GET CURRENT USER /me
export const getMyProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const user = await UserModel.findById(userId).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("Get /me error:", err);
    res.status(500).json({ message: "Failed to fetch user", error: err });
  }
};

// UPDATE USER BY ID – Admin Only
export const updateUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!ensureValidObjectId(id, res)) return;

    // Whitelist updatable fields to prevent operator injection via req.body
    const { name, email, role, phone, address, isApproved } = req.body;
    const allowedUpdate: Record<string, unknown> = {};
    if (name !== undefined) allowedUpdate.name = String(name);
    if (email !== undefined) allowedUpdate.email = String(email);
    if (role !== undefined) allowedUpdate.role = String(role);
    if (phone !== undefined) allowedUpdate.phone = String(phone);
    if (address !== undefined) allowedUpdate.address = address;
    if (isApproved !== undefined)
      allowedUpdate.isApproved = Boolean(isApproved);

    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { $set: allowedUpdate },
      { new: true },
    ).select("-password");

    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    res.json({ message: "User updated successfully", user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: "Failed to update user", error: err });
  }
};

// DELETE USER BY ID – Admin Only
export const deleteUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!ensureValidObjectId(id, res)) return;

    const deletedUser = await UserModel.findByIdAndDelete(id);
    if (!deletedUser)
      return res.status(404).json({ message: "User not found" });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete user", error: err });
  }
};

// Fetch user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    if (!ensureValidObjectId(userId, res)) return;

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ message: "Error fetching user data" });
  }
};
