import DriverLayout from "./DriverLayout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchAvailableOrders,
  respondToAssignment,
} from "../../../services/deliveryService";
import { toast } from "react-toastify";

interface AvailableOrder {
  _id: string;
  orderId: string;
  restaurantLocation: string;
  deliveryLocation: string;
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  status: string;
  acceptStatus: string;
  customerId?: string;
  restaurantId?: string;
  specialInstructions?: string;
}

const DriverDashboard = () => {
  const [orders, setOrders] = useState<AvailableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("Driver Token:", token);

    if (!token) {
      console.log("No token found! Redirecting to login.");
      navigate("/login/delivery");
      return;
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetchAvailableOrders();
        console.log("Available orders:", res.data);
        setOrders(res.data);
      } catch (error: any) {
        console.error("Error fetching orders", error);
        if (
          error.message === "AUTH_TOKEN_MISSING" ||
          error.response?.status === 401
        ) {
          toast.error("Your session expired. Please login again.");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login/delivery");
          return;
        }
        if (error.response?.status === 404) {
          toast.info(
            "Driver profile not found. Please complete registration first.",
          );
          navigate("/driver/register-profile");
          return;
        }
        setError(
          error.response?.data?.message || "Failed to load available orders",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [navigate]);

  const handleResponse = async (
    orderId: string,
    action: "accept" | "decline",
  ) => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.log("No token found while responding. Redirecting to login.");
      navigate("/login/delivery");
      return;
    }

    try {
      await respondToAssignment(orderId, action);
      console.log(`Order ${orderId} ${action}ed successfully`);

      // Remove the order from the list
      setOrders((prev) => prev.filter((order) => order.orderId !== orderId));

      // Show success message
      let message = "Order declined successfully";
      if (action === "accept") {
        message = 'Order accepted! You can view it in "My Deliveries"';
      }
      alert(message);
    } catch (error: any) {
      console.error("Error responding to assignment", error);
      if (
        error.message === "AUTH_TOKEN_MISSING" ||
        error.response?.status === 401
      ) {
        toast.error("Your session expired. Please login again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login/delivery");
        return;
      }
      alert(
        "Failed to respond to order: " +
          (error.response?.data?.message || "Unknown error"),
      );
    }
  };

  if (loading) {
    return (
      <DriverLayout>
        <div className="text-center py-8">
          <p className="text-gray-600">Loading available orders...</p>
        </div>
      </DriverLayout>
    );
  }

  const renderOrders = () => {
    if (orders.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600 text-lg">
            No available orders at your location right now.
          </p>
          <p className="text-gray-500 mt-2">
            Check back soon or update your pickup location in your profile.
          </p>
        </div>
      );
    }

    return (
      <div className="grid gap-6">
        {orders.map((order) => (
          <div
            key={order._id}
            className="border-l-4 border-indigo-600 bg-white p-6 rounded shadow-md hover:shadow-lg transition"
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">PICKUP LOCATION</p>
                <p className="text-lg font-semibold text-gray-800">
                  {order.restaurantLocation}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">DELIVERY LOCATION</p>
                <p className="text-lg font-semibold text-gray-800">
                  {order.deliveryAddress?.city || order.deliveryLocation}
                </p>
              </div>
            </div>

            {order.deliveryAddress && (
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">
                  <strong>Delivery Address:</strong>{" "}
                  {order.deliveryAddress.street}, {order.deliveryAddress.city}
                </p>
              </div>
            )}

            {order.specialInstructions && (
              <div className="mb-4 p-3 bg-yellow-50 rounded">
                <p className="text-sm text-gray-600">
                  <strong>Special Instructions:</strong>{" "}
                  {order.specialInstructions}
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleResponse(order.orderId, "accept")}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded transition"
              >
                ✓ Accept Order
              </button>
              <button
                onClick={() => handleResponse(order.orderId, "decline")}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded transition"
              >
                ✕ Decline Order
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <DriverLayout>
      <div className="p-6">
        <h2 className="text-3xl font-bold mb-6 text-indigo-600">
          Available Orders
        </h2>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {renderOrders()}
      </div>
    </DriverLayout>
  );
};

export default DriverDashboard;
