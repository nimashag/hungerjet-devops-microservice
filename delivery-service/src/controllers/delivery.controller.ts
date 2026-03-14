import { Request, Response } from "express";
import { sendEmail } from "../services/email.service";
import {
  findAvailableDriver,
  markDriverAvailability,
} from "../services/driver.service";
import {
  createDelivery,
  findDeliveryByOrderId,
  updateDeliveryAcceptance,
  findAssignedDeliveriesForDriver,
  findAllDeliveriesForDriver,
  updateDeliveryStatusById,
} from "../services/delivery.service";
import { Driver } from "../models/driver.model";
import { Delivery, DeliveryDocument } from "../models/delivery.model";
import { httpClient } from "../utils/httpClient";
import { sendSMS } from "../services/sms.service";
import { logError, logInfo, logWarn } from "../utils/logger";
import dotenv from "dotenv";

dotenv.config();

const RESTAURANTS_SERVICE_URL =
  process.env.RESTAURANTS_SERVICE_URL ||
  process.env.RESTAURANT_SERVICE_URL ||
  "http://localhost:3001/api/restaurants";
const ORDER_SERVICE_BASE_URL =
  process.env.ORDERS_SERVICE_URL || "http://localhost:3002/api/orders";
const USER_SERVICE_BASE_URL =
  process.env.USERS_SERVICE_URL || "http://localhost:3003/api/auth";

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

const getValidatedUserId = (req: Request): string | null => {
  const userId = (req as any).user?.id;
  return typeof userId === "string" ? userId : null;
};

const normalizeLocation = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

type AssignmentAction = "accept" | "decline";

const isAssignmentAction = (value: unknown): value is AssignmentAction =>
  value === "accept" || value === "decline";

async function handleDeclinedAssignment(
  orderId: string,
  delivery: any,
): Promise<{ message: string; delivery: any }> {
  logInfo("delivery.assign.declined", { orderId });

  const orderRes = await httpClient.get(
    `${ORDER_SERVICE_BASE_URL}/${encodeURIComponent(orderId)}`,
  );
  const order = orderRes.data;

  const newDriver = await findAvailableDriver(
    delivery.restaurantLocation,
    order.deliveryAddress.city,
  );

  if (!newDriver) {
    logWarn("delivery.assign.reassign.none", { orderId });
    delivery.driverId = undefined;
    delivery.acceptStatus = "Pending";
    delivery.status = "Pending";
    await delivery.save();

    return {
      message: "No driver available to reassign. Delivery pending.",
      delivery,
    };
  }

  logInfo("delivery.assign.reassign.found", {
    orderId,
    newDriverId: newDriver._id.toString(),
  });

  delivery.driverId = newDriver._id.toString();
  delivery.acceptStatus = "Pending";
  delivery.status = "Assigned";
  await delivery.save();

  await markDriverAvailability(newDriver._id.toString(), false);

  return {
    message: "Delivery reassigned to another driver",
    delivery,
  };
}

async function notifyCustomerOnDeliveredStatus(
  updatedDelivery: any,
): Promise<"ok" | "invalid-delivery-record" | "invalid-order-record"> {
  const order = await fetchOrderForDeliveredNotification(updatedDelivery);
  if (!order) {
    return "invalid-delivery-record";
  }

  const user = await fetchUserForDeliveredNotification(order);
  if (!user) {
    return "invalid-order-record";
  }

  await sendDeliveredNotifications(updatedDelivery.orderId, order, user);

  return "ok";
}

async function fetchOrderForDeliveredNotification(
  updatedDelivery: any,
): Promise<Record<string, any> | null> {
  if (!SAFE_ID_PATTERN.test(updatedDelivery.orderId)) {
    logWarn("delivery.status.invalidOrderId", {
      orderId: updatedDelivery.orderId,
    });
    return null;
  }

  logInfo("delivery.status.fetchOrder.start", {
    orderId: updatedDelivery.orderId,
  });

  const orderRes = await httpClient.get(
    `${ORDER_SERVICE_BASE_URL}/${encodeURIComponent(updatedDelivery.orderId)}`,
  );

  logInfo("delivery.status.fetchOrder.success", {
    orderId: updatedDelivery.orderId,
  });

  return orderRes.data;
}

