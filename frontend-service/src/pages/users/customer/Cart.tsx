import React, { useState, useEffect } from "react";
import { useCart } from "../../../contexts/CartContext";
import Navbar from "../../../components/Navbar";
import httpClient from "../../../utils/httpClient";
import { useNavigate } from "react-router-dom";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  MapPin,
  FileText,
  CreditCard,
} from "lucide-react";
import { orderUrl } from "../../../api";

const Cart: React.FC = () => {
  const { cartItems, clearCart, updateItemQuantity, removeItem } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [deliveryAddress, setDeliveryAddress] = useState({
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  });
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);

  const totalAmount = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  useEffect(() => {
    const { street, city, state, zipCode, country } = deliveryAddress;
    setIsFormValid(!!(street && city && state && zipCode && country));
  }, [deliveryAddress]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDeliveryAddress((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleConfirmOrder = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      if (!token) {
        setError("Unauthorized. Please log in.");
        return;
      }

      const restaurantId = localStorage.getItem("selectedRestaurantId");
      if (!restaurantId) {
        setError("Invalid restaurant ID.");
        return;
      }

      const res = await httpClient.post(
        `${orderUrl}/api/orders`,
        {
          restaurantId,
          items: cartItems,
          totalAmount,
          deliveryAddress,
          paymentStatus: "Pending",
          paymentMethod: "Stripe",
          specialInstructions,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const createdOrder = res.data;
      if (createdOrder && createdOrder._id) {
        localStorage.setItem("latestOrderId", createdOrder._id);
        clearCart();
        navigate(`/order/${createdOrder._id}`);
      } else {
        throw new Error("Invalid order response from server");
      }
    } catch (error) {
      console.error("Failed to place order", error);
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleIncreaseQuantity = (menuItemId: string, currentQty: number) => {
    updateItemQuantity(menuItemId, currentQty + 1);
  };

  const handleDecreaseQuantity = (menuItemId: string, currentQty: number) => {
    if (currentQty > 1) {
      updateItemQuantity(menuItemId, currentQty - 1);
    } else {
      updateItemQuantity(menuItemId, 0);
    }
  };

  const handleRemoveItem = (menuItemId: string) => {
    removeItem(menuItemId);
  };

  const handleAddMoreItems = () => {
    const restaurantId = localStorage.getItem("selectedRestaurantId");
    if (restaurantId) {
      navigate(`/restaurants/${restaurantId}`);
    }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 md:p-10 bg-white rounded-2xl shadow-lg mt-10">
        <div className="flex items-center gap-3 border-b pb-6 mb-10">
          <ShoppingBag className="text-orange-500" size={30} />
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">
            Your Cart
          </h1>
        </div>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ShoppingBag size={64} className="text-gray-300 mb-6" />
            <p className="text-gray-500 text-lg mb-6">
              Your cart is feeling lonely!
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-8 py-3 bg-orange-500 text-white font-semibold rounded-full hover:bg-orange-600 transition-all"
            >
              Browse Restaurants
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Cart Items */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              <div className="rounded-xl bg-gray-50 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">
                  Order Items
                </h2>
                <ul className="flex flex-col gap-6">
                  {cartItems.map((item) => (
                    <li
                      key={item.menuItemId}
                      className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm"
                    >
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          ${item.price.toFixed(2)} each
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center border rounded-full shadow-sm overflow-hidden">
                          <button
                            onClick={() =>
                              handleDecreaseQuantity(
                                item.menuItemId,
                                item.quantity,
                              )
                            }
                            className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="px-4">{item.quantity}</span>
                          <button
                            onClick={() =>
                              handleIncreaseQuantity(
                                item.menuItemId,
                                item.quantity,
                              )
                            }
                            className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        <span className="font-bold text-gray-800">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>

                        <button
                          onClick={() => handleRemoveItem(item.menuItemId)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex justify-between items-center">
                  <button
                    onClick={handleAddMoreItems}
                    className="px-6 py-2 text-orange-500 border border-orange-500 rounded-full hover:bg-orange-50 transition-all"
                  >
                    + Add More Items
                  </button>
                  <div className="text-lg font-bold text-gray-700">
                    Subtotal: ${totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Delivery Information */}
              <div className="rounded-xl bg-gray-50 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <MapPin size={20} className="text-gray-700" />
                  <h2 className="text-xl font-bold text-gray-800">
                    Delivery Information
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {["street", "city", "state", "zipCode", "country"].map(
                    (field) => {
                      const fieldId = `delivery-${field}`;

                      return (
                        <div key={field}>
                          <label className="block mb-1 text-sm font-semibold text-gray-600 capitalize">
                            {field === "zipCode" ? "ZIP Code" : field}
                            <input
                              id={fieldId}
                              type="text"
                              name={field}
                              value={
                                deliveryAddress[
                                  field as keyof typeof deliveryAddress
                                ]
                              }
                              onChange={handleInputChange}
                              className="w-full mt-1 border-gray-300 rounded-lg p-2 shadow-sm focus:ring-orange-400 focus:border-orange-400"
                              placeholder={field}
                            />
                          </label>
                        </div>
                      );
                    },
                  )}
                </div>

                <div className="mt-6">
                  <label
                    htmlFor="special-instructions"
                    className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-600"
                  >
                    <FileText size={18} className="text-gray-600" />
                    <span>Special Instructions</span>
                  </label>
                  <textarea
                    id="special-instructions"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="w-full p-3 rounded-lg border-gray-300 shadow-sm focus:ring-orange-400 focus:border-orange-400"
                    rows={3}
                    placeholder="e.g., No onions, ring the bell, call on arrival..."
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-xl p-6 sticky top-28">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <CreditCard size={20} /> Order Summary
              </h2>

              <div className="flex flex-col gap-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Delivery Fee</span>
                  <span>$3.99</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (8%)</span>
                  <span>${(totalAmount * 0.08).toFixed(2)}</span>
                </div>
                <div className="border-t pt-4 flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>
                    ${(totalAmount + 3.99 + totalAmount * 0.08).toFixed(2)}
                  </span>
                </div>
              </div>

              {error && (
                <div className="bg-red-100 border border-red-300 text-red-700 p-3 rounded-md mb-6 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleConfirmOrder}
                disabled={loading || !isFormValid}
                className={`w-full py-3 rounded-full font-bold text-white ${
                  isFormValid && !loading
                    ? "bg-orange-500 hover:bg-orange-600"
                    : "bg-gray-300 cursor-not-allowed"
                } transition-all`}
              >
                {loading ? "Processing..." : "Place Order"}
              </button>

              <p className="text-xs text-center text-gray-400 mt-4">
                By ordering, you agree to our Terms of Service and Privacy
                Policy.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Cart;
