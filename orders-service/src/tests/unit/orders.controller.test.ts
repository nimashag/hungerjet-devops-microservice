// ─── Module mocks (must be before any imports) ───────────────────────────────
jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

jest.mock("../../services/orders.service", () => ({
  createOrder: jest.fn(),
  getOrderById: jest.fn(),
  getAllOrders: jest.fn(),
  updateOrder: jest.fn(),
  deleteOrder: jest.fn(),
  getOrdersByUserId: jest.fn(),
  getOrdersByRestaurantId: jest.fn(),
  updateOrderStatus: jest.fn(),
  processOrderPayment: jest.fn(),
}));

jest.mock("../../api/restaurant.api", () => ({
  fetchMenuItems: jest.fn(),
  fetchRestaurant: jest.fn(),
}));

jest.mock("../../utils/stripe", () => ({
  __esModule: true,
  default: {
    paymentIntents: { create: jest.fn() },
    webhooks: { constructEvent: jest.fn() },
  },
}));

// ─── Imports (after mocks) ───────────────────────────────────────────────────
import { Response } from "express";
import * as OrdersService from "../../services/orders.service";
import { fetchMenuItems } from "../../api/restaurant.api";
import {
  create,
  getOne,
  getAll,
  deleteOrder,
  getCurrentUserOrders,
  updateOrderStatus,
  getByRestaurantId,
  updateDeliveryAddress,
  updateSpecialInstructions,
  createPaymentIntent,
  stripeWebhook,
  markOrderPaid,
  markOrderAsPaid,
} from "../../controllers/orders.controller";
import stripe from "../../utils/stripe";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const mockRes = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

/** Build an AuthenticatedRequest-shaped object */
const mockReq = (user: any, body: any = {}, params: any = {}): any => ({
  user,
  body,
  params,
});

beforeEach(() => jest.clearAllMocks());

