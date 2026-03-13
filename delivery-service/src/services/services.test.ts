jest.mock("../models/delivery.model", () => {
  const Delivery = jest.fn().mockImplementation((data) => ({
    ...data,
    _id: { toString: () => "delivery-1" },
    save: jest.fn().mockResolvedValue({
      ...data,
      _id: { toString: () => "delivery-1" },
      status: data.status,
      acceptStatus: data.acceptStatus,
    }),
  }));

  (Delivery as any).findOne = jest.fn();
  (Delivery as any).find = jest.fn();
  (Delivery as any).findById = jest.fn();

  return { Delivery };
});

jest.mock("../models/driver.model", () => {
  const Driver = jest.fn().mockImplementation((data) => ({
    ...data,
    _id: { toString: () => "driver-1" },
    save: jest
      .fn()
      .mockResolvedValue({ ...data, _id: { toString: () => "driver-1" } }),
  }));

  (Driver as any).findOne = jest.fn();
  (Driver as any).findById = jest.fn();
  (Driver as any).findByIdAndUpdate = jest.fn();

  return { Driver };
});

jest.mock("../utils/logger", () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

import { Delivery } from "../models/delivery.model";
import { Driver } from "../models/driver.model";
import {
  createDelivery,
  findDeliveryByOrderId,
  updateDeliveryAcceptance,
  findAssignedDeliveriesForDriver,
  findAllDeliveriesForDriver,
  updateDeliveryStatusById,
} from "./delivery.service";
import {
  findDriverByUserId,
  createDriver,
  updateDriverProfile,
  findAvailableDriver,
  markDriverAvailability,
} from "./driver.service";

const chainWithSingle = (value: unknown) => ({
  where: jest.fn().mockReturnThis(),
  equals: jest.fn().mockResolvedValue(value),
});

describe("delivery and driver services", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("delivery.service", () => {
    it("createDelivery persists with default status and acceptStatus", async () => {
      const result = await createDelivery({
        orderId: "order_1",
        customerId: "customer_1",
        restaurantLocation: "Colombo",
        deliveryLocation: "Galle",
        driverId: "driver_1",
      });

      expect(Delivery).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "Assigned",
          acceptStatus: "Pending",
        }),
      );
      expect(result.status).toBe("Assigned");
    });

    it("findDeliveryByOrderId returns null for unsafe id", async () => {
      await expect(findDeliveryByOrderId("../bad")).resolves.toBeNull();
    });

    it("findDeliveryByOrderId resolves delivery via query chain", async () => {
      const delivery = {
        _id: { toString: () => "d1" },
        driverId: { toString: () => "drv" },
        status: "Assigned",
      };
      (Delivery.findOne as jest.Mock).mockReturnValueOnce(
        chainWithSingle(delivery),
      );

      await expect(findDeliveryByOrderId("order_1")).resolves.toBe(delivery);
    });

    it("updateDeliveryAcceptance handles accept", async () => {
      const delivery: any = {
        _id: { toString: () => "d1" },
        orderId: "order_1",
        driverId: { toString: () => "driver_1" },
        acceptStatus: "Pending",
        status: "Assigned",
        save: jest.fn().mockResolvedValue(undefined),
      };

      await updateDeliveryAcceptance(delivery, "accept");

      expect(delivery.acceptStatus).toBe("Accepted");
      expect(delivery.save).toHaveBeenCalled();
    });

    it("updateDeliveryAcceptance handles decline", async () => {
      const delivery: any = {
        _id: { toString: () => "d1" },
        orderId: "order_1",
        driverId: { toString: () => "driver_1" },
        acceptStatus: "Pending",
        status: "Assigned",
        save: jest.fn().mockResolvedValue(undefined),
      };

      await updateDeliveryAcceptance(delivery, "decline");

      expect(delivery.acceptStatus).toBe("Declined");
      expect(delivery.status).toBe("Pending");
      expect(delivery.driverId).toBeUndefined();
    });

    it("findAssignedDeliveriesForDriver returns [] for unsafe id", async () => {
      await expect(
        findAssignedDeliveriesForDriver("bad/path"),
      ).resolves.toEqual([]);
    });

    it("findAssignedDeliveriesForDriver returns assigned deliveries", async () => {
      const deliveries = [{ _id: "d1" }];
      const chain: any = {
        where: jest.fn().mockReturnThis(),
        equals: jest.fn(),
      };
      chain.equals
        .mockImplementationOnce(() => chain)
        .mockImplementationOnce(() => chain)
        .mockImplementationOnce(() => Promise.resolve(deliveries));
      (Delivery.find as jest.Mock).mockReturnValueOnce(chain);

      await expect(findAssignedDeliveriesForDriver("driver_1")).resolves.toBe(
        deliveries,
      );
    });

    it("findAllDeliveriesForDriver returns [] for unsafe id", async () => {
      await expect(findAllDeliveriesForDriver("../bad")).resolves.toEqual([]);
    });

    it("findAllDeliveriesForDriver returns all deliveries", async () => {
      const deliveries = [{ _id: "d1" }];
      (Delivery.find as jest.Mock).mockReturnValueOnce(
        chainWithSingle(deliveries),
      );

      await expect(findAllDeliveriesForDriver("driver_1")).resolves.toBe(
        deliveries,
      );
    });

    it("updateDeliveryStatusById returns null when missing", async () => {
      (Delivery.findById as jest.Mock).mockResolvedValueOnce(null);
      await expect(
        updateDeliveryStatusById("d1", "Delivered"),
      ).resolves.toBeNull();
    });

    it("updateDeliveryStatusById updates status", async () => {
      const delivery: any = {
        _id: { toString: () => "d1" },
        orderId: "order_1",
        driverId: { toString: () => "driver_1" },
        status: "Assigned",
        save: jest.fn().mockResolvedValue(undefined),
      };
      (Delivery.findById as jest.Mock).mockResolvedValueOnce(delivery);

      const result = await updateDeliveryStatusById("d1", "Delivered");

      expect(delivery.status).toBe("Delivered");
      expect(delivery.save).toHaveBeenCalled();
      expect(result).toBe(delivery);
    });
  });

  describe("driver.service", () => {
    it("findDriverByUserId returns null when not found", async () => {
      (Driver.findOne as jest.Mock).mockResolvedValueOnce(null);
      await expect(findDriverByUserId("user_1")).resolves.toBeNull();
    });

    it("findDriverByUserId returns driver", async () => {
      const driver = {
        _id: { toString: () => "driver_1" },
        isAvailable: true,
        pickupLocation: "Colombo",
      };
      (Driver.findOne as jest.Mock).mockResolvedValueOnce(driver);
      await expect(findDriverByUserId("user_1")).resolves.toBe(driver);
    });

    it("createDriver saves driver", async () => {
      const result = await createDriver({
        userId: "user_1",
        pickupLocation: "Colombo",
        deliveryLocations: ["Galle"],
        vehicleRegNumber: "ABC-1234",
        mobileNumber: "0771234567",
      });

      expect(Driver).toHaveBeenCalled();
      expect(result._id.toString()).toBe("driver-1");
    });

    it("updateDriverProfile returns null when missing", async () => {
      (Driver.findOne as jest.Mock).mockResolvedValueOnce(null);
      await expect(
        updateDriverProfile("user_1", { pickupLocation: "Kandy" } as any),
      ).resolves.toBeNull();
    });

    it("updateDriverProfile applies updates", async () => {
      const driver: any = {
        _id: { toString: () => "driver_1" },
        isAvailable: true,
        save: jest.fn().mockResolvedValue(undefined),
      };
      (Driver.findOne as jest.Mock).mockResolvedValueOnce(driver);

      const result = await updateDriverProfile("user_1", {
        pickupLocation: "Kandy",
      } as any);

      expect(driver.save).toHaveBeenCalled();
      expect(result).toBe(driver);
    });

    it("findAvailableDriver returns null when none matches", async () => {
      (Driver.findOne as jest.Mock).mockResolvedValueOnce(null);
      await expect(findAvailableDriver("Colombo", "Galle")).resolves.toBeNull();
    });

    it("findAvailableDriver returns matching driver", async () => {
      const driver = {
        _id: { toString: () => "driver_1" },
        vehicleRegNumber: "ABC",
      };
      (Driver.findOne as jest.Mock).mockResolvedValueOnce(driver);
      await expect(findAvailableDriver("Colombo", "Galle")).resolves.toBe(
        driver,
      );
    });

    it("markDriverAvailability no-ops when driver not found", async () => {
      (Driver.findById as jest.Mock).mockResolvedValueOnce(null);
      await expect(
        markDriverAvailability("driver_1", false),
      ).resolves.toBeUndefined();
    });

    it("markDriverAvailability updates when driver exists", async () => {
      const driver = { _id: { toString: () => "driver_1" }, isAvailable: true };
      (Driver.findById as jest.Mock).mockResolvedValueOnce(driver);
      (Driver.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(undefined);

      await markDriverAvailability("driver_1", false);

      expect(Driver.findByIdAndUpdate).toHaveBeenCalledWith("driver_1", {
        isAvailable: false,
      });
    });
  });
});
