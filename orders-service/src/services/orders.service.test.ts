jest.mock("../models/order.model", () => ({
  Order: {
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.mock("./email.service", () => ({
  sendOrderStatusEmail: jest.fn(),
}));

jest.mock("./sms.service", () => ({
  sendOrderStatusSMS: jest.fn(),
}));

jest.mock("../utils/logger", () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

import { Order } from "../models/order.model";
import { sendOrderStatusEmail } from "./email.service";
import { sendOrderStatusSMS } from "./sms.service";
import {
  createOrder,
  getOrderById,
  getAllOrders,
  getOrdersByRestaurantId,
  updateOrder,
  deleteOrder,
  getOrdersByUserId,
  processOrderPayment,
  updateOrderStatus,
} from "./orders.service";

const mockOrderDoc = (overrides: Record<string, unknown> = {}) => ({
  _id: { toString: () => "order-1" },
  userId: { toString: () => "user-1" },
  restaurantId: { toString: () => "rest-1" },
  status: "Pending",
  paymentStatus: "Unpaid",
  ...overrides,
});

describe("orders.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("createOrder creates order", async () => {
    const created = mockOrderDoc();
    (Order.create as jest.Mock).mockResolvedValueOnce(created);

    const result = await createOrder(
      { restaurantId: "rest-1", items: [] },
      "user-1",
    );

    expect(Order.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" }),
    );
    expect(result).toBe(created);
  });

  it("createOrder rethrows errors", async () => {
    (Order.create as jest.Mock).mockRejectedValueOnce(new Error("db fail"));
    await expect(
      createOrder({ restaurantId: "rest-1", items: [] }, "user-1"),
    ).rejects.toThrow("db fail");
  });

  it("getOrderById returns null when not found", async () => {
    (Order.findById as jest.Mock).mockResolvedValueOnce(null);
    await expect(getOrderById("missing")).resolves.toBeNull();
  });

  it("getOrderById returns doc when found", async () => {
    const found = mockOrderDoc();
    (Order.findById as jest.Mock).mockResolvedValueOnce(found);
    await expect(getOrderById("order-1")).resolves.toBe(found);
  });

  it("getAllOrders returns array", async () => {
    (Order.find as jest.Mock).mockResolvedValueOnce([mockOrderDoc()]);
    await expect(getAllOrders()).resolves.toHaveLength(1);
  });

  it("getOrdersByRestaurantId filters by restaurant", async () => {
    (Order.find as jest.Mock).mockResolvedValueOnce([mockOrderDoc()]);
    await getOrdersByRestaurantId("rest-1");
    expect(Order.find).toHaveBeenCalledWith({ restaurantId: "rest-1" });
  });

  it("updateOrder returns null when old order does not exist", async () => {
    (Order.findById as jest.Mock).mockResolvedValueOnce(null);
    await expect(
      updateOrder("order-1", { status: "Delivered" }),
    ).resolves.toBeNull();
  });

  it("updateOrder returns null when update returns null", async () => {
    (Order.findById as jest.Mock).mockResolvedValueOnce(
      mockOrderDoc({ status: "Pending" }),
    );
    (Order.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(null);

    await expect(
      updateOrder("order-1", { status: "Delivered" }),
    ).resolves.toBeNull();
  });

  it("updateOrder sends notifications on status change", async () => {
    (Order.findById as jest.Mock).mockResolvedValueOnce(
      mockOrderDoc({ status: "Pending" }),
    );
    (Order.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(
      mockOrderDoc({ status: "Delivered" }),
    );

    const result = await updateOrder(
      "order-1",
      { status: "Delivered" },
      "u1@mail.com",
    );

    expect(sendOrderStatusEmail).toHaveBeenCalled();
    expect(sendOrderStatusSMS).toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  it("updateOrder does not fail if notification throws", async () => {
    (Order.findById as jest.Mock).mockResolvedValueOnce(
      mockOrderDoc({ status: "Pending" }),
    );
    (Order.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(
      mockOrderDoc({ status: "Delivered" }),
    );
    (sendOrderStatusSMS as jest.Mock).mockRejectedValueOnce(
      new Error("sms fail"),
    );

    await expect(
      updateOrder("order-1", { status: "Delivered" }, "u1@mail.com"),
    ).resolves.not.toBeNull();
  });

  it("deleteOrder returns null when missing", async () => {
    (Order.findById as jest.Mock).mockResolvedValueOnce(null);
    await expect(deleteOrder("missing")).resolves.toBeNull();
  });

  it("deleteOrder deletes existing order", async () => {
    (Order.findById as jest.Mock).mockResolvedValueOnce(mockOrderDoc());
    (Order.findByIdAndDelete as jest.Mock).mockResolvedValueOnce(
      mockOrderDoc(),
    );

    await expect(deleteOrder("order-1")).resolves.not.toBeNull();
    expect(Order.findByIdAndDelete).toHaveBeenCalledWith("order-1");
  });

  it("getOrdersByUserId filters by user", async () => {
    (Order.find as jest.Mock).mockResolvedValueOnce([mockOrderDoc()]);
    await getOrdersByUserId("user-1");
    expect(Order.find).toHaveBeenCalledWith({ userId: "user-1" });
  });

  it("processOrderPayment throws when order missing", async () => {
    (Order.findById as jest.Mock).mockResolvedValueOnce(null);
    await expect(
      processOrderPayment("order-x", { method: "card", transactionId: "tx-1" }),
    ).rejects.toThrow("Order not found");
  });

  it("processOrderPayment throws when already paid", async () => {
    (Order.findById as jest.Mock).mockResolvedValueOnce(
      mockOrderDoc({ paymentStatus: "Paid" }),
    );
    await expect(
      processOrderPayment("order-1", { method: "card", transactionId: "tx-1" }),
    ).rejects.toThrow("already paid");
  });

  it("processOrderPayment updates order", async () => {
    (Order.findById as jest.Mock).mockResolvedValueOnce(
      mockOrderDoc({ paymentStatus: "Unpaid" }),
    );
    (Order.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(
      mockOrderDoc({ paymentStatus: "Paid", status: "Confirmed" }),
    );

    const result = await processOrderPayment("order-1", {
      method: "card",
      transactionId: "tx-1",
    });

    expect(Order.findByIdAndUpdate).toHaveBeenCalled();
    expect(result?.paymentStatus).toBe("Paid");
  });

  it("updateOrderStatus returns null when order missing", async () => {
    (Order.findById as jest.Mock).mockResolvedValueOnce(null);
    await expect(updateOrderStatus("missing", "Delivered")).resolves.toBeNull();
  });

  it("updateOrderStatus updates and returns order", async () => {
    (Order.findById as jest.Mock).mockResolvedValueOnce(
      mockOrderDoc({ status: "Pending" }),
    );
    (Order.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(
      mockOrderDoc({ status: "Delivered" }),
    );

    const result = await updateOrderStatus("order-1", "Delivered");

    expect(Order.findByIdAndUpdate).toHaveBeenCalledWith(
      "order-1",
      { status: "Delivered" },
      { new: true },
    );
    expect(result?.status).toBe("Delivered");
  });
});
