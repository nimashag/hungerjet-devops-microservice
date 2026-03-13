// ─── Mocks (hoisted before imports) ──────────────────────────────────────────
jest.mock("jsonwebtoken");
jest.mock("dotenv", () => ({ config: jest.fn() }));

// ─── Imports ─────────────────────────────────────────────────────────────────
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { authenticate } from "../../middleware/authMiddleware";
import {
  isAppAdmin,
  isRestaurantAdmin,
  isCustomer,
  isDeliveryPersonnel,
} from "../../middleware/role.middleware";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const mockRes = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

// ─── authenticate ─────────────────────────────────────────────────────────────
describe("authenticate (users-service)", () => {
  it("returns 401 when authorization header is absent", () => {
    const req = { headers: {} } as Request;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Authorization token missing or invalid",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when header is not Bearer format", () => {
    const req = { headers: { authorization: "Basic sometoken" } } as Request;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() and attaches user payload when token is valid", () => {
    const decoded = { id: "user-123", role: "customer" };
    (jwt.verify as jest.Mock).mockReturnValueOnce(decoded);
    const req = {
      headers: { authorization: "Bearer valid.token.here" },
    } as Request;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    authenticate(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect((req as any).user).toEqual(decoded);
  });

  it("returns 403 when token verification throws", () => {
    (jwt.verify as jest.Mock).mockImplementationOnce(() => {
      throw new Error("jwt malformed");
    });
    const req = {
      headers: { authorization: "Bearer bad.token" },
    } as Request;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid or expired token",
    });
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── isAppAdmin ───────────────────────────────────────────────────────────────
describe("isAppAdmin", () => {
  it("returns 403 when user is absent", () => {
    const req = {} as Request;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    isAppAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Access denied: Admins only",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when user role is not appAdmin", () => {
    const req = { user: { role: "customer" } } as any;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    isAppAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when user role is appAdmin", () => {
    const req = { user: { role: "appAdmin" } } as any;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    isAppAdmin(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ─── isRestaurantAdmin ────────────────────────────────────────────────────────
describe("isRestaurantAdmin", () => {
  it("returns 403 when user is absent", () => {
    const req = {} as any;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    isRestaurantAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Access denied: Restaurant Admins only",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when role is appAdmin, not restaurantAdmin", () => {
    const req = { user: { role: "appAdmin" } } as any;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    isRestaurantAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when user role is restaurantAdmin", () => {
    const req = { user: { role: "restaurantAdmin" } } as any;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    isRestaurantAdmin(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ─── isCustomer ───────────────────────────────────────────────────────────────
describe("isCustomer", () => {
  it("returns 403 when user is absent", () => {
    const req = {} as any;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    isCustomer(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when role is restaurantAdmin, not customer", () => {
    const req = { user: { role: "restaurantAdmin" } } as any;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    isCustomer(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when user role is customer", () => {
    const req = { user: { role: "customer" } } as any;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    isCustomer(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ─── isDeliveryPersonnel ──────────────────────────────────────────────────────
describe("isDeliveryPersonnel", () => {
  it("returns 403 when user is absent", () => {
    const req = {} as any;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    isDeliveryPersonnel(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when role is customer, not deliveryPersonnel", () => {
    const req = { user: { role: "customer" } } as any;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    isDeliveryPersonnel(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when user role is deliveryPersonnel", () => {
    const req = { user: { role: "deliveryPersonnel" } } as any;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    isDeliveryPersonnel(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
