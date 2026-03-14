import {
  addMenuItem,
  createRestaurant,
  deleteMenuItem,
  deleteRestaurant,
  getAllRestaurants,
  getOneMenuItem,
  getMenuItemsByUser,
  getRestaurantById,
  getRestaurantByUserId,
  listMenuItems,
  toggleAvailability,
  updateMenuItem,
  updateRestaurant,
} from "../../services/restaurants.service";
import { Restaurant } from "../../models/restaurant.model";
import { MenuItem } from "../../models/menuItem.model";

jest.mock("../../models/restaurant.model", () => ({
  Restaurant: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.mock("../../models/menuItem.model", () => ({
  MenuItem: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.mock("../../utils/logger", () => ({
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

// ─── Error branches for already-tested functions ───────────────────────────────
describe("restaurants.service – error branches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("createRestaurant rethrows on model error", async () => {
    (Restaurant.create as jest.Mock).mockRejectedValueOnce(
      new Error("db fail"),
    );
    await expect(createRestaurant({ name: "X" }, "uid")).rejects.toThrow(
      "db fail",
    );
  });

  it("getAllRestaurants rethrows on model error", async () => {
    (Restaurant.find as jest.Mock).mockRejectedValueOnce(new Error("db fail"));
    await expect(getAllRestaurants()).rejects.toThrow("db fail");
  });

  it("toggleAvailability returns null when restaurant not found", async () => {
    (Restaurant.findById as jest.Mock).mockResolvedValueOnce(null);
    const result = await toggleAvailability("nonexistent-id");
    expect(result).toBeNull();
  });

  it("toggleAvailability rethrows on model error", async () => {
    (Restaurant.findById as jest.Mock).mockRejectedValueOnce(
      new Error("db fail"),
    );
    await expect(toggleAvailability("id")).rejects.toThrow("db fail");
  });

  it("addMenuItem rethrows on model error", async () => {
    (MenuItem.create as jest.Mock).mockRejectedValueOnce(new Error("db fail"));
    await expect(addMenuItem("rid", { name: "X" })).rejects.toThrow("db fail");
  });

  it("listMenuItems rethrows on model error", async () => {
    (MenuItem.find as jest.Mock).mockRejectedValueOnce(new Error("db fail"));
    await expect(listMenuItems("rid")).rejects.toThrow("db fail");
  });
});

// ─── getRestaurantById ────────────────────────────────────────────────────────
describe("getRestaurantById", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the restaurant when found", async () => {
    const doc = {
      _id: { toString: () => "rest-1" },
      name: "Pizza Palace",
      available: true,
    };
    (Restaurant.findById as jest.Mock).mockResolvedValueOnce(doc);
    const result = await getRestaurantById("rest-1");
    expect(Restaurant.findById).toHaveBeenCalledWith("rest-1");
    expect(result).toEqual(doc);
  });

  it("returns null when restaurant is not found", async () => {
    (Restaurant.findById as jest.Mock).mockResolvedValueOnce(null);
    const result = await getRestaurantById("missing-id");
    expect(result).toBeNull();
  });

  it("rethrows on model error", async () => {
    (Restaurant.findById as jest.Mock).mockRejectedValueOnce(
      new Error("db fail"),
    );
    await expect(getRestaurantById("id")).rejects.toThrow("db fail");
  });
});

// ─── getRestaurantByUserId ────────────────────────────────────────────────────
describe("getRestaurantByUserId", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns list of restaurants for user", async () => {
    const docs = [
      { _id: { toString: () => "r1" }, userId: "uid-1", name: "Spice" },
    ];
    (Restaurant.find as jest.Mock).mockResolvedValueOnce(docs);
    const result = await getRestaurantByUserId("uid-1");
    expect(Restaurant.find).toHaveBeenCalledWith({ userId: "uid-1" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Spice");
  });

  it("returns empty array when user has no restaurants", async () => {
    (Restaurant.find as jest.Mock).mockResolvedValueOnce([]);
    const result = await getRestaurantByUserId("uid-none");
    expect(result).toHaveLength(0);
  });

  it("rethrows on model error", async () => {
    (Restaurant.find as jest.Mock).mockRejectedValueOnce(new Error("db fail"));
    await expect(getRestaurantByUserId("uid")).rejects.toThrow("db fail");
  });
});

// ─── updateRestaurant ─────────────────────────────────────────────────────────
describe("updateRestaurant", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns updated restaurant on success", async () => {
    const updated = {
      _id: { toString: () => "r1" },
      name: "New Name",
      available: true,
    };
    (Restaurant.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(updated);
    const result = await updateRestaurant("r1", { name: "New Name" });
    expect(Restaurant.findByIdAndUpdate).toHaveBeenCalledWith(
      "r1",
      { name: "New Name" },
      { new: true },
    );
    expect(result).toEqual(updated);
  });

  it("returns null when restaurant not found", async () => {
    (Restaurant.findByIdAndUpdate as jest.Mock).mockResolvedValueOnce(null);
    const result = await updateRestaurant("missing", { name: "X" });
    expect(result).toBeNull();
  });

  it("rethrows on model error", async () => {
    (Restaurant.findByIdAndUpdate as jest.Mock).mockRejectedValueOnce(
      new Error("db fail"),
    );
    await expect(updateRestaurant("id", {})).rejects.toThrow("db fail");
  });
});