// ─── create ───────────────────────────────────────────────────────────────────
describe("create", () => {
  it("returns 401 when there is no authenticated user", async () => {
    const req = mockReq(null, { restaurantId: "rest1", items: [] });
    const res = mockRes();
    await create(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 when restaurantId is not a string (NoSQL injection attempt)", async () => {
    const req = mockReq(
      { id: "user1" },
      { restaurantId: { $ne: null }, items: [] },
    );
    const res = mockRes();
    await create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid restaurantId format",
    });
  });

  it("returns 400 when restaurantId contains path-traversal characters", async () => {
    const req = mockReq(
      { id: "user1" },
      { restaurantId: "../../../etc/passwd", items: [] },
    );
    const res = mockRes();
    await create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid restaurantId format",
    });
  });

  it("returns 400 when no menu items are found for the restaurant", async () => {
    (fetchMenuItems as jest.Mock).mockResolvedValueOnce([]);
    const req = mockReq(
      { id: "user1" },
      { restaurantId: "rest123", items: [] },
    );
    const res = mockRes();
    await create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "No menu items found for this restaurant.",
    });
  });

  it("creates and returns the order on success", async () => {
    const order = {
      _id: { toString: () => "order1" },
      restaurantId: { toString: () => "rest123" },
      totalAmount: 100,
      status: "Pending",
      paymentStatus: "Unpaid",
    };
    (fetchMenuItems as jest.Mock).mockResolvedValueOnce([
      { id: "item1", name: "Pizza", price: 10 },
    ]);
    (OrdersService.createOrder as jest.Mock).mockResolvedValueOnce(order);
    const req = mockReq(
      { id: "user1" },
      { restaurantId: "rest123", items: [{ id: "item1" }], totalAmount: 100 },
    );
    const res = mockRes();
    await create(req, res);
    expect(res.json).toHaveBeenCalledWith(order);
  });

  it("returns 500 on unexpected error", async () => {
    (fetchMenuItems as jest.Mock).mockRejectedValueOnce(
      new Error("Network error"),
    );
    const req = mockReq(
      { id: "user1" },
      { restaurantId: "rest123", items: [] },
    );
    const res = mockRes();
    await create(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── getOne ───────────────────────────────────────────────────────────────────
describe("getOne", () => {
  it("returns 404 when order is not found", async () => {
    (OrdersService.getOrderById as jest.Mock).mockResolvedValueOnce(null);
    const req = { params: { id: "missing-id" } } as any;
    const res = mockRes();
    await getOne(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Order not found" });
  });

  it("returns the order when found", async () => {
    const order = {
      _id: { toString: () => "o1" },
      userId: { toString: () => "u1" },
      restaurantId: { toString: () => "r1" },
      status: "Pending",
    };
    (OrdersService.getOrderById as jest.Mock).mockResolvedValueOnce(order);
    const req = { params: { id: "o1" } } as any;
    const res = mockRes();
    await getOne(req, res);
    expect(res.json).toHaveBeenCalledWith(order);
  });

  it("returns 400 for a CastError (invalid ObjectId format)", async () => {
    const castErr = Object.assign(new Error("Cast error"), {
      name: "CastError",
    });
    (OrdersService.getOrderById as jest.Mock).mockRejectedValueOnce(castErr);
    const req = { params: { id: "not-valid-id" } } as any;
    const res = mockRes();
    await getOne(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 500 on other errors", async () => {
    (OrdersService.getOrderById as jest.Mock).mockRejectedValueOnce(
      new Error("db error"),
    );
    const req = { params: { id: "o1" } } as any;
    const res = mockRes();
    await getOne(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── getAll ───────────────────────────────────────────────────────────────────
describe("getAll", () => {
  it("returns all orders", async () => {
    const orders = [{ _id: "o1" }, { _id: "o2" }];
    (OrdersService.getAllOrders as jest.Mock).mockResolvedValueOnce(orders);
    const res = mockRes();
    await getAll({} as any, res);
    expect(res.json).toHaveBeenCalledWith(orders);
  });

  it("returns 500 on error", async () => {
    (OrdersService.getAllOrders as jest.Mock).mockRejectedValueOnce(
      new Error("fail"),
    );
    const res = mockRes();
    await getAll({} as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── deleteOrder ──────────────────────────────────────────────────────────────
describe("deleteOrder", () => {
  it("returns 401 when there is no authenticated user", async () => {
    const req = mockReq(null, {}, { id: "order1" });
    const res = mockRes();
    await deleteOrder(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 404 when order is not found", async () => {
    (OrdersService.deleteOrder as jest.Mock).mockResolvedValueOnce(null);
    const req = mockReq({ id: "user1" }, {}, { id: "order1" });
    const res = mockRes();
    await deleteOrder(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("deletes and returns 200 on success", async () => {
    const deleted = { _id: "o1", status: "Pending", userId: "u1" };
    (OrdersService.deleteOrder as jest.Mock).mockResolvedValueOnce(deleted);
    const req = mockReq({ id: "user1" }, {}, { id: "o1" });
    const res = mockRes();
    await deleteOrder(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Order deleted successfully",
    });
  });
});

// ─── getCurrentUserOrders ─────────────────────────────────────────────────────
describe("getCurrentUserOrders", () => {
  it("returns 401 when there is no authenticated user", async () => {
    const req = mockReq(null);
    const res = mockRes();
    await getCurrentUserOrders(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns the current user's orders", async () => {
    const orders = [{ _id: "o1", userId: "user1" }];
    (OrdersService.getOrdersByUserId as jest.Mock).mockResolvedValueOnce(
      orders,
    );
    const req = mockReq({ id: "user1" });
    const res = mockRes();
    await getCurrentUserOrders(req, res);
    expect(res.json).toHaveBeenCalledWith(orders);
  });

  it("returns 500 on unexpected error", async () => {
    (OrdersService.getOrdersByUserId as jest.Mock).mockRejectedValueOnce(
      new Error("db error"),
    );
    const req = mockReq({ id: "user1" });
    const res = mockRes();
    await getCurrentUserOrders(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── getByRestaurantId ────────────────────────────────────────────────────────
describe("getByRestaurantId", () => {
  it("returns orders for the given restaurant", async () => {
    const orders = [{ _id: "o1", restaurantId: "r1" }];
    (OrdersService.getOrdersByRestaurantId as jest.Mock).mockResolvedValueOnce(
      orders,
    );
    const req = { params: { restaurantId: "r1" } } as any;
    const res = mockRes();
    await getByRestaurantId(req, res);
    expect(res.json).toHaveBeenCalledWith(orders);
  });

  it("returns 500 on unexpected error", async () => {
    (OrdersService.getOrdersByRestaurantId as jest.Mock).mockRejectedValueOnce(
      new Error("fail"),
    );
    const req = { params: { restaurantId: "r1" } } as any;
    const res = mockRes();
    await getByRestaurantId(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── updateOrderStatus ────────────────────────────────────────────────────────
describe("updateOrderStatus", () => {
  it("returns 401 when there is no authenticated user", async () => {
    const req = mockReq(null, { status: "Confirmed" }, { id: "o1" });
    const res = mockRes();
    await updateOrderStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 when status is missing", async () => {
    const req = mockReq({ id: "user1", role: "admin" }, {}, { id: "o1" });
    const res = mockRes();
    await updateOrderStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Status is required" });
  });

  it("returns 404 when order is not found (restaurantAdmin path)", async () => {
    (OrdersService.getOrderById as jest.Mock).mockResolvedValueOnce(null);
    const req = mockReq(
      { id: "user1", role: "restaurantAdmin", restaurantId: "r1" },
      { status: "Confirmed" },
      { id: "o1" },
    );
    const res = mockRes();
    await updateOrderStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 403 when restaurantAdmin tries to update another restaurant's order", async () => {
    const order = {
      _id: "o1",
      restaurantId: { toString: () => "other-r" },
      status: "Pending",
    };
    (OrdersService.getOrderById as jest.Mock).mockResolvedValueOnce(order);
    const req = mockReq(
      { id: "user1", role: "restaurantAdmin", restaurantId: "my-r" },
      { status: "Confirmed" },
      { id: "o1" },
    );
    const res = mockRes();
    await updateOrderStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 403 when restaurantAdmin has no restaurantId", async () => {
    const order = {
      _id: "o1",
      restaurantId: { toString: () => "r1" },
      status: "Pending",
    };
    (OrdersService.getOrderById as jest.Mock).mockResolvedValueOnce(order);
    const req = mockReq(
      { id: "user1", role: "restaurantAdmin" },
      { status: "Confirmed" },
      { id: "o1" },
    );
    const res = mockRes();
    await updateOrderStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Not authorized to update this order",
    });
  });

  it("returns updated order for non-restaurantAdmin role", async () => {
    const updated = { _id: { toString: () => "o1" }, status: "Confirmed" };
    (OrdersService.updateOrderStatus as jest.Mock).mockResolvedValueOnce(
      updated,
    );
    const req = mockReq(
      { id: "user1", role: "admin" },
      { status: "Confirmed" },
      { id: "o1" },
    );
    const res = mockRes();
    await updateOrderStatus(req, res);
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  it("returns 404 when updateOrderStatus returns null", async () => {
    (OrdersService.updateOrderStatus as jest.Mock).mockResolvedValueOnce(null);
    const req = mockReq(
      { id: "user1", role: "admin" },
      { status: "Confirmed" },
      { id: "o1" },
    );
    const res = mockRes();
    await updateOrderStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Order not found" });
  });

  it("returns 500 on unexpected error", async () => {
    (OrdersService.updateOrderStatus as jest.Mock).mockRejectedValueOnce(
      new Error("db error"),
    );
    const req = mockReq(
      { id: "user1", role: "admin" },
      { status: "Confirmed" },
      { id: "o1" },
    );
    const res = mockRes();
    await updateOrderStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("updateDeliveryAddress", () => {
  it("returns 401 when there is no authenticated user", async () => {
    const req = mockReq(null, { deliveryAddress: "Colombo" }, { id: "o1" });
    const res = mockRes();
    await updateDeliveryAddress(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 when deliveryAddress is missing", async () => {
    const req = mockReq({ id: "u1" }, {}, { id: "o1" });
    const res = mockRes();
    await updateDeliveryAddress(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 when order not found", async () => {
    (OrdersService.updateOrder as jest.Mock).mockResolvedValueOnce(null);
    const req = mockReq(
      { id: "u1" },
      { deliveryAddress: "Kandy" },
      { id: "o1" },
    );
    const res = mockRes();
    await updateDeliveryAddress(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns updated order on success", async () => {
    const updated = { _id: "o1", deliveryAddress: "Kandy" };
    (OrdersService.updateOrder as jest.Mock).mockResolvedValueOnce(updated);
    const req = mockReq(
      { id: "u1" },
      { deliveryAddress: "Kandy" },
      { id: "o1" },
    );
    const res = mockRes();
    await updateDeliveryAddress(req, res);
    expect(res.json).toHaveBeenCalledWith(updated);
  });
});

describe("updateSpecialInstructions", () => {
  it("returns 401 when unauthenticated", async () => {
    const req = mockReq(
      null,
      { specialInstructions: "No onions" },
      { id: "o1" },
    );
    const res = mockRes();
    await updateSpecialInstructions(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 when specialInstructions is undefined", async () => {
    const req = mockReq({ id: "u1" }, {}, { id: "o1" });
    const res = mockRes();
    await updateSpecialInstructions(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 when order not found", async () => {
    (OrdersService.updateOrder as jest.Mock).mockResolvedValueOnce(null);
    const req = mockReq(
      { id: "u1" },
      { specialInstructions: "No onions" },
      { id: "o1" },
    );
    const res = mockRes();
    await updateSpecialInstructions(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns updated order on success", async () => {
    const updated = { _id: "o1", specialInstructions: "No onions" };
    (OrdersService.updateOrder as jest.Mock).mockResolvedValueOnce(updated);
    const req = mockReq(
      { id: "u1" },
      { specialInstructions: "No onions" },
      { id: "o1" },
    );
    const res = mockRes();
    await updateSpecialInstructions(req, res);
    expect(res.json).toHaveBeenCalledWith(updated);
  });
});

describe("createPaymentIntent", () => {
  it("returns 401 when unauthenticated", async () => {
    const req = mockReq(null, { totalAmount: 10, items: [] });
    const res = mockRes();
    await createPaymentIntent(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 for invalid totalAmount", async () => {
    const req = mockReq({ id: "u1" }, { totalAmount: 0, items: [] });
    const res = mockRes();
    await createPaymentIntent(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns client secret on success", async () => {
    (stripe.paymentIntents.create as jest.Mock).mockResolvedValueOnce({
      id: "pi_1",
      amount: 1399,
      currency: "usd",
      client_secret: "secret_1",
    });
    const req = mockReq(
      { id: "u1" },
      {
        totalAmount: 10,
        items: [{ name: "Burger", price: 10 }],
      },
    );
    const res = mockRes();
    await createPaymentIntent(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ clientSecret: "secret_1" }),
    );
  });

  it("returns 500 when stripe create throws", async () => {
    (stripe.paymentIntents.create as jest.Mock).mockRejectedValueOnce(
      new Error("stripe down"),
    );
    const req = mockReq(
      { id: "u1" },
      {
        totalAmount: 10,
        items: [{ name: "Burger", price: 10 }],
      },
    );
    const res = mockRes();
    await createPaymentIntent(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Something went wrong while creating payment intent",
    });
  });
});

describe("stripeWebhook", () => {
  it("returns 400 when signature verification fails", async () => {
    (stripe.webhooks.constructEvent as jest.Mock).mockImplementationOnce(() => {
      throw new Error("invalid signature");
    });
    const req: any = {
      headers: { "stripe-signature": "sig" },
      body: {},
      get: jest.fn(() => "application/json"),
    };
    const res = mockRes() as any;
    res.send = jest.fn().mockReturnValue(res);

    await stripeWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("handles succeeded payment intent and returns received true", async () => {
    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce({
      id: "evt_1",
      type: "payment_intent.succeeded",
      data: {
        object: { id: "pi_1", amount: 1000, metadata: { orderId: "o1" } },
      },
    });
    (OrdersService.processOrderPayment as jest.Mock).mockResolvedValueOnce({
      _id: "o1",
    });

    const req: any = {
      headers: { "stripe-signature": "sig" },
      body: {},
      get: jest.fn(() => "application/json"),
    };
    const res = mockRes() as any;

    await stripeWebhook(req, res);
    expect(OrdersService.processOrderPayment).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it("handles succeeded payment intent with no orderId metadata", async () => {
    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce({
      id: "evt_2",
      type: "payment_intent.succeeded",
      data: {
        object: { id: "pi_2", amount: 2500, metadata: {} },
      },
    });

    const req: any = {
      headers: { "stripe-signature": "sig" },
      body: {},
      get: jest.fn(() => "application/json"),
    };
    const res = mockRes() as any;

    await stripeWebhook(req, res);
    expect(OrdersService.processOrderPayment).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it("continues when processOrderPayment throws during webhook", async () => {
    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce({
      id: "evt_3",
      type: "payment_intent.succeeded",
      data: {
        object: { id: "pi_3", amount: 1500, metadata: { orderId: "o3" } },
      },
    });
    (OrdersService.processOrderPayment as jest.Mock).mockRejectedValueOnce(
      new Error("processing failed"),
    );

    const req: any = {
      headers: { "stripe-signature": "sig" },
      body: {},
      get: jest.fn(() => "application/json"),
    };
    const res = mockRes() as any;

    await stripeWebhook(req, res);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it("handles unhandled webhook event types", async () => {
    (stripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce({
      id: "evt_4",
      type: "payment_intent.canceled",
      data: { object: { id: "pi_4", amount: 1000 } },
    });

    const req: any = {
      headers: { "stripe-signature": "sig" },
      body: {},
      get: jest.fn(() => "application/json"),
    };
    const res = mockRes() as any;

    await stripeWebhook(req, res);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });
});

describe("markOrderPaid and markOrderAsPaid", () => {
  it("markOrderPaid returns 401 when unauthenticated", async () => {
    const req = mockReq(
      null,
      { paymentMethod: "Stripe", transactionId: "tx" },
      { id: "o1" },
    );
    const res = mockRes();
    await markOrderPaid(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("markOrderPaid returns 400 when fields are missing", async () => {
    const req = mockReq(
      { id: "u1" },
      { paymentMethod: "Stripe" },
      { id: "o1" },
    );
    const res = mockRes();
    await markOrderPaid(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("markOrderPaid returns updated order on success", async () => {
    (OrdersService.processOrderPayment as jest.Mock).mockResolvedValueOnce({
      _id: "o1",
      status: "Confirmed",
      paymentStatus: "Paid",
    });
    const req = mockReq(
      { id: "u1" },
      { paymentMethod: "Stripe", transactionId: "tx_1" },
      { id: "o1" },
    );
    const res = mockRes();
    await markOrderPaid(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  it("markOrderPaid returns 404 when order not found", async () => {
    (OrdersService.processOrderPayment as jest.Mock).mockResolvedValueOnce(
      null,
    );
    const req = mockReq(
      { id: "u1" },
      { paymentMethod: "Stripe", transactionId: "tx_404" },
      { id: "o404" },
    );
    const res = mockRes();
    await markOrderPaid(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("markOrderPaid returns 500 when service throws", async () => {
    (OrdersService.processOrderPayment as jest.Mock).mockRejectedValueOnce(
      new Error("db fail"),
    );
    const req = mockReq(
      { id: "u1" },
      { paymentMethod: "Stripe", transactionId: "tx_500" },
      { id: "o1" },
    );
    const res = mockRes();
    await markOrderPaid(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("markOrderAsPaid returns 400 when fields are missing", async () => {
    const req = mockReq(
      { id: "u1" },
      { paymentMethod: "Stripe" },
      { id: "o1" },
    );
    const res = mockRes();
    await markOrderAsPaid(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("markOrderAsPaid returns updated order on success", async () => {
    (OrdersService.processOrderPayment as jest.Mock).mockResolvedValueOnce({
      _id: "o1",
      status: "Confirmed",
      paymentStatus: "Paid",
    });
    const req = mockReq(
      { id: "u1" },
      { paymentMethod: "Stripe", transactionId: "tx_2" },
      { id: "o1" },
    );
    const res = mockRes();
    await markOrderAsPaid(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  it("markOrderAsPaid returns 401 when unauthenticated", async () => {
    const req = mockReq(
      null,
      { paymentMethod: "Stripe", transactionId: "tx" },
      { id: "o1" },
    );
    const res = mockRes();
    await markOrderAsPaid(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("markOrderAsPaid returns 404 when order not found", async () => {
    (OrdersService.processOrderPayment as jest.Mock).mockResolvedValueOnce(
      null,
    );
    const req = mockReq(
      { id: "u1" },
      { paymentMethod: "Stripe", transactionId: "tx_missing" },
      { id: "o404" },
    );
    const res = mockRes();
    await markOrderAsPaid(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("markOrderAsPaid returns 500 when service throws", async () => {
    (OrdersService.processOrderPayment as jest.Mock).mockRejectedValueOnce(
      new Error("db fail"),
    );
    const req = mockReq(
      { id: "u1" },
      { paymentMethod: "Stripe", transactionId: "tx_500" },
      { id: "o1" },
    );
    const res = mockRes();
    await markOrderAsPaid(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
