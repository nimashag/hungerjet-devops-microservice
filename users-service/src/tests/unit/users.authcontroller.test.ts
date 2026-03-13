// ─── Module mocks (must be before any imports) ───────────────────────────────
jest.mock("dotenv", () => ({ config: jest.fn() }));

jest.mock("mongoose", () => ({
  Types: {
    ObjectId: {
      isValid: jest.fn(),
    },
  },
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("mocked-jwt-token"),
}));

jest.mock("../../models/users.model", () => {
  const MockUserModel: any = jest.fn().mockImplementation((data: any) => ({
    ...data,
    _id: { toString: () => "mocked-user-id" },
    save: jest.fn().mockResolvedValue(undefined),
  }));
  MockUserModel.findOne = jest.fn();
  MockUserModel.find = jest.fn();
  MockUserModel.findById = jest.fn();
  MockUserModel.findByIdAndUpdate = jest.fn();
  MockUserModel.findByIdAndDelete = jest.fn();
  return { __esModule: true, default: MockUserModel };
});

// ─── Imports (after mocks) ───────────────────────────────────────────────────
import { Request, Response } from "express";
import { Types } from "mongoose";
import UserModel from "../../models/users.model";
import {
  registerUser,
  loginUser,
  getAllUsers,
  getMyProfile,
  updateUserById,
  deleteUserById,
  getUserById,
} from "../../controllers/users.authcontroller";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const mockRes = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockReq = (overrides: Partial<Request> = {}): Request =>
  ({ body: {}, params: {}, ...overrides }) as unknown as Request;

beforeEach(() => jest.clearAllMocks());

const validCredential = "alpha-credential-123";
const alternateCredential = "beta-credential-456";
const mismatchedCredential = "gamma-credential-789";

const mockFindOneResult = (value: unknown) => {
  const where = jest.fn().mockReturnThis();
  const equals = jest.fn().mockResolvedValueOnce(value);
  (UserModel.findOne as jest.Mock).mockReturnValueOnce({ where, equals });
};

const mockFindOneError = (error: Error) => {
  const where = jest.fn().mockReturnThis();
  const equals = jest.fn().mockRejectedValueOnce(error);
  (UserModel.findOne as jest.Mock).mockReturnValueOnce({ where, equals });
};

