// ─── Module mocks (must be before any imports) ───────────────────────────────
jest.mock("dotenv", () => ({ config: jest.fn() }));

jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

jest.mock("../../services/delivery.service", () => ({
  findDeliveryByOrderId: jest.fn(),
  updateDeliveryAcceptance: jest.fn(),
  findAssignedDeliveriesForDriver: jest.fn(),
  findAllDeliveriesForDriver: jest.fn(),
  updateDeliveryStatusById: jest.fn(),
  createDelivery: jest.fn(),
}));

jest.mock("../../services/driver.service", () => ({
  findAvailableDriver: jest.fn(),
  markDriverAvailability: jest.fn(),
}));

jest.mock("../../models/driver.model", () => ({
  Driver: { findOne: jest.fn() },
}));

jest.mock("../../models/delivery.model", () => ({
  Delivery: {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("../../utils/httpClient", () => ({
  httpClient: { get: jest.fn() },
}));

jest.mock("../../services/email.service", () => ({ sendEmail: jest.fn() }));
jest.mock("../../services/sms.service", () => ({ sendSMS: jest.fn() }));

// ─── Imports (after mocks) ───────────────────────────────────────────────────
import { Request, Response } from "express";
import { Driver } from "../../models/driver.model";
import { Delivery } from "../../models/delivery.model";
import { httpClient } from "../../utils/httpClient";
import {
  findAvailableDriver,
  markDriverAvailability,
} from "../../services/driver.service";
import {
  createDelivery,
  findDeliveryByOrderId,
  updateDeliveryAcceptance,
  findAssignedDeliveriesForDriver,
  findAllDeliveriesForDriver,
  updateDeliveryStatusById,
} from "../../services/delivery.service";
import { sendEmail } from "../../services/email.service";
import { sendSMS } from "../../services/sms.service";
import {
  assignDriverAutomatically,
  respondToAssignment,
  getAssignedOrders,
  getMyDeliveries,
  updateDeliveryStatus,
  getAvailableOrders,
} from "../../controllers/delivery.controller";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const mockRes = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const mockReq = (overrides: Partial<Request> & { user?: any } = {}): Request =>
  ({ body: {}, params: {}, ...overrides }) as unknown as Request;

beforeEach(() => jest.resetAllMocks());

// ─── assignDriverAutomatically ────────────────────────────────────────────────
describe("assignDriverAutomatically", () => {
  const validBody = {
    orderId: "order123",
    customerId: "customer456",
    restaurantId: "rest789",
  };

  it("returns 400 when orderId is not a string", async () => {
    const req = mockReq({ body: { ...validBody, orderId: { $ne: null } } });
    const res = mockRes();
    await assignDriverAutomatically(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when customerId is not a string", async () => {
    const req = mockReq({ body: { ...validBody, customerId: 123 } });
    const res = mockRes();
    await assignDriverAutomatically(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when restaurantId is not a string", async () => {
    const req = mockReq({ body: { ...validBody, restaurantId: ["x"] } });
    const res = mockRes();
    await assignDriverAutomatically(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when orderId fails SAFE_ID_PATTERN", async () => {
    const req = mockReq({ body: { ...validBody, orderId: "../etc/passwd" } });
    const res = mockRes();
    await assignDriverAutomatically(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid ID format" });
  });

  it("returns 400 when customerId fails SAFE_ID_PATTERN", async () => {
    const req = mockReq({ body: { ...validBody, customerId: "bad/path" } });
    const res = mockRes();
    await assignDriverAutomatically(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when restaurantId fails SAFE_ID_PATTERN", async () => {
    const req = mockReq({
      body: { ...validBody, restaurantId: "../traversal" },
    });
    const res = mockRes();
    await assignDriverAutomatically(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when restaurant is not available", async () => {
    (httpClient.get as jest.Mock).mockResolvedValueOnce({
      data: { available: false, location: "Colombo" },
    });
    const req = mockReq({ body: validBody });
    const res = mockRes();
    await assignDriverAutomatically(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Restaurant not available",
    });
  });

  it("returns 404 when no driver is available", async () => {
    (httpClient.get as jest.Mock)
      .mockResolvedValueOnce({ data: { available: true, location: "Colombo" } })
      .mockResolvedValueOnce({ data: { deliveryAddress: { city: "Galle" } } });
    (findAvailableDriver as jest.Mock).mockResolvedValueOnce(null);
    const req = mockReq({ body: validBody });
    const res = mockRes();
    await assignDriverAutomatically(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "No matching driver available",
    });
  });

  it("returns 200 with delivery on success", async () => {
    const driver = { _id: { toString: () => "driver1" } };
    const delivery = { _id: "del1", orderId: "order123" };
    (httpClient.get as jest.Mock)
      .mockResolvedValueOnce({ data: { available: true, location: "Colombo" } })
      .mockResolvedValueOnce({ data: { deliveryAddress: { city: "Galle" } } });
    (findAvailableDriver as jest.Mock).mockResolvedValueOnce(driver);
    (createDelivery as jest.Mock).mockResolvedValueOnce(delivery);
    (markDriverAvailability as jest.Mock).mockResolvedValueOnce(undefined);
    const req = mockReq({ body: validBody });
    const res = mockRes();
    await assignDriverAutomatically(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Driver assigned" }),
    );
  });

  it("returns 500 on unexpected error", async () => {
    (httpClient.get as jest.Mock).mockRejectedValueOnce(
      new Error("Network error"),
    );
    const req = mockReq({ body: validBody });
    const res = mockRes();
    await assignDriverAutomatically(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── respondToAssignment ──────────────────────────────────────────────────────
describe("respondToAssignment", () => {
  it("returns 400 when orderId is not a string", async () => {
    const req = mockReq({ body: { orderId: 123, action: "accept" } });
    const res = mockRes();
    await respondToAssignment(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when orderId is an empty/whitespace string", async () => {
    const req = mockReq({ body: { orderId: "   ", action: "accept" } });
    const res = mockRes();
    await respondToAssignment(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when orderId fails SAFE_ID_PATTERN", async () => {
    const req = mockReq({ body: { orderId: "../etc", action: "accept" } });
    const res = mockRes();
    await respondToAssignment(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid orderId format",
    });
  });

  it("returns 400 for an unrecognised action", async () => {
    const req = mockReq({ body: { orderId: "order123", action: "hack" } });
    const res = mockRes();
    await respondToAssignment(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid action" });
  });

  it("returns 404 when delivery not found", async () => {
    (Driver.findOne as jest.Mock).mockResolvedValueOnce({
      _id: { toString: () => "driver1" },
    });
    (findDeliveryByOrderId as jest.Mock).mockResolvedValueOnce(null);
    const req = mockReq({
      body: { orderId: "order123", action: "accept" },
      user: { id: "user123" } as any,
    });
    const res = mockRes();
    await respondToAssignment(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 200 with accepted message on accept", async () => {
    const delivery = {
      orderId: "order123",
      driverId: "driver1",
      status: "Assigned",
      acceptStatus: "Pending",
    };
    (Driver.findOne as jest.Mock).mockResolvedValueOnce({
      _id: { toString: () => "driver1" },
    });
    (findDeliveryByOrderId as jest.Mock).mockResolvedValueOnce(delivery);
    (updateDeliveryAcceptance as jest.Mock).mockResolvedValueOnce(undefined);
    const req = mockReq({
      body: { orderId: "order123", action: "accept" },
      user: { id: "user123" } as any,
    });
    const res = mockRes();
    await respondToAssignment(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Assignment accepted" }),
    );
  });

  it("reassigns to new driver on decline when one is available", async () => {
    const delivery = {
      orderId: "order123",
      driverId: "driver1",
      status: "Assigned",
      acceptStatus: "Pending",
      restaurantLocation: "Colombo",
      save: jest.fn().mockResolvedValueOnce(undefined),
    };
    const newDriver = { _id: { toString: () => "driver2" } };
    (Driver.findOne as jest.Mock).mockResolvedValueOnce({
      _id: { toString: () => "driver1" },
    });
    (findDeliveryByOrderId as jest.Mock).mockResolvedValueOnce(delivery);
    (updateDeliveryAcceptance as jest.Mock).mockResolvedValueOnce(undefined);
    (httpClient.get as jest.Mock).mockResolvedValueOnce({
      data: { deliveryAddress: { city: "Galle" } },
    });
    (findAvailableDriver as jest.Mock).mockResolvedValueOnce(newDriver);
    (markDriverAvailability as jest.Mock).mockResolvedValueOnce(undefined);
    const req = mockReq({
      body: { orderId: "order123", action: "decline" },
      user: { id: "user123" } as any,
    });
    const res = mockRes();
    await respondToAssignment(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Delivery reassigned to another driver",
      }),
    );
  });

  it("sets delivery to pending on decline when no new driver is available", async () => {
    const delivery = {
      orderId: "order123",
      driverId: "driver1",
      status: "Assigned",
      acceptStatus: "Pending",
      restaurantLocation: "Colombo",
      save: jest.fn().mockResolvedValueOnce(undefined),
    };
    (Driver.findOne as jest.Mock).mockResolvedValueOnce({
      _id: { toString: () => "driver1" },
    });
    (findDeliveryByOrderId as jest.Mock).mockResolvedValueOnce(delivery);
    (updateDeliveryAcceptance as jest.Mock).mockResolvedValueOnce(undefined);
    (httpClient.get as jest.Mock).mockResolvedValueOnce({
      data: { deliveryAddress: { city: "Galle" } },
    });
    (findAvailableDriver as jest.Mock).mockResolvedValueOnce(null);
    const req = mockReq({
      body: { orderId: "order123", action: "decline" },
      user: { id: "user123" } as any,
    });
    const res = mockRes();
    await respondToAssignment(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "No driver available to reassign. Delivery pending.",
      }),
    );
  });
});

// ─── getAssignedOrders ────────────────────────────────────────────────────────
describe("getAssignedOrders", () => {
  it("returns 401 when user object is missing", async () => {
    const req = {} as any;
    const res = mockRes();
    await getAssignedOrders(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });

  it("returns 401 when userId is not a string", async () => {
    const req = { user: { id: { $ne: null } } } as any;
    const res = mockRes();
    await getAssignedOrders(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 404 when driver is not found", async () => {
    (Driver.findOne as jest.Mock).mockResolvedValueOnce(null);
    const req = { user: { id: "user123" } } as any;
    const res = mockRes();
    await getAssignedOrders(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Driver not found" });
  });

  it("skips deliveries with invalid orderId and returns 200", async () => {
    const driver = { _id: { toString: () => "driver1" } };
    const deliveries = [
      { orderId: "../bad", toObject: () => ({ orderId: "../bad" }) },
      {
        orderId: "order123",
        toObject: () => ({ orderId: "order123" }),
      },
    ];
    (Driver.findOne as jest.Mock).mockResolvedValueOnce(driver);
    (findAssignedDeliveriesForDriver as jest.Mock).mockResolvedValueOnce(
      deliveries,
    );
    (httpClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        deliveryAddress: { city: "Galle" },
        paymentStatus: "paid",
        userId: "u1",
        restaurantId: "r1",
        specialInstructions: "",
      },
    });
    const req = { user: { id: "user123" } } as any;
    const res = mockRes();
    await getAssignedOrders(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 500 on unexpected error", async () => {
    (Driver.findOne as jest.Mock).mockRejectedValueOnce(new Error("db error"));
    const req = { user: { id: "user123" } } as any;
    const res = mockRes();
    await getAssignedOrders(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("handles order-fetch errors and still returns 200 with null deliveryAddress", async () => {
    const driver = { _id: { toString: () => "driver1" } };
    const deliveries = [
      {
        _id: { toString: () => "d1" },
        orderId: "order123",
        toObject: () => ({ _id: "d1", orderId: "order123" }),
      },
    ];
    (Driver.findOne as jest.Mock).mockResolvedValueOnce(driver);
    (findAssignedDeliveriesForDriver as jest.Mock).mockResolvedValueOnce(
      deliveries,
    );
    (httpClient.get as jest.Mock).mockRejectedValueOnce(new Error("network"));
    const req = { user: { id: "user123" } } as any;
    const res = mockRes();

    await getAssignedOrders(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const result = (res.json as jest.Mock).mock.calls[0][0];
    expect(result[0].deliveryAddress).toBeNull();
  });
});

// ─── getMyDeliveries ──────────────────────────────────────────────────────────
describe("getMyDeliveries", () => {
  it("returns 401 when user object is missing", async () => {
    const req = {} as any;
    const res = mockRes();
    await getMyDeliveries(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });

  it("returns 401 when userId is falsy", async () => {
    const req = { user: { id: null } } as any;
    const res = mockRes();
    await getMyDeliveries(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 401 when userId is not a string", async () => {
    const req = { user: { id: { $exists: true } } } as any;
    const res = mockRes();
    await getMyDeliveries(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 404 when driver is not found", async () => {
    (Driver.findOne as jest.Mock).mockResolvedValueOnce(null);
    const req = { user: { id: "user123" } } as any;
    const res = mockRes();
    await getMyDeliveries(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Driver not found" });
  });

  it("returns 200 with enhanced deliveries", async () => {
    const driver = { _id: { toString: () => "driver1" } };
    const deliveries = [
      {
        _id: { toString: () => "d1" },
        orderId: "order123",
        toObject: () => ({ _id: "d1", orderId: "order123" }),
      },
    ];
    (Driver.findOne as jest.Mock).mockResolvedValueOnce(driver);
    (findAllDeliveriesForDriver as jest.Mock).mockResolvedValueOnce(deliveries);
    (httpClient.get as jest.Mock).mockResolvedValueOnce({
      data: { deliveryAddress: { city: "Colombo" } },
    });
    const req = { user: { id: "user123" } } as any;
    const res = mockRes();
    await getMyDeliveries(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("skips deliveries with invalid orderId (SAFE_ID_PATTERN)", async () => {
    const driver = { _id: { toString: () => "driver1" } };
    const deliveries = [
      { orderId: "../bad", toObject: () => ({ orderId: "../bad" }) },
    ];
    (Driver.findOne as jest.Mock).mockResolvedValueOnce(driver);
    (findAllDeliveriesForDriver as jest.Mock).mockResolvedValueOnce(deliveries);
    const req = { user: { id: "user123" } } as any;
    const res = mockRes();
    await getMyDeliveries(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const result = (res.json as jest.Mock).mock.calls[0][0];
    expect(result[0].deliveryAddress).toBeNull();
  });

  it("handles order-fetch errors and still returns 200 with null deliveryAddress", async () => {
    const driver = { _id: { toString: () => "driver1" } };
    const deliveries = [
      {
        _id: { toString: () => "d1" },
        orderId: "order123",
        toObject: () => ({ _id: "d1", orderId: "order123" }),
      },
    ];
    (Driver.findOne as jest.Mock).mockResolvedValueOnce(driver);
    (findAllDeliveriesForDriver as jest.Mock).mockResolvedValueOnce(deliveries);
    (httpClient.get as jest.Mock).mockRejectedValueOnce(new Error("timeout"));
    const req = { user: { id: "user123" } } as any;
    const res = mockRes();

    await getMyDeliveries(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const result = (res.json as jest.Mock).mock.calls[0][0];
    expect(result[0].deliveryAddress).toBeNull();
  });
});

// ─── updateDeliveryStatus ─────────────────────────────────────────────────────
describe("updateDeliveryStatus", () => {
  const baseReq = (status: string) =>
    ({
      params: { deliveryId: "del1" },
      body: { status },
      user: { id: "user1" },
    }) as any;

  it("returns 400 for an unrecognised status", async () => {
    const res = mockRes();
    await updateDeliveryStatus(baseReq("InvalidStatus"), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid status" });
  });

  it("returns 404 when delivery is not found", async () => {
    (updateDeliveryStatusById as jest.Mock).mockResolvedValueOnce(null);
    const res = mockRes();
    await updateDeliveryStatus(baseReq("Delivered"), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 500 when orderId in delivery fails SAFE_ID_PATTERN", async () => {
    (updateDeliveryStatusById as jest.Mock).mockResolvedValueOnce({
      orderId: "../bad",
    });
    const res = mockRes();
    await updateDeliveryStatus(baseReq("Delivered"), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid delivery record",
    });
  });

  it("returns 500 when userId from order fails SAFE_ID_PATTERN", async () => {
    (updateDeliveryStatusById as jest.Mock).mockResolvedValueOnce({
      orderId: "order123",
    });
    (httpClient.get as jest.Mock).mockResolvedValueOnce({
      data: { userId: "../hack", deliveryAddress: {} },
    });
    const res = mockRes();
    await updateDeliveryStatus(baseReq("Delivered"), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid order record" });
  });

  it("sends email and SMS and returns 200 on Delivered status", async () => {
    (updateDeliveryStatusById as jest.Mock).mockResolvedValueOnce({
      orderId: "order123",
    });
    (httpClient.get as jest.Mock)
      .mockResolvedValueOnce({
        data: {
          userId: "user456",
          deliveryAddress: { street: "1 Main St", city: "Galle" },
        },
      })
      .mockResolvedValueOnce({ data: { _id: "user456", name: "Alice" } });
    (sendEmail as jest.Mock).mockResolvedValueOnce(undefined);
    (sendSMS as jest.Mock).mockResolvedValueOnce(undefined);
    const res = mockRes();
    await updateDeliveryStatus(baseReq("Delivered"), res);
    expect(sendEmail).toHaveBeenCalled();
    expect(sendSMS).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 200 on PickedUp status without sending notifications", async () => {
    (updateDeliveryStatusById as jest.Mock).mockResolvedValueOnce({
      orderId: "order123",
    });
    const res = mockRes();
    await updateDeliveryStatus(baseReq("PickedUp"), res);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendSMS).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 200 on Cancelled status", async () => {
    (updateDeliveryStatusById as jest.Mock).mockResolvedValueOnce({
      orderId: "order123",
    });
    const res = mockRes();
    await updateDeliveryStatus(baseReq("Cancelled"), res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 500 on unexpected error", async () => {
    (updateDeliveryStatusById as jest.Mock).mockRejectedValueOnce(
      new Error("db failure"),
    );
    const res = mockRes();
    await updateDeliveryStatus(baseReq("Delivered"), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── getAvailableOrders ──────────────────────────────────────────────────────
describe("getAvailableOrders", () => {
  it("returns 401 when user object is missing", async () => {
    const req = {} as any;
    const res = mockRes();
    await getAvailableOrders(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });

  it("returns 404 when driver is not found", async () => {
    (Driver.findOne as jest.Mock).mockResolvedValueOnce(null);
    const req = { user: { id: "user123" } } as any;
    const res = mockRes();
    await getAvailableOrders(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Driver not found" });
  });

  it("continues when backfill fails and returns available orders", async () => {
    (Driver.findOne as jest.Mock).mockResolvedValueOnce({
      _id: { toString: () => "driver1" },
      pickupLocation: "Colombo",
    });

    (httpClient.get as jest.Mock).mockRejectedValueOnce(
      new Error("orders down"),
    );

    const deliveries = [
      {
        _id: { toString: () => "d1" },
        orderId: "order123",
        restaurantLocation: "Colombo",
        toObject: () => ({ _id: "d1", orderId: "order123" }),
      },
    ];

    (Delivery.find as jest.Mock).mockReturnValue({
      where: jest.fn().mockReturnValue({
        equals: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            equals: jest.fn().mockResolvedValue(deliveries),
          }),
        }),
      }),
    });

    (httpClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        deliveryAddress: { city: "Galle" },
        paymentStatus: "paid",
        userId: "u1",
        restaurantId: "r1",
        specialInstructions: "",
      },
    });

    const req = { user: { id: "user123" } } as any;
    const res = mockRes();
    await getAvailableOrders(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const result = (res.json as jest.Mock).mock.calls[0][0];
    expect(result[0].deliveryAddress).toEqual({ city: "Galle" });
  });
});