async function fetchUserForDeliveredNotification(
  order: Record<string, any>,
): Promise<Record<string, any> | null> {
  if (!SAFE_ID_PATTERN.test(String(order.userId))) {
    logWarn("delivery.status.invalidUserId", { userId: order.userId });
    return null;
  }

  const userRes = await httpClient.get(
    `${USER_SERVICE_BASE_URL}/${encodeURIComponent(order.userId)}`,
  );
  const user = userRes.data;

  logInfo("delivery.status.fetchUser.success", { userId: user._id });
  return user;
}

async function sendDeliveredNotifications(
  orderId: string,
  order: Record<string, any>,
  user: Record<string, any>,
): Promise<void> {
  const customerEmail = "dev40.emailtest@gmail.com";
  const customerName = user.name;
  const deliveryAddress = order.deliveryAddress;
  const customerPhone = "+94778964821";

  const subject = `Your Order with HungerJet has been Delivered!`;
  const text = `
        Hello ${customerName},\n\n
        We are happy to inform you that your order with HungerJet has been successfully delivered to your address: 
        ${deliveryAddress?.street}, ${deliveryAddress?.city}.\n\n
        Thank you for choosing HungerJet, and we look forward to serving you again soon!\n\n
        Best regards,\n
        HungerJet Team
      `;

  const message = `Hello, your order has been delivered to ${deliveryAddress?.street}, ${deliveryAddress?.city}. Thank you for choosing HungerJet!`;

  if (customerEmail) {
    logInfo("delivery.status.notify.email", {
      to: customerEmail,
      orderId,
    });
    await sendEmail(customerEmail, subject, text);
  }

  if (customerPhone) {
    logInfo("delivery.status.notify.sms", {
      to: customerPhone,
      orderId,
    });
    await sendSMS(customerPhone, message);
  }
}

async function backfillDeliveriesForPickupLocation(
  userId: string,
  driverId: string,
  normalizedPickupLocation: string,
): Promise<void> {
  try {
    const ordersRes = await httpClient.get(`${ORDER_SERVICE_BASE_URL}`);
    const allOrders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
    const waitingOrders = allOrders.filter(
      (order: any) => order?.status === "Waiting for Pickup",
    );

    let backfilledCount = 0;

    for (const order of waitingOrders) {
      const orderId = String(order?._id || "");
      const customerId = String(order?.userId || "");
      const restaurantId = String(order?.restaurantId || "");
      const deliveryCity = String(order?.deliveryAddress?.city || "");

      if (
        !orderId ||
        !customerId ||
        !restaurantId ||
        !deliveryCity ||
        !SAFE_ID_PATTERN.test(orderId) ||
        !SAFE_ID_PATTERN.test(customerId) ||
        !SAFE_ID_PATTERN.test(restaurantId)
      ) {
        continue;
      }

      const existingDelivery = await Delivery.findOne({ orderId });
      if (existingDelivery) {
        continue;
      }

      let restaurantLocation = "";
      try {
        const restaurantRes = await httpClient.get(
          `${RESTAURANTS_SERVICE_URL}/${encodeURIComponent(restaurantId)}`,
        );
        restaurantLocation = String(restaurantRes.data?.location || "");
      } catch (restaurantError) {
        logWarn("delivery.available_orders.backfill.restaurant_fetch_failed", {
          orderId,
          restaurantId,
          error: (restaurantError as Error).message,
        });
        continue;
      }

      if (normalizeLocation(restaurantLocation) !== normalizedPickupLocation) {
        continue;
      }

      await Delivery.create({
        orderId,
        customerId,
        restaurantLocation,
        deliveryLocation: deliveryCity,
        status: "Assigned",
        acceptStatus: "Pending",
      });
      backfilledCount += 1;
    }

    if (backfilledCount > 0) {
      logInfo("delivery.available_orders.backfill.created", {
        userId,
        driverId,
        count: backfilledCount,
      });
    }
  } catch (backfillError) {
    logWarn("delivery.available_orders.backfill.failed", {
      userId,
      driverId,
      error: (backfillError as Error).message,
    });
  }
}

type DeliveryEnhancementMode = "address-only" | "full";

