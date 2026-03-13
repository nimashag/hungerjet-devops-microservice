import {
  addMenuItem,
  createRestaurant,
  getAllRestaurants,
  listMenuItems,
  toggleAvailability,
} from "./restaurants.service";
import { Restaurant } from "../models/restaurant.model";
import { MenuItem } from "../models/menuItem.model";

jest.mock("../models/restaurant.model", () => ({
  Restaurant: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.mock("../models/menuItem.model", () => ({
  MenuItem: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.mock("../utils/logger", () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
}));

describe("restaurants.service DB tests (mocked models)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("createRestaurant calls model create and getAllRestaurants returns mocked list", async () => {
    const userId = "507f191e810c19729de860ea";
    const createdRestaurant = {
      _id: { toString: () => "rest-1" },
      userId: { toString: () => userId },
      name: "Spice Villa",
    } as any;

    (Restaurant.create as jest.Mock).mockResolvedValue(createdRestaurant);
    (Restaurant.find as jest.Mock).mockResolvedValue([createdRestaurant]);

    const created = await createRestaurant(
      {
        name: "Spice Villa",
        address: "123 Main St",
        location: "Colombo",
        image: "spice.jpg",
      },
      userId,
    );

    expect(Restaurant.create).toHaveBeenCalledWith({
      name: "Spice Villa",
      address: "123 Main St",
      location: "Colombo",
      image: "spice.jpg",
      userId,
    });
    expect(created.name).toBe("Spice Villa");
    expect(created.userId.toString()).toBe(userId);

    const all = await getAllRestaurants();
    expect(Restaurant.find).toHaveBeenCalledTimes(1);
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("Spice Villa");
  });

  it("toggleAvailability flips availability", async () => {
    const restaurantDoc = {
      _id: { toString: () => "rest-2" },
      available: false,
      save: jest.fn().mockResolvedValue({
        _id: { toString: () => "rest-2" },
        available: true,
      }),
    } as any;

    (Restaurant.findById as jest.Mock).mockResolvedValue(restaurantDoc);

    const toggled = await toggleAvailability("rest-2");

    expect(Restaurant.findById).toHaveBeenCalledWith("rest-2");
    expect(restaurantDoc.save).toHaveBeenCalledTimes(1);
    expect(toggled).not.toBeNull();
    expect(toggled?.available).toBe(true);
  });

  it("addMenuItem creates menu item and listMenuItems returns mocked items", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const restaurantId = "507f191e810c19729de860ff";
    const createdItem = {
      _id: { toString: () => "menu-1" },
      restaurantId: { toString: () => restaurantId },
      name: "Margherita",
    } as any;

    (MenuItem.create as jest.Mock).mockResolvedValue(createdItem);
    (MenuItem.find as jest.Mock).mockResolvedValue([createdItem]);

    const item = await addMenuItem(restaurantId, {
      name: "Margherita",
      description: "Classic cheese pizza",
      price: 1800,
      category: "Pizza",
      image: "margherita.jpg",
      userId,
    });

    expect(MenuItem.create).toHaveBeenCalledWith({
      name: "Margherita",
      description: "Classic cheese pizza",
      price: 1800,
      category: "Pizza",
      image: "margherita.jpg",
      userId,
      restaurantId,
    });
    expect(item.name).toBe("Margherita");

    const items = await listMenuItems(restaurantId);
    expect(MenuItem.find).toHaveBeenCalledWith({ restaurantId });
    expect(items).toHaveLength(1);
    expect(items[0].restaurantId?.toString()).toBe(restaurantId);
    expect(items[0].name).toBe("Margherita");
  });
});
