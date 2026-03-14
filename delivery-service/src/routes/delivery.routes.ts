import { Router } from "express";
import {
  assignDriverAutomatically,
  respondToAssignment,
  getAssignedOrders,
  getMyDeliveries,
  updateDeliveryStatus,
  getAvailableOrders,
} from "../controllers/delivery.controller";
import { authenticate } from "../middleware/auth"; // <--- correct path
import { authorizeRoles } from "../middleware/authorize"; // <--- correct path

const router = Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "delivery-service",
    timestamp: new Date().toISOString(),
  });
});

// Admin/system will assign driver (no role restriction, just authenticated)
router.post("/assign", authenticate, assignDriverAutomatically);

// Driver only can respond to assignment
router.post(
  "/respond",
  authenticate,
  authorizeRoles("deliveryPersonnel"),
  respondToAssignment,
);

// Driver only can view assigned orders
router.get(
  "/assigned-orders",
  authenticate,
  authorizeRoles("deliveryPersonnel"),
  getAssignedOrders,
);

// ✅ Get available orders matching driver's pickup location
router.get(
  "/available-orders",
  authenticate,
  authorizeRoles("deliveryPersonnel"),
  getAvailableOrders,
);

// ✅ Fetch all deliveries for my dashboard
router.get(
  "/my-deliveries",
  authenticate,
  authorizeRoles("deliveryPersonnel"),
  getMyDeliveries,
);

// ✅ Update delivery status (PickedUp, Delivered, Cancelled)
router.patch(
  "/delivery/:deliveryId/status",
  authenticate,
  authorizeRoles("deliveryPersonnel"),
  updateDeliveryStatus,
);

export default router;
