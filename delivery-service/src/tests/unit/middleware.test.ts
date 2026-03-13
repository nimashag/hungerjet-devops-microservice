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
import { authenticate } from "../../middleware/auth";
import { authorizeRoles } from "../../middleware/authorize";
import { requestLogger } from "../../middleware/requestLogger";
import { logInfo, logWarn, requestContext } from "../../utils/logger";

const mockRes = () => {
  const listeners: Record<string, () => void> = {};
  const headers: Record<string, string> = {};
  const res: any = {
    statusCode: 200,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn((key: string, value: string) => {
      headers[key] = value;
    }),
    on: jest.fn((event: string, cb: () => void) => {
      listeners[event] = cb;
    }),
    _listeners: listeners,
  };
  return res;
};

describe("delivery middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("authenticate", () => {
    it("returns 401 if auth header is missing", () => {
      const req: any = { headers: {}, path: "/api/delivery", method: "GET" };
      const res = mockRes();
      const next = jest.fn();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("attaches user and calls next for valid token", () => {
      (jwt.verify as jest.Mock).mockReturnValueOnce({
        id: "u1",
        role: "deliveryPersonnel",
      });
      const req: any = {
        headers: { authorization: "Bearer valid-token" },
        path: "/api/delivery",
        method: "GET",
      };
      const res = mockRes();
      const next = jest.fn();

      authenticate(req, res, next);

      expect(req.user).toEqual({ id: "u1", role: "deliveryPersonnel" });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("returns 403 for invalid token", () => {
      (jwt.verify as jest.Mock).mockImplementationOnce(() => {
        throw new Error("bad token");
      });
      const req: any = {
        headers: { authorization: "Bearer invalid" },
        path: "/api/delivery",
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
      const req: any = { path: "/api/delivery", method: "GET" };
      const res = mockRes();
      const next = jest.fn();

      authorizeRoles("admin")(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 403 for wrong role", () => {
      const req: any = {
        user: { id: "u1", role: "customer" },
        path: "/api/delivery",
        method: "GET",
      };
      const res = mockRes();
      const next = jest.fn();

      authorizeRoles("deliveryPersonnel")(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next for allowed role", () => {
      const req: any = {
        user: { id: "u1", role: "deliveryPersonnel" },
        path: "/api/delivery",
        method: "GET",
      };
      const res = mockRes();
      const next = jest.fn();

      authorizeRoles("deliveryPersonnel", "admin")(req, res, next);

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
        originalUrl: "/api/delivery",
        path: "/api/delivery",
        query: { page: "1" },
        body: { status: "Assigned" },
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
        originalUrl: "/api/delivery",
        path: "/api/delivery",
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