// ─── deleteRestaurant ─────────────────────────────────────────────────────────
describe("deleteRestaurant", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the deleted restaurant on success", async () => {
    const deleted = { _id: { toString: () => "r1" }, name: "Deleted Place" };
    (Restaurant.findByIdAndDelete as jest.Mock).mockResolvedValueOnce(deleted);
    const result = await deleteRestaurant("r1");
    expect(Restaurant.findByIdAndDelete).toHaveBeenCalledWith("r1");
    expect(result).toEqual(deleted);
  });

  it("returns null when restaurant not found", async () => {
    (Restaurant.findByIdAndDelete as jest.Mock).mockResolvedValueOnce(null);
    const result = await deleteRestaurant("missing");
    expect(result).toBeNull();
  });

  it("rethrows on model error", async () => {
    (Restaurant.findByIdAndDelete as jest.Mock).mockRejectedValueOnce(
      new Error("db fail"),
    );
    await expect(deleteRestaurant("id")).rejects.toThrow("db fail");
  });
});

// ─── getOneMenuItem ───────────────────────────────────────────────────────────
describe("getOneMenuItem", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the menu item when found", async () => {
    const item = {
      _id: { toString: () => "m1" },
      name: "Burger",
      restaurantId: { toString: () => "r1" },
    };
    (MenuItem.findById as jest.Mock).mockResolvedValueOnce(item);
    const result = await getOneMenuItem("m1");
    expect(MenuItem.findById).toHaveBeenCalledWith("m1");
    expect(result?.name).toBe("Burger");
  });

  it("returns null when item not found", async () => {
    (MenuItem.findById as jest.Mock).mockResolvedValueOnce(null);
    const result = await getOneMenuItem("missing");
    expect(result).toBeNull();
  });

  it("rethrows on model error", async () => {
    (MenuItem.findById as jest.Mock).mockRejectedValueOnce(
      new Error("db fail"),
    );
    await expect(getOneMenuItem("id")).rejects.toThrow("db fail");
  });

  it("handles missing restaurantId on success path", async () => {
    const item = {
      _id: { toString: () => "m2" },
      name: "Burger",
      restaurantId: undefined,
    };
    (MenuItem.findById as jest.Mock).mockResolvedValueOnce(item);
    const result = await getOneMenuItem("m2");
    expect(result).toEqual(item);
  });
});

// ─── getMenuItemsByUser ───────────────────────────────────────────────────────
describe("getMenuItemsByUser", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns items for the user", async () => {
    const items = [
      { _id: { toString: () => "m1" }, name: "Wrap", userId: "uid-1" },
    ];
    (MenuItem.find as jest.Mock).mockResolvedValueOnce(items);
    const result = await getMenuItemsByUser("uid-1");
    expect(MenuItem.find).toHaveBeenCalledWith({ userId: "uid-1" });
    expect(result).toHaveLength(1);
  });

  it("returns empty array when user has no items", async () => {
    (MenuItem.find as jest.Mock).mockResolvedValueOnce([]);
    const result = await getMenuItemsByUser("uid-none");
    expect(result).toHaveLength(0);
  });

  it("rethrows on model error", async () => {
    (MenuItem.find as jest.Mock).mockRejectedValueOnce(new Error("db fail"));
    await expect(getMenuItemsByUser("uid")).rejects.toThrow("db fail");
  });
});

