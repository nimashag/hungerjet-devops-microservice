import { useEffect, useState } from 'react';
import DriverLayout from './DriverLayout';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { fetchMyDeliveries, updateDeliveryStatus } from '../../../services/deliveryService';
import { useNavigate } from 'react-router-dom';

interface Delivery {
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
  status: 'Pending' | 'Assigned' | 'PickedUp' | 'Delivered' | 'Cancelled';
  acceptStatus: 'Pending' | 'Accepted' | 'Declined';
}

const DriverMyDeliveries = () => {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalDeliveryId, setModalDeliveryId] = useState<string | null>(null);
  const [modalAction, setModalAction] = useState<'PickedUp' | 'Delivered' | 'Cancelled' | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        setLoading(true);
        const res = await fetchMyDeliveries();
        console.log('My Deliveries:', res.data);
        setDeliveries(res.data);
      } catch (error: any) {
        console.error('Error fetching deliveries', error);
        if (error.response?.status === 404) {
          toast.info('Driver profile not found. Please complete registration first.');
          navigate('/driver/register-profile');
          return;
        }
        toast.error('Failed to fetch deliveries.');
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveries();
  }, [navigate]);

  const confirmAction = (deliveryId: string, action: 'PickedUp' | 'Delivered' | 'Cancelled') => {
    setModalDeliveryId(deliveryId);
    setModalAction(action);
    setShowModal(true);
  };

  const handleConfirmedUpdate = async () => {
    if (!modalDeliveryId || !modalAction) return;
    try {
      setIsUpdating(true);
      await updateDeliveryStatus(modalDeliveryId, modalAction);
      toast.success(`Delivery marked as ${modalAction}`);
      
      // Update the delivery in the list
      setDeliveries((prev) =>
        prev.map((d) =>
          d._id === modalDeliveryId
            ? { ...d, status: modalAction as Delivery['status'] }
            : d
        )
      );
    } catch (error: any) {
      console.error('Error updating delivery status', error);
      toast.error(error.response?.data?.message || 'Failed to update delivery status.');
    } finally {
      setShowModal(false);
      setIsUpdating(false);
    }
  };

  const ongoingDeliveries = deliveries.filter(
    (d) => d.acceptStatus === 'Accepted' && d.status !== 'Delivered' && d.status !== 'Cancelled'
  );

  const completedDeliveries = deliveries.filter(
    (d) => d.status === 'Delivered' || d.status === 'Cancelled'
  );

  const statusBadge = (status: Delivery['status']) => {
    switch (status) {
      case 'Assigned':
        return <span className="inline-block bg-yellow-300 text-yellow-900 px-3 py-1 rounded-full text-xs font-semibold">Assigned</span>;
      case 'PickedUp':
        return <span className="inline-block bg-blue-300 text-blue-900 px-3 py-1 rounded-full text-xs font-semibold">Picked Up</span>;
      case 'Delivered':
        return <span className="inline-block bg-green-300 text-green-900 px-3 py-1 rounded-full text-xs font-semibold">Delivered</span>;
      case 'Cancelled':
        return <span className="inline-block bg-red-300 text-red-900 px-3 py-1 rounded-full text-xs font-semibold">Cancelled</span>;
      default:
        return null;
    }
  };

  if (loading) return (
    <DriverLayout>
      <div className="text-center py-8">
        <p className="text-gray-600">Loading deliveries...</p>
      </div>
    </DriverLayout>
  );

  return (
    <DriverLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6 text-center text-indigo-600">My Deliveries</h1>

        {/* Ongoing Deliveries */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Ongoing Deliveries ({ongoingDeliveries.length})</h2>
          {ongoingDeliveries.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded text-gray-600">
              No ongoing deliveries at the moment. New deliveries will appear here.
            </div>
          ) : (
            <div className="grid gap-6">
              {ongoingDeliveries.map((delivery) => (
                <div key={delivery._id} className="border-l-4 border-blue-600 bg-white p-6 rounded shadow-md hover:shadow-lg transition">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500 font-semibold">PICKUP</p>
                      <p className="text-lg font-semibold text-gray-800">{delivery.restaurantLocation}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-semibold">STATUS</p>
                      {statusBadge(delivery.status)}
                    </div>
                  </div>

                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">
                      <strong>Delivery To:</strong> {delivery.deliveryAddress?.street}, {delivery.deliveryAddress?.city || delivery.deliveryLocation}
                    </p>
                  </div>

                  <div className="flex gap-3 mt-6 flex-wrap">
                    {delivery.status === 'Assigned' && (
                      <button
                        onClick={() => confirmAction(delivery._id, 'PickedUp')}
                        className="flex-1 min-w-[150px] bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-semibold transition"
                      >
                        Mark Picked Up
                      </button>
                    )}
                    {delivery.status === 'PickedUp' && (
                      <button
                        onClick={() => confirmAction(delivery._id, 'Delivered')}
                        className="flex-1 min-w-[150px] bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded font-semibold transition"
                      >
                        Mark Delivered
                      </button>
                    )}
                    <button
                      onClick={() => confirmAction(delivery._id, 'Cancelled')}
                      className="flex-1 min-w-[150px] bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-semibold transition"
                    >
                      Cancel Delivery
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Completed Deliveries */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Completed Deliveries ({completedDeliveries.length})</h2>
          {completedDeliveries.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded text-gray-600">
              No completed deliveries yet.
            </div>
          ) : (
            <div className="grid gap-6">
              {completedDeliveries.map((delivery) => (
                <div key={delivery._id} className="border-l-4 border-gray-400 bg-gray-50 p-6 rounded shadow-sm">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500 font-semibold">PICKUP</p>
                      <p className="text-lg font-semibold text-gray-800">{delivery.restaurantLocation}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-semibold">STATUS</p>
                      {statusBadge(delivery.status)}
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded">
                    <p className="text-sm text-gray-600">
                      <strong>Delivery To:</strong> {delivery.deliveryAddress?.street}, {delivery.deliveryAddress?.city || delivery.deliveryLocation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ✅ Custom Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-md text-center w-80">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                {modalAction === 'PickedUp' 
                  ? '📦 Confirm Pick Up' 
                  : modalAction === 'Delivered' 
                  ? '✓ Confirm Delivery' 
                  : '✕ Cancel Delivery'}
              </h2>
              <p className="mb-6 text-gray-700">
                Are you sure you want to mark this delivery as <strong>{modalAction}</strong>?
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleConfirmedUpdate}
                  disabled={isUpdating}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded font-semibold transition"
                >
                  {isUpdating ? 'Updating...' : 'Yes, Confirm'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={isUpdating}
                  className="bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 text-white px-6 py-2 rounded font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DriverLayout>
  );
};

export default DriverMyDeliveries;