function buildEnhancedDelivery(
  delivery: any,
  order: Record<string, any> | null,
  mode: DeliveryEnhancementMode,
) {
  const base = delivery.toObject();

  if (!order) {
    if (mode === "full") {
      return {
        ...base,
        deliveryAddress: null,
        paymentStatus: null,
        customerId: null,
        restaurantId: null,
        specialInstructions: "",
      };
    }

    return {
      ...base,
      deliveryAddress: null,
    };
  }

  if (mode === "full") {
    return {
      ...base,
      deliveryAddress: order.deliveryAddress || null,
      paymentStatus: order.paymentStatus || null,
      customerId: order.userId || null,
      restaurantId: order.restaurantId || null,
      specialInstructions: order.specialInstructions || "",
    };
  }

  return {
    ...base,
    deliveryAddress: order.deliveryAddress || null,
  };
}

/** Fetch an order safely; returns null when the orderId fails the
 * SAFE_ID_PATTERN guard or when the remote call throws. */
async function fetchOrderSafe(
  delivery: any,
  invalidLogKey: string,
  errorLogKey: string,
): Promise<Record<string, any> | null> {
  if (!SAFE_ID_PATTERN.test(delivery.orderId)) {
    logWarn(invalidLogKey, { orderId: delivery.orderId });
    return null;
  }
  try {
    const orderRes = await httpClient.get(
      `${ORDER_SERVICE_BASE_URL}/${encodeURIComponent(delivery.orderId)}`,
    );
    return orderRes.data;
  } catch (err) {
    logWarn(errorLogKey, {
      orderId: delivery.orderId,
      deliveryId: delivery._id?.toString(),
      error: (err as Error).message,
    });
    return null;
  }
}

export const assignDriverAutomatically = async (
  req: Request,
  res: Response,
) => {
  const { orderId, customerId, restaurantId } = req.body;

  if (
    typeof orderId !== "string" ||
    typeof customerId !== "string" ||
    typeof restaurantId !== "string"
  ) {
    return res.status(400).json({
      message:
        "Invalid input: orderId, customerId, and restaurantId must be strings",
    });
  }

  if (
    !SAFE_ID_PATTERN.test(orderId) ||
    !SAFE_ID_PATTERN.test(customerId) ||
    !SAFE_ID_PATTERN.test(restaurantId)
  ) {
    return res.status(400).json({ message: "Invalid ID format" });
  }

  logInfo("delivery.assign.auto.start", {
    orderId,
    customerId,
    restaurantId,
    requestId: req.requestId,
  });
  try {
    const restaurantRes = await httpClient.get(
      `${RESTAURANTS_SERVICE_URL}/${encodeURIComponent(restaurantId)}`,
    );
    const restaurant = restaurantRes.data;

    if (!restaurant.available)
      return res.status(400).json({ message: "Restaurant not available" });

    const orderRes = await httpClient.get(
      `${ORDER_SERVICE_BASE_URL}/${encodeURIComponent(orderId)}`,
    );
    const order = orderRes.data;

    const driver = await findAvailableDriver(
      restaurant.location,
      order.deliveryAddress.city,
    );

    if (!driver)
      return res.status(404).json({ message: "No matching driver available" });

    const delivery = await createDelivery({
      orderId,
      customerId,
      restaurantLocation: restaurant.location,
      deliveryLocation: order.deliveryAddress.city,
      driverId: driver._id.toString(),
    });

    await markDriverAvailability(driver._id.toString(), false);

    logInfo("delivery.assign.auto.success", {
      orderId,
      deliveryId: delivery._id,
      driverId: driver._id.toString(),
    });
    res.status(200).json({ message: "Driver assigned", delivery });
  } catch (error: any) {
    logError(
      "delivery.assign.auto.error",
      { orderId, customerId, restaurantId },
      error,
    );
    res
      .status(500)
      .json({ message: "Error assigning driver", error: error.message });
  }
};

