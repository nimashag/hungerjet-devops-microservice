import { Delivery, DeliveryDocument } from '../models/delivery.model';
import { logInfo, logWarn, logError } from '../utils/logger';

// ✅ Strict type for allowed statuses
export type DeliveryStatus = 'Pending' | 'Assigned' | 'PickedUp' | 'Delivered' | 'Cancelled';

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

const isSafeQueryId = (value: unknown): value is string =>
  typeof value === 'string' && SAFE_ID_PATTERN.test(value);

// ✅ Create new delivery
export const createDelivery = async (data: {
  orderId: string;
  customerId: string;
  restaurantLocation: string;
  deliveryLocation: string;
  driverId: string;
}): Promise<DeliveryDocument> => {
  logInfo("delivery.service.create.start", {
    orderId: data.orderId,
    customerId: data.customerId,
    driverId: data.driverId,
    restaurantLocation: data.restaurantLocation,
    deliveryLocation: data.deliveryLocation,
  });

  try {
    const delivery = new Delivery({
      ...data,
      status: 'Assigned',    // Default when assigned
      acceptStatus: 'Pending',  // Pending acceptance by driver
    });
    const saved = await delivery.save();
    
    logInfo("delivery.service.create.success", {
      deliveryId: saved._id.toString(),
      orderId: data.orderId,
      driverId: data.driverId,
      status: saved.status,
      acceptStatus: saved.acceptStatus,
    });
    
    return saved;
  } catch (err) {
    logError("delivery.service.create.error", {
      orderId: data.orderId,
      driverId: data.driverId,
    }, err as Error);
    throw err;
  }
};

// ✅ Find delivery by order ID
export const findDeliveryByOrderId = async (orderId: string): Promise<DeliveryDocument | null> => {
  logInfo("delivery.service.find_by_order.start", { orderId });
  if (!isSafeQueryId(orderId)) {
    logWarn("delivery.service.find_by_order.invalid_id", { orderId });
    return null;
  }
  try {
    const delivery = await Delivery.findOne().where("orderId").equals(orderId);
    if (!delivery) {
      logWarn("delivery.service.find_by_order.not_found", { orderId });
      return null;
    }
    logInfo("delivery.service.find_by_order.success", {
      orderId,
      deliveryId: delivery._id.toString(),
      driverId: delivery.driverId?.toString() || "none",
      status: delivery.status,
    });
    return delivery;
  } catch (err) {
    logError("delivery.service.find_by_order.error", { orderId }, err as Error);
    throw err;
  }
};

// ✅ Handle driver response (accept/decline)
export const updateDeliveryAcceptance = async (delivery: DeliveryDocument, action: 'accept' | 'decline'): Promise<void> => {
  logInfo("delivery.service.update_acceptance.start", {
    deliveryId: delivery._id.toString(),
    orderId: delivery.orderId,
    driverId: delivery.driverId?.toString() || "none",
    action,
    currentAcceptStatus: delivery.acceptStatus,
  });

  try {
    if (action === 'accept') {
      delivery.acceptStatus = 'Accepted';
      logInfo("delivery.service.update_acceptance.accepted", {
        deliveryId: delivery._id.toString(),
        orderId: delivery.orderId,
        driverId: delivery.driverId?.toString() || "none",
      });
    } else {
      const oldDriverId = delivery.driverId?.toString() || "none";
      delivery.acceptStatus = 'Declined';
      delivery.driverId = undefined;
      delivery.status = 'Pending'; // Reset status if declined
      logInfo("delivery.service.update_acceptance.declined", {
        deliveryId: delivery._id.toString(),
        orderId: delivery.orderId,
        oldDriverId,
      });
    }
    await delivery.save();
    
    logInfo("delivery.service.update_acceptance.success", {
      deliveryId: delivery._id.toString(),
      orderId: delivery.orderId,
      acceptStatus: delivery.acceptStatus,
      status: delivery.status,
    });
  } catch (err) {
    logError("delivery.service.update_acceptance.error", {
      deliveryId: delivery._id.toString(),
      orderId: delivery.orderId,
      action,
    }, err as Error);
    throw err;
  }
};

// ✅ Find assigned deliveries for a driver (Pending acceptance)
export const findAssignedDeliveriesForDriver = async (driverId: string): Promise<DeliveryDocument[]> => {
  logInfo("delivery.service.find_assigned.start", { driverId });
  if (!isSafeQueryId(driverId)) {
    logWarn("delivery.service.find_assigned.invalid_driver", { driverId });
    return [];
  }
  try {
    const deliveries = await Delivery.find()
      .where("driverId")
      .equals(driverId)
      .where("status")
      .equals('Assigned')
      .where("acceptStatus")
      .equals('Pending');
    logInfo("delivery.service.find_assigned.success", {
      driverId,
      count: deliveries.length,
    });
    return deliveries;
  } catch (err) {
    logError("delivery.service.find_assigned.error", { driverId }, err as Error);
    throw err;
  }
};

// ✅ Fetch all deliveries for driver (Ongoing + Completed)
export const findAllDeliveriesForDriver = async (driverId: string): Promise<DeliveryDocument[]> => {
  logInfo("delivery.service.find_all_for_driver.start", { driverId });
  if (!isSafeQueryId(driverId)) {
    logWarn("delivery.service.find_all_for_driver.invalid_driver", { driverId });
    return [];
  }
  try {
    const deliveries = await Delivery.find().where("driverId").equals(driverId);
    logInfo("delivery.service.find_all_for_driver.success", {
      driverId,
      count: deliveries.length,
    });
    return deliveries;
  } catch (err) {
    logError("delivery.service.find_all_for_driver.error", { driverId }, err as Error);
    throw err;
  }
};

// ✅ Update delivery status safely
export const updateDeliveryStatusById = async (deliveryId: string, status: DeliveryStatus): Promise<DeliveryDocument | null> => {
  logInfo("delivery.service.update_status.start", {
    deliveryId,
    newStatus: status,
  });

  try {
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      logWarn("delivery.service.update_status.not_found", { deliveryId });
      return null;
    }

    const oldStatus = delivery.status;
    delivery.status = status; // Now type-safe ✅
    await delivery.save();
    
    logInfo("delivery.service.update_status.success", {
      deliveryId,
      orderId: delivery.orderId,
      oldStatus,
      newStatus: status,
      driverId: delivery.driverId?.toString() || "none",
    });
    
    return delivery;
  } catch (err) {
    logError("delivery.service.update_status.error", {
      deliveryId,
      newStatus: status,
    }, err as Error);
    throw err;
  }
};
