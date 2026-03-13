jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  requestContext: {
    run: jest.fn((_: any, fn: () => void) => fn()),
  },
}));

import jwt from "jsonwebtoken";
import { authenticate } from "../../middlewares/auth";
import { authorizeRoles } from "../../middlewares/authorize";
import { requestLogger } from "../../middlewares/requestLogger";
import { logInfo, logWarn, requestContext } from "../../utils/logger";

const mockRes = () => {
  const headers: Record<string, string> = {};
  const listeners: Record<string, () => void> = {};
  const res: any = {
    statusCode: 200,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn((key: string, value: string) => {
      headers[key] = value;
    }),
    getHeader: jest.fn((key: string) => headers[key]),
    on: jest.fn((event: string, cb: () => void) => {
      listeners[event] = cb;
    }),
    _listeners: listeners,
  };
  return res;
};

describe("orders middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("authenticate", () => {
    it("returns 401 if auth header is missing", () => {
      const req: any = { headers: {}, path: "/api/orders", method: "GET" };
      const res = mockRes();
      const next = jest.fn();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("does not log missing token for auth endpoints", () => {
      const req: any = { headers: {}, path: "/api/auth/login", method: "POST" };
      const res = mockRes();
      const next = jest.fn();

      authenticate(req, res, next);

      expect(logWarn).not.toHaveBeenCalledWith(
        "auth.missing_token",
        expect.anything(),
      );
    });

    it("attaches user and calls next for valid token", () => {
      (jwt.verify as jest.Mock).mockReturnValueOnce({
        id: "u1",
        role: "customer",
      });
      const req: any = {
        headers: { authorization: "Bearer valid-token" },
        path: "/api/orders",
        method: "GET",
      };
      const res = mockRes();
      const next = jest.fn();

      authenticate(req, res, next);

      expect(req.user).toEqual({ id: "u1", role: "customer" });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("returns 403 for invalid token", () => {
      (jwt.verify as jest.Mock).mockImplementationOnce(() => {
        throw new Error("bad token");
      });
      const req: any = {
        headers: { authorization: "Bearer invalid" },
        path: "/api/orders",
        method: "GET",
      };
      const res = mockRes();
      const next = jest.fn();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("authorizeRoles", () => {
    it("returns 401 when req.user is missing", () => {
      const req: any = { path: "/api/orders", method: "GET" };
      const res = mockRes();
      const next = jest.fn();

      authorizeRoles("admin")(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 403 for wrong role", () => {
      const req: any = {
        user: { id: "u1", role: "customer" },
        path: "/api/orders",
        method: "GET",
      };
      const res = mockRes();
      const next = jest.fn();

      authorizeRoles("admin")(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next for allowed role", () => {
      const req: any = {
        user: { id: "u1", role: "admin" },
        path: "/api/orders",
        method: "GET",
      };
      const res = mockRes();
      const next = jest.fn();

      authorizeRoles("admin", "restaurantAdmin")(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(logInfo).toHaveBeenCalledWith(
        "authorize.access_granted",
        expect.any(Object),
      );
    });
  });

  describe("requestLogger", () => {
    it("sets request/session headers and logs success on finish", () => {
      const req: any = {
        method: "GET",
        originalUrl: "/api/orders",
        path: "/api/orders",
        query: { page: "1" },
        body: { status: "Pending" },
        ip: "127.0.0.1",
        user: { id: "u1" },
        get: jest.fn((key: string) => {
          if (key === "X-Request-Id") return "req-123";
          if (key === "X-Session-Id") return "sess-1";
          if (key === "user-agent") return "jest-agent";
          return undefined;
        }),
      };
      const res = mockRes();
      const next = jest.fn();

      requestLogger(req, res as any, next);
      res.statusCode = 200;
      res._listeners.finish();

      expect(requestContext.run).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith("X-Request-Id", "req-123");
      expect(res.setHeader).toHaveBeenCalledWith("X-Session-Id", "sess-1");
      expect(next).toHaveBeenCalledTimes(1);
      expect(logInfo).toHaveBeenCalledWith(
        "http.request.completed.success",
        expect.any(Object),
      );
    });

    it("logs error completion for 4xx/5xx response", () => {
      const req: any = {
        method: "POST",
        originalUrl: "/api/orders",
        path: "/api/orders",
        query: {},
        body: {},
        ip: "127.0.0.1",
        get: jest.fn(() => undefined),
      };
      const res = mockRes();
      const next = jest.fn();

      requestLogger(req, res as any, next);
      res.statusCode = 500;
      res._listeners.finish();

      expect(logWarn).toHaveBeenCalledWith(
        "http.request.completed.error",
        expect.any(Object),
      );
    });
  });
});