export const respondToAssignment = async (req: Request, res: Response) => {
  const { orderId, action } = req.body;

  if (typeof orderId !== "string" || !orderId.trim()) {
    return res
      .status(400)
      .json({ message: "Invalid input: orderId must be a non-empty string" });
  }
  if (!SAFE_ID_PATTERN.test(orderId)) {
    return res.status(400).json({ message: "Invalid orderId format" });
  }
  if (!isAssignmentAction(action)) {
    return res.status(400).json({ message: "Invalid action" });
  }

  try {
    const userId = getValidatedUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const driver = await Driver.findOne({ userId });
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const delivery = await findDeliveryByOrderId(orderId);
    if (!delivery)
      return res.status(404).json({ message: "Delivery not found" });

    const currentDriverId = driver._id.toString();

    // Prevent one driver from changing another driver's assignment.
    if (delivery.driverId && delivery.driverId !== currentDriverId) {
      return res.status(403).json({
        message: "This order is assigned to another driver",
      });
    }

    // Claim this delivery for the currently authenticated driver on accept.
    if (action === "accept") {
      delivery.driverId = currentDriverId;
      delivery.status = "Assigned";
    }

    await updateDeliveryAcceptance(delivery, action);

    if (action === "accept") {
      await markDriverAvailability(currentDriverId, false);
    }

    if (action === "decline") {
      try {
        const result = await handleDeclinedAssignment(orderId, delivery);
        return res.status(200).json(result);
      } catch (error) {
        logError("delivery.assign.reassign.error", { orderId }, error as Error);
        return res.status(500).json({
          message: "Error reassigning delivery",
          error: (error as Error).message,
        });
      }
    }

    // Normal accept case
    return res
      .status(200)
      .json({ message: `Assignment ${action}ed`, delivery });
  } catch (error: any) {
    logError("delivery.assign.respond.error", { orderId, action }, error);
    res.status(500).json({
      message: "Error responding to assignment",
      error: error.message,
    });
  }
};
export const getAssignedOrders = async (req: Request, res: Response) => {
  try {
    const userId = getValidatedUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    logInfo("delivery.assigned.list.start", { userId });

    // 1️⃣ Find Driver by userId
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    logInfo("delivery.assigned.driver.found", {
      userId,
      driverId: driver._id.toString(),
    });

    // 2️⃣ Find assigned deliveries
    const deliveries = await findAssignedDeliveriesForDriver(
      driver._id.toString(),
    );

    // 3️⃣ Fetch full deliveryAddress for each order
    const enhancedDeliveries = await Promise.all(
      deliveries.map(async (delivery) => {
        const order = await fetchOrderSafe(
          delivery,
          "delivery.assigned.order.invalidId",
          "delivery.assigned.order.fetchFailed",
        );
        return buildEnhancedDelivery(delivery, order, "full");
      }),
    );

    res.status(200).json(enhancedDeliveries);
  } catch (error: any) {
    logError(
      "delivery.assigned.list.error",
      { userId: (req as any).user?.id },
      error,
    );
    res.status(500).json({
      message: "Error fetching assigned deliveries",
      error: error.message,
    });
  }
};