// ─── registerUser ─────────────────────────────────────────────────────────────
describe("registerUser", () => {
  const validBody = {
    name: "Alice",
    email: "alice@example.com",
    password: validCredential,
    role: "customer",
    phone: "0771234567",
    address: "1 Main St",
  };

  it("returns 400 when name is not a string", async () => {
    const req = mockReq({ body: { ...validBody, name: 123 } });
    const res = mockRes();
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid registration input",
    });
  });

  it("returns 400 when email is not a string (NoSQL injection attempt)", async () => {
    const req = mockReq({ body: { ...validBody, email: { $gt: "" } } });
    const res = mockRes();
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when password is not a string", async () => {
    const req = mockReq({ body: { ...validBody, password: null } });
    const res = mockRes();
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 409 when user already exists", async () => {
    mockFindOneResult({
      _id: "existing-id",
    });
    const req = mockReq({ body: validBody });
    const res = mockRes();
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "User already exists" });
  });

  it("returns 201 on successful registration", async () => {
    mockFindOneResult(null);
    const req = mockReq({ body: validBody });
    const res = mockRes();
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "User registered successfully",
    });
  });

  it("returns 500 when a database error occurs", async () => {
    mockFindOneError(new Error("db error"));
    const req = mockReq({ body: validBody });
    const res = mockRes();
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── loginUser ────────────────────────────────────────────────────────────────
describe("loginUser", () => {
  it("returns 400 when email is not a string", async () => {
    const req = mockReq({
      body: { email: { $ne: null }, password: validCredential },
    });
    const res = mockRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid credentials format",
    });
  });

  it("returns 400 when password is not a string", async () => {
    const req = mockReq({ body: { email: "test@test.com", password: 123 } });
    const res = mockRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 when user is not found", async () => {
    mockFindOneResult(null);
    const req = mockReq({
      body: { email: "nobody@test.com", password: validCredential },
    });
    const res = mockRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 401 when password does not match", async () => {
    const mockUser = {
      comparePassword: jest.fn().mockResolvedValueOnce(false),
    };
    mockFindOneResult(mockUser);
    const req = mockReq({
      body: { email: "user@test.com", password: mismatchedCredential },
    });
    const res = mockRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns token on successful login", async () => {
    const mockUser = {
      _id: { toString: () => "uid123" },
      role: "customer",
      name: "Bob",
      email: "bob@test.com",
      isApproved: true,
      comparePassword: jest.fn().mockResolvedValueOnce(true),
    };
    mockFindOneResult(mockUser);
    const req = mockReq({
      body: { email: "bob@test.com", password: alternateCredential },
    });
    const res = mockRes();
    await loginUser(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ token: "mocked-jwt-token" }),
    );
  });

  it("returns 500 on unexpected error", async () => {
    mockFindOneError(new Error("db error"));
    const req = mockReq({
      body: { email: "a@b.com", password: validCredential },
    });
    const res = mockRes();
    await loginUser(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── getAllUsers ───────────────────────────────────────────────────────────────
describe("getAllUsers", () => {
  it("returns all users without passwords", async () => {
    const users = [{ _id: "1", name: "Alice" }];
    (UserModel.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValueOnce(users),
    });
    const req = mockReq();
    const res = mockRes();
    await getAllUsers(req, res);
    expect(res.json).toHaveBeenCalledWith(users);
  });

  it("returns 500 on error", async () => {
    (UserModel.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockRejectedValueOnce(new Error("fail")),
    });
    const req = mockReq();
    const res = mockRes();
    await getAllUsers(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── getMyProfile ─────────────────────────────────────────────────────────────
describe("getMyProfile", () => {
  it("returns 404 when user is not found", async () => {
    (UserModel.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValueOnce(null),
    });
    const req = { user: { id: "uid" } } as any;
    const res = mockRes();
    await getMyProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns user profile without password", async () => {
    const user = { _id: "uid", name: "Alice", email: "a@b.com" };
    (UserModel.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValueOnce(user),
    });
    const req = { user: { id: "uid" } } as any;
    const res = mockRes();
    await getMyProfile(req, res);
    expect(res.json).toHaveBeenCalledWith(user);
  });
});

// ─── updateUserById ───────────────────────────────────────────────────────────
describe("updateUserById", () => {
  it("returns 400 for an invalid ObjectId", async () => {
    (Types.ObjectId.isValid as jest.Mock).mockReturnValueOnce(false);
    const req = mockReq({ params: { id: "not-valid-id" } });
    const res = mockRes();
    await updateUserById(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid user ID" });
  });

  it("returns 404 when user is not found after update", async () => {
    (Types.ObjectId.isValid as jest.Mock).mockReturnValueOnce(true);
    (UserModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValueOnce(null),
    });
    const req = mockReq({
      params: { id: "507f1f77bcf86cd799439011" },
      body: { name: "New Name" },
    });
    const res = mockRes();
    await updateUserById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("only passes whitelisted fields to the MongoDB update", async () => {
    (Types.ObjectId.isValid as jest.Mock).mockReturnValueOnce(true);
    const updatedUser = { _id: "uid", name: "Updated" };
    const selectMock = jest.fn().mockResolvedValueOnce(updatedUser);
    (UserModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
      select: selectMock,
    });
    const req = mockReq({
      params: { id: "507f1f77bcf86cd799439011" },
      body: { name: "Updated", __proto__: "injected", $where: "1==1" },
    });
    const res = mockRes();
    await updateUserById(req, res);
    const updateDoc = (UserModel.findByIdAndUpdate as jest.Mock).mock
      .calls[0][1];
    expect(updateDoc.$set).not.toHaveProperty("$where");
    expect(updateDoc.$set.name).toBe("Updated");
  });

  it("returns 200 with the updated user", async () => {
    (Types.ObjectId.isValid as jest.Mock).mockReturnValueOnce(true);
    const updatedUser = { _id: "uid", name: "Updated" };
    (UserModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValueOnce(updatedUser),
    });
    const req = mockReq({
      params: { id: "507f1f77bcf86cd799439011" },
      body: { name: "Updated" },
    });
    const res = mockRes();
    await updateUserById(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "User updated successfully" }),
    );
  });
});

// ─── deleteUserById ───────────────────────────────────────────────────────────
describe("deleteUserById", () => {
  it("returns 400 for an invalid ObjectId", async () => {
    (Types.ObjectId.isValid as jest.Mock).mockReturnValueOnce(false);
    const req = mockReq({ params: { id: "!!" } });
    const res = mockRes();
    await deleteUserById(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid user ID" });
  });

  it("returns 404 when user is not found", async () => {
    (Types.ObjectId.isValid as jest.Mock).mockReturnValueOnce(true);
    (UserModel.findByIdAndDelete as jest.Mock).mockResolvedValueOnce(null);
    const req = mockReq({ params: { id: "507f1f77bcf86cd799439011" } });
    const res = mockRes();
    await deleteUserById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 200 on successful deletion", async () => {
    (Types.ObjectId.isValid as jest.Mock).mockReturnValueOnce(true);
    (UserModel.findByIdAndDelete as jest.Mock).mockResolvedValueOnce({
      _id: "uid",
    });
    const req = mockReq({ params: { id: "507f1f77bcf86cd799439011" } });
    const res = mockRes();
    await deleteUserById(req, res);
    expect(res.json).toHaveBeenCalledWith({
      message: "User deleted successfully",
    });
  });

  it("returns 500 on unexpected error", async () => {
    (Types.ObjectId.isValid as jest.Mock).mockReturnValueOnce(true);
    (UserModel.findByIdAndDelete as jest.Mock).mockRejectedValueOnce(
      new Error("db error"),
    );
    const req = mockReq({ params: { id: "507f1f77bcf86cd799439011" } });
    const res = mockRes();
    await deleteUserById(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── getUserById ──────────────────────────────────────────────────────────────
describe("getUserById", () => {
  it("returns 400 for an invalid ObjectId", async () => {
    (Types.ObjectId.isValid as jest.Mock).mockReturnValueOnce(false);
    const req = mockReq({ params: { id: "bad-id" } });
    const res = mockRes();
    await getUserById(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid user ID" });
  });

  it("returns 404 when user is not found", async () => {
    (Types.ObjectId.isValid as jest.Mock).mockReturnValueOnce(true);
    (UserModel.findById as jest.Mock).mockResolvedValueOnce(null);
    const req = mockReq({ params: { id: "507f1f77bcf86cd799439011" } });
    const res = mockRes();
    await getUserById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns user on success", async () => {
    (Types.ObjectId.isValid as jest.Mock).mockReturnValueOnce(true);
    const user = { _id: "uid", name: "Alice", email: "a@b.com" };
    (UserModel.findById as jest.Mock).mockResolvedValueOnce(user);
    const req = mockReq({ params: { id: "507f1f77bcf86cd799439011" } });
    const res = mockRes();
    await getUserById(req, res);
    expect(res.json).toHaveBeenCalledWith(user);
  });

  it("returns 500 on unexpected error", async () => {
    (Types.ObjectId.isValid as jest.Mock).mockReturnValueOnce(true);
    (UserModel.findById as jest.Mock).mockRejectedValueOnce(
      new Error("db error"),
    );
    const req = mockReq({ params: { id: "507f1f77bcf86cd799439011" } });
    const res = mockRes();
    await getUserById(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
