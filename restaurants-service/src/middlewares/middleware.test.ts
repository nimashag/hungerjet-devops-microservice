// ─── Mocks (hoisted before imports) ──────────────────────────────────────────
jest.mock("../utils/logger", () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

jest.mock("jsonwebtoken");

// ─── Imports ─────────────────────────────────────────────────────────────────
import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { authenticate, AuthenticatedRequest } from "./auth";
import { authorizeRoles } from "./authorize";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const mockRes = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

// ─── authenticate ─────────────────────────────────────────────────────────────
describe("authenticate (restaurants-service)", () => {
  it("returns 401 when authorization header is absent", () => {
    const req = {
      headers: {},
      path: "/api/restaurants",
      method: "GET",
    } as AuthenticatedRequest;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized: No token provided",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when header is not Bearer format", () => {
    const req = {
      headers: { authorization: "Basic sometoken" },
      path: "/api/restaurants",
      method: "GET",
    } as AuthenticatedRequest;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("does not log when path starts with /api/auth/", () => {
    const req = {
      headers: {},
      path: "/api/auth/login",
      method: "POST",
    } as AuthenticatedRequest;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("calls next() and attaches user when token is valid", () => {
    const decoded = { id: "user-id-abc", role: "restaurantAdmin" };
    (jwt.verify as jest.Mock).mockReturnValueOnce(decoded);
    const req = {
      headers: { authorization: "Bearer valid.token.here" },
      path: "/api/restaurants",
      method: "GET",
    } as AuthenticatedRequest;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    authenticate(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({ id: decoded.id, role: decoded.role });
  });

  it("returns 403 when token is invalid or expired", () => {
    (jwt.verify as jest.Mock).mockImplementationOnce(() => {
      throw new Error("jwt expired");
    });
    const req = {
      headers: { authorization: "Bearer bad.token.here" },
      path: "/api/restaurants",
      method: "GET",
    } as AuthenticatedRequest;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Forbidden: Invalid token",
    });
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── authorizeRoles ───────────────────────────────────────────────────────────
describe("authorizeRoles (restaurants-service)", () => {
  it("returns 401 when no user is attached to request", () => {
    const middleware = authorizeRoles("restaurantAdmin");
    const req = {
      path: "/api/restaurants",
      method: "POST",
    } as AuthenticatedRequest;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Unauthorized: No user found",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when user role is not in the allowed roles", () => {
    const middleware = authorizeRoles("restaurantAdmin");
    const req = {
      user: { id: "uid1", role: "customer" },
      path: "/api/restaurants",
      method: "POST",
    } as AuthenticatedRequest;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Forbidden: Access denied",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when user role matches the single allowed role", () => {
    const middleware = authorizeRoles("restaurantAdmin");
    const req = {
      user: { id: "uid2", role: "restaurantAdmin" },
      path: "/api/restaurants",
      method: "POST",
    } as AuthenticatedRequest;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("calls next() when user role matches one of multiple allowed roles", () => {
    const middleware = authorizeRoles("restaurantAdmin", "appAdmin");
    const req = {
      user: { id: "uid3", role: "appAdmin" },
      path: "/api/restaurants",
      method: "DELETE",
    } as AuthenticatedRequest;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("returns 403 when user role is deliveryPersonnel but only customer is allowed", () => {
    const middleware = authorizeRoles("customer");
    const req = {
      user: { id: "uid4", role: "deliveryPersonnel" },
      path: "/api/restaurants",
      method: "GET",
    } as AuthenticatedRequest;
    const res = mockRes();
    const next = jest.fn() as NextFunction;
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