// ─── updateMenuItem ───────────────────────────────────────────────────────────
describe("updateMenuItem", () => {
  beforeEach(() => jest.clearAllMocks());

  it("updates and returns the saved item when found", async () => {
    const saved = { _id: { toString: () => "m1" }, name: "Updated Burger" };
    const existingItem = {
      name: "Burger",
      description: "Old desc",
      price: 500,
      category: "Main",
      image: "old.jpg",
      save: jest.fn().mockResolvedValueOnce(saved),
    };
    (MenuItem.findById as jest.Mock).mockResolvedValueOnce(existingItem);
    const result = await updateMenuItem("m1", {
      name: "Updated Burger",
      price: 600,
    });
    expect(existingItem.name).toBe("Updated Burger");
    expect(existingItem.price).toBe(600);
    expect(existingItem.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual(saved);
  });

  it("only updates provided fields (partial update)", async () => {
    const saved = {
      _id: { toString: () => "m2" },
      name: "Original",
      price: 300,
    };
    const existingItem = {
      name: "Original",
      description: "Desc",
      price: 300,
      category: "Side",
      image: "img.jpg",
      save: jest.fn().mockResolvedValueOnce(saved),
    };
    (MenuItem.findById as jest.Mock).mockResolvedValueOnce(existingItem);
    // Only update category
    await updateMenuItem("m2", { category: "Main" });
    expect(existingItem.name).toBe("Original");
    expect(existingItem.category).toBe("Main");
  });

  it("updates description and image when provided", async () => {
    const saved = { _id: { toString: () => "m3" }, name: "Burger" };
    const existingItem = {
      name: "Burger",
      description: "Old",
      price: 500,
      category: "Main",
      image: "old.jpg",
      save: jest.fn().mockResolvedValueOnce(saved),
    };
    (MenuItem.findById as jest.Mock).mockResolvedValueOnce(existingItem);

    await updateMenuItem("m3", {
      description: "New description",
      image: "new.jpg",
    });

    expect(existingItem.description).toBe("New description");
    expect(existingItem.image).toBe("new.jpg");
  });

  it("does not overwrite price when price is 0", async () => {
    const saved = { _id: { toString: () => "m4" }, name: "Burger", price: 500 };
    const existingItem = {
      name: "Burger",
      description: "Desc",
      price: 500,
      category: "Main",
      image: "img.jpg",
      save: jest.fn().mockResolvedValueOnce(saved),
    };
    (MenuItem.findById as jest.Mock).mockResolvedValueOnce(existingItem);

    await updateMenuItem("m4", { price: 0 });
    expect(existingItem.price).toBe(500);
  });

  it("returns null when item not found", async () => {
    (MenuItem.findById as jest.Mock).mockResolvedValueOnce(null);
    const result = await updateMenuItem("missing", { name: "X" });
    expect(result).toBeNull();
  });

  it("rethrows on model error", async () => {
    (MenuItem.findById as jest.Mock).mockRejectedValueOnce(
      new Error("db fail"),
    );
    await expect(updateMenuItem("id", {})).rejects.toThrow("db fail");
  });
});

// ─── deleteMenuItem ───────────────────────────────────────────────────────────
describe("deleteMenuItem", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the deleted item on success", async () => {
    const deleted = {
      _id: { toString: () => "m1" },
      name: "Deleted",
      restaurantId: { toString: () => "r1" },
    };
    (MenuItem.findByIdAndDelete as jest.Mock).mockResolvedValueOnce(deleted);
    const result = await deleteMenuItem("m1");
    expect(MenuItem.findByIdAndDelete).toHaveBeenCalledWith("m1");
    expect(result).toEqual(deleted);
  });

  it("returns null when item not found", async () => {
    (MenuItem.findByIdAndDelete as jest.Mock).mockResolvedValueOnce(null);
    const result = await deleteMenuItem("missing");
    expect(result).toBeNull();
  });

  it("rethrows on model error", async () => {
    (MenuItem.findByIdAndDelete as jest.Mock).mockRejectedValueOnce(
      new Error("db fail"),
    );
    await expect(deleteMenuItem("id")).rejects.toThrow("db fail");
  });

  it("handles missing restaurantId on deleted item", async () => {
    const deleted = {
      _id: { toString: () => "m2" },
      name: "Deleted",
      restaurantId: undefined,
    };
    (MenuItem.findByIdAndDelete as jest.Mock).mockResolvedValueOnce(deleted);
    const result = await deleteMenuItem("m2");
    expect(result).toEqual(deleted);
  });
});