// ✅ Fetch All My Deliveries (Ongoing + Completed)
export const getMyDeliveries = async (req: Request, res: Response) => {
  try {
    const userId = getValidatedUserId(req);
    if (!userId) {
      logWarn("delivery.my_deliveries.unauthorized", {
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    logInfo("delivery.my_deliveries.start", { userId });
    const driver = await Driver.findOne({ userId });

    if (!driver) {
      logWarn("delivery.my_deliveries.driver_not_found", { userId });
      return res.status(404).json({ message: "Driver not found" });
    }

    logInfo("delivery.my_deliveries.driver.found", {
      userId,
      driverId: driver._id.toString(),
    });

    const deliveries = await findAllDeliveriesForDriver(driver._id.toString());

    logInfo("delivery.my_deliveries.fetching_orders", {
      userId,
      driverId: driver._id.toString(),
      deliveriesCount: deliveries.length,
    });

    const enhancedDeliveries = await Promise.all(
      deliveries.map(async (delivery) => {
        const order = await fetchOrderSafe(
          delivery,
          "delivery.my_deliveries.order.invalidId",
          "delivery.my_deliveries.order.fetch_failed",
        );
        return buildEnhancedDelivery(delivery, order, "address-only");
      }),
    );

    logInfo("delivery.my_deliveries.success", {
      userId,
      driverId: driver._id.toString(),
      count: enhancedDeliveries.length,
    });

    res.status(200).json(enhancedDeliveries);
  } catch (error: any) {
    logError(
      "delivery.my_deliveries.error",
      {
        userId: (req as any).user?.id,
      },
      error,
    );
    res
      .status(500)
      .json({ message: "Error fetching deliveries", error: error.message });
  }
};

// ✅ Update Delivery Status
export const updateDeliveryStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { deliveryId } = req.params;
    const { status } = req.body;

    logInfo("delivery.update_status.start", {
      deliveryId,
      userId,
      newStatus: status,
    });

    const allowedStatuses = ["PickedUp", "Delivered", "Cancelled"];
    if (!allowedStatuses.includes(status)) {
      logWarn("delivery.update_status.invalid_status", {
        deliveryId,
        userId,
        status,
        allowedStatuses,
      });
      return res.status(400).json({ message: "Invalid status" });
    }

    const updatedDelivery = await updateDeliveryStatusById(deliveryId, status);
    if (!updatedDelivery) {
      logWarn("delivery.update_status.not_found", {
        deliveryId,
        userId,
      });
      return res.status(404).json({ message: "Delivery not found" });
    }

    if (status === "Delivered") {
      const notificationResult =
        await notifyCustomerOnDeliveredStatus(updatedDelivery);
      if (notificationResult === "invalid-delivery-record") {
        return res.status(500).json({ message: "Invalid delivery record" });
      }
      if (notificationResult === "invalid-order-record") {
        return res.status(500).json({ message: "Invalid order record" });
      }
    }

    logInfo("delivery.update_status.success", {
      deliveryId,
      userId,
      orderId: updatedDelivery.orderId,
      status,
    });

    res.status(200).json({
      message: "Delivery status updated successfully",
      updatedDelivery,
    });
  } catch (error: any) {
    logError(
      "delivery.update_status.error",
      {
        deliveryId: req.params.deliveryId,
        userId: (req as any).user?.id,
        newStatus: req.body?.status,
      },
      error,
    );
    res.status(500).json({
      message: "Error updating delivery status",
      error: error.message,
    });
  }
};

// ✅ Get available orders matching driver's pickup location
export const getAvailableOrders = async (req: Request, res: Response) => {
  try {
    const userId = getValidatedUserId(req);
    if (!userId) {
      logWarn("delivery.available_orders.unauthorized", {
        reason: "No user in request",
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    logInfo("delivery.available_orders.start", { userId });

    // 1️⃣ Find Driver by userId to get their pickup location
    const driver = await Driver.findOne({ userId });
    if (!driver) {
      logWarn("delivery.available_orders.driver_not_found", { userId });
      return res.status(404).json({ message: "Driver not found" });
    }

    logInfo("delivery.available_orders.driver_found", {
      userId,
      driverId: driver._id.toString(),
      pickupLocation: driver.pickupLocation,
    });

    const normalizedPickupLocation = normalizeLocation(driver.pickupLocation);

    await backfillDeliveriesForPickupLocation(
      userId,
      driver._id.toString(),
      normalizedPickupLocation,
    );

    // 3️⃣ Find all assigned orders where restaurantLocation matches driver's pickupLocation
    const availableDeliveries = await Delivery.find()
      .where("status")
      .equals("Assigned")
      .where("acceptStatus")
      .equals("Pending");

    const locationMatchedDeliveries = availableDeliveries.filter(
      (delivery: DeliveryDocument) =>
        normalizeLocation(delivery.restaurantLocation) ===
        normalizedPickupLocation,
    );

    logInfo("delivery.available_orders.found", {
      userId,
      driverId: driver._id.toString(),
      count: locationMatchedDeliveries.length,
    });

    // 4️⃣ Enhance with order details
    const enhancedOrders = await Promise.all(
      locationMatchedDeliveries.map(async (delivery: DeliveryDocument) => {
        const order = await fetchOrderSafe(
          delivery,
          "delivery.available_orders.order.invalidId",
          "delivery.available_orders.order.fetchFailed",
        );
        return buildEnhancedDelivery(delivery, order, "full");
      }),
    );

    logInfo("delivery.available_orders.success", {
      userId,
      driverId: driver._id.toString(),
      count: enhancedOrders.length,
    });

    res.status(200).json(enhancedOrders);
  } catch (error: any) {
    logError(
      "delivery.available_orders.error",
      { userId: (req as any).user?.id },
      error,
    );
    res.status(500).json({
      message: "Error fetching available orders",
      error: error.message,
    });
  }
};
