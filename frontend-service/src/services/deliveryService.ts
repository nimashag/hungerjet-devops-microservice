import httpClient from "../utils/httpClient";
import { deliveryUrl } from "../api";

const getStoredToken = (): string | null => {
  const tokenKeys = ["token", "authToken", "accessToken"];

  for (const key of tokenKeys) {
    const value = localStorage.getItem(key);
    if (value && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

const getAuthHeaders = () => {
  const token = getStoredToken();

  if (!token) {
    throw new Error("AUTH_TOKEN_MISSING");
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

/**
 * Fetch assigned orders (pending acceptance)
 */
export const fetchAssignedOrders = async () => {
  return httpClient.get(
    `${deliveryUrl}/api/delivery/assigned-orders`,
    getAuthHeaders(),
  );
};

/**
 * Fetch available orders matching driver's pickup location
 */
export const fetchAvailableOrders = async () => {
  return httpClient.get(
    `${deliveryUrl}/api/delivery/available-orders`,
    getAuthHeaders(),
  );
};

/**
 * Respond to order assignment (accept or decline)
 */
export const respondToAssignment = async (
  orderId: string,
  action: "accept" | "decline",
) => {
  return httpClient.post(
    `${deliveryUrl}/api/delivery/respond`,
    { orderId, action },
    getAuthHeaders(),
  );
};

/**
 * Get all deliveries for driver (ongoing + completed)
 */
export const fetchMyDeliveries = async () => {
  return httpClient.get(
    `${deliveryUrl}/api/delivery/my-deliveries`,
    getAuthHeaders(),
  );
};

/**
 * Update delivery status (PickedUp, Delivered, Cancelled)
 */
export const updateDeliveryStatus = async (
  deliveryId: string,
  status: "PickedUp" | "Delivered" | "Cancelled",
) => {
  return httpClient.patch(
    `${deliveryUrl}/api/delivery/delivery/${deliveryId}/status`,
    { status },
    getAuthHeaders(),
  );
};

/**
 * Get driver profile
 */
export const getDriverProfile = async () => {
  return httpClient.get(`${deliveryUrl}/api/drivers/me`, getAuthHeaders());
};

/**
 * Update driver profile (location, availability, etc.)
 */
export const updateDriverProfile = async (data: any) => {
  return httpClient.patch(
    `${deliveryUrl}/api/drivers/me`,
    data,
    getAuthHeaders(),
  );
};

/**
 * Register a new driver profile
 */
export const registerDriverProfile = async (formData: FormData) => {
  const token = getStoredToken();
  if (!token) {
    throw new Error("AUTH_TOKEN_MISSING");
  }

  return httpClient.post(`${deliveryUrl}/api/drivers/register`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
};
