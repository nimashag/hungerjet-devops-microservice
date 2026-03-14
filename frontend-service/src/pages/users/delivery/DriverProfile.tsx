import DriverLayout from "./DriverLayout";
import { useState, useEffect } from "react";
import {
  getDriverProfile,
  updateDriverProfile,
} from "../../../services/deliveryService";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

interface DriverProfileData {
  pickupLocation: string;
  deliveryLocations: string[];
  vehicleRegNumber?: string;
  mobileNumber?: string;
  isAvailable: boolean;
}

const getDeliveryLocations = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value;
  }
  return [];
};

const getAvailabilityBadgeClass = (isAvailable: boolean): string => {
  if (isAvailable) {
    return "bg-green-500";
  }
  return "bg-red-500";
};

const getAvailabilityLabel = (isAvailable: boolean): string => {
  if (isAvailable) {
    return "✓ Available";
  }
  return "✗ Unavailable";
};

const getSaveButtonLabel = (isSaving: boolean): string => {
  if (isSaving) {
    return "Saving...";
  }
  return "Save Changes";
};

const DriverProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DriverProfileData>({
    pickupLocation: "",
    deliveryLocations: [],
    vehicleRegNumber: "",
    mobileNumber: "",
    isAvailable: false,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await getDriverProfile();
        console.log("Driver Profile:", res.data);
        setProfile({
          pickupLocation: res.data.pickupLocation || "",
          deliveryLocations: getDeliveryLocations(res.data.deliveryLocations),
          vehicleRegNumber: res.data.vehicleRegNumber || "",
          mobileNumber: res.data.mobileNumber || "",
          isAvailable: res.data.isAvailable || false,
        });
      } catch (error: any) {
        console.error("Error fetching driver profile", error);
        if (error.response?.status === 404) {
          toast.info(
            "Driver profile not found. Please complete registration first.",
          );
          navigate("/driver/register-profile");
          return;
        }
        toast.error("Failed to load your profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (field: string, value: any) => {
    if (field === "deliveryLocations") {
      setProfile({
        ...profile,
        [field]: value
          .split(",")
          .map((loc: string) => loc.trim())
          .filter((loc: string) => loc !== ""),
      });
    } else {
      setProfile({
        ...profile,
        [field]: value,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile.pickupLocation.trim()) {
      toast.error("Pickup location is required");
      return;
    }

    try {
      setIsSaving(true);
      await updateDriverProfile({
        pickupLocation: profile.pickupLocation,
        deliveryLocations: profile.deliveryLocations,
        isAvailable: profile.isAvailable,
      });
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error updating profile", error);
      if (error.response?.status === 404) {
        toast.info(
          "Driver profile not found. Please complete registration first.",
        );
        navigate("/driver/register-profile");
        return;
      }
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <DriverLayout>
        <div className="text-center py-8">
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </DriverLayout>
    );
  }

  const renderDeliveryLocations = () => {
    if (profile.deliveryLocations.length === 0) {
      return <p className="text-gray-600">No service areas defined</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {profile.deliveryLocations.map((loc, idx) => (
          <span
            key={idx}
            className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm"
          >
            {loc}
          </span>
        ))}
      </div>
    );
  };

  const renderProfileContent = () => {
    if (isEditing) {
      return (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Pickup Location *
            </label>
            <input
              type="text"
              value={profile.pickupLocation}
              onChange={(e) => handleChange("pickupLocation", e.target.value)}
              placeholder="e.g., Malabe, Colombo, Kandy"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This location determines which orders you'll see
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Service Areas (comma separated)
            </label>
            <input
              type="text"
              value={profile.deliveryLocations.join(", ")}
              onChange={(e) =>
                handleChange("deliveryLocations", e.target.value)
              }
              placeholder="e.g., Colombo City, Nugegoda, Maharagama"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Availability
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={profile.isAvailable}
                onChange={(e) => handleChange("isAvailable", e.target.checked)}
                className="h-5 w-5 text-indigo-500 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-gray-700">
                Available to receive delivery orders
              </span>
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
            >
              {getSaveButtonLabel(isSaving)}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </form>
      );
    }

    return (
      <div className="space-y-6">
        <div className="border-b pb-4">
          <p className="text-sm text-gray-500 font-semibold">PICKUP LOCATION</p>
          <p className="text-lg text-gray-800 mt-2">
            {profile.pickupLocation || "Not set"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            📍 Orders will only show if their pickup location matches this
          </p>
        </div>

        <div className="border-b pb-4">
          <p className="text-sm text-gray-500 font-semibold">SERVICE AREAS</p>
          <div className="mt-2">{renderDeliveryLocations()}</div>
        </div>

        <div className="border-b pb-4">
          <p className="text-sm text-gray-500 font-semibold">AVAILABILITY</p>
          <p className="text-lg mt-2">
            <span
              className={`px-3 py-1 rounded-full text-white ${getAvailabilityBadgeClass(profile.isAvailable)}`}
            >
              {getAvailabilityLabel(profile.isAvailable)}
            </span>
          </p>
        </div>

        <div className="border-b pb-4">
          <p className="text-sm text-gray-500 font-semibold">VEHICLE</p>
          <p className="text-lg text-gray-800 mt-2">
            {profile.vehicleRegNumber || "Not set"}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500 font-semibold">MOBILE NUMBER</p>
          <p className="text-lg text-gray-800 mt-2">
            {profile.mobileNumber || "Not set"}
          </p>
        </div>
      </div>
    );
  };

  return (
    <DriverLayout>
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6 text-indigo-600">
          Driver Profile
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Your Information
            </h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded"
              >
                Edit Profile
              </button>
            )}
          </div>

          {renderProfileContent()}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> Update your pickup location to areas where
            restaurants are located. Only orders from restaurants at your pickup
            location will appear in "Available Orders".
          </p>
        </div>
      </div>
    </DriverLayout>
  );
};

export default DriverProfile;
