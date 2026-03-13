import { Request, Response } from "express";
import * as controller from "../../controllers/restaurants.controller";
import * as restaurantsService from "../../services/restaurants.service";

jest.mock("../../services/restaurants.service");
jest.mock("../../utils/logger", () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
}));

const mockedService = restaurantsService as jest.Mocked<
  typeof restaurantsService
>;

const createMockResponse = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res as Response);
  res.json = jest.fn().mockReturnValue(res as Response);
  res.send = jest.fn().mockReturnValue(res as Response);
  return res as Response;
};

describe("restaurants.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("returns 401 when user is missing", async () => {
      const req = {
        body: { name: "R", address: "A", location: "L" },
      } as any;
      const res = createMockResponse();

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
      expect(mockedService.createRestaurant).not.toHaveBeenCalled();
    });

    it("creates restaurant when request is valid", async () => {
      const req = {
        user: { id: "user-1" },
        body: { name: "R", address: "A", location: "L" },
        file: { filename: "img.png" },
      } as any;
      const res = createMockResponse();

      const created = { _id: { toString: () => "rest-1" }, name: "R" } as any;
      mockedService.createRestaurant.mockResolvedValue(created);

      await controller.create(req, res);

      expect(mockedService.createRestaurant).toHaveBeenCalledWith(
        { name: "R", address: "A", location: "L", image: "img.png" },
        "user-1",
      );
      expect(res.json).toHaveBeenCalledWith(created);
    });

    it("returns 500 when service throws", async () => {
      const req = {
        user: { id: "user-1" },
        body: { name: "R", address: "A", location: "L" },
      } as any;
      const res = createMockResponse();

      mockedService.createRestaurant.mockRejectedValue(
        new Error("create failed"),
      );

      await controller.create(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Something went wrong",
      });
    });
  });

  describe("list", () => {
    it("returns all restaurants", async () => {
      const req = {} as Request;
      const res = createMockResponse();
      const restaurants = [{ _id: "r1", name: "Cafe" }] as any;

      mockedService.getAllRestaurants.mockResolvedValue(restaurants);

      await controller.list(req, res);

      expect(res.json).toHaveBeenCalledWith(restaurants);
    });

    it("returns 500 when service throws", async () => {
      const req = {} as Request;
      const res = createMockResponse();

      mockedService.getAllRestaurants.mockRejectedValue(
        new Error("list failed"),
      );

      await controller.list(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Something went wrong",
      });
    });
  });

  describe("getOne", () => {
    it("returns 400 for invalid ObjectId cast errors", async () => {
      const req = { params: { id: "bad-id" } } as unknown as Request;
      const res = createMockResponse();

      mockedService.getRestaurantById.mockRejectedValue({ name: "CastError" });

      await controller.getOne(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid restaurant ID format",
      });
    });

    it("returns 404 when restaurant does not exist", async () => {
      const req = { params: { id: "rest-404" } } as unknown as Request;
      const res = createMockResponse();

      mockedService.getRestaurantById.mockResolvedValue(null as any);

      await controller.getOne(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Restaurant not found",
      });
    });

    it("returns restaurant when found", async () => {
      const req = { params: { id: "rest-1" } } as unknown as Request;
      const res = createMockResponse();
      const restaurant = { _id: "rest-1", name: "Cafe Blue" } as any;

      mockedService.getRestaurantById.mockResolvedValue(restaurant);

      await controller.getOne(req, res);

      expect(res.json).toHaveBeenCalledWith(restaurant);
    });

    it("returns 500 for unexpected errors", async () => {
      const req = { params: { id: "rest-500" } } as unknown as Request;
      const res = createMockResponse();

      mockedService.getRestaurantById.mockRejectedValue(new Error("boom"));

      await controller.getOne(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Something went wrong",
      });
    });
  });

  describe("getByUser", () => {
    it("returns 401 when user is missing", async () => {
      const req = {} as any;
      const res = createMockResponse();

      await controller.getByUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
      expect(mockedService.getRestaurantByUserId).not.toHaveBeenCalled();
    });

    it("returns restaurants for the authenticated user", async () => {
      const req = { user: { id: "user-1" } } as any;
      const res = createMockResponse();
      const restaurants = [{ _id: "r1", userId: "user-1" }] as any;

      mockedService.getRestaurantByUserId.mockResolvedValue(restaurants);

      await controller.getByUser(req, res);

      expect(mockedService.getRestaurantByUserId).toHaveBeenCalledWith(
        "user-1",
      );
      expect(res.json).toHaveBeenCalledWith(restaurants);
    });

    it("returns 500 when service throws", async () => {
      const req = { user: { id: "user-1" } } as any;
      const res = createMockResponse();

      mockedService.getRestaurantByUserId.mockRejectedValue(new Error("boom"));

      await controller.getByUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Something went wrong",
      });
    });
  });

  describe("toggleAvailability", () => {
    it("returns 401 when user is missing", async () => {
      const req = { params: { id: "rest-1" } } as any;
      const res = createMockResponse();

      await controller.toggleAvailability(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });

    it("returns 404 when restaurant is not found", async () => {
      const req = {
        user: { id: "user-1" },
        params: { id: "rest-404" },
      } as any;
      const res = createMockResponse();

      mockedService.toggleAvailability.mockResolvedValue(null as any);

      await controller.toggleAvailability(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Restaurant not found",
      });
    });

    it("returns updated restaurant when toggle succeeds", async () => {
      const req = {
        user: { id: "user-1" },
        params: { id: "rest-1" },
      } as any;
      const res = createMockResponse();
      const updated = { _id: "rest-1", available: true } as any;

      mockedService.toggleAvailability.mockResolvedValue(updated);

      await controller.toggleAvailability(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });

  describe("update", () => {
    it("returns 401 when user is missing", async () => {
      const req = { params: { id: "rest-1" }, body: { name: "R" } } as any;
      const res = createMockResponse();

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });

    it("passes uploaded image in update payload", async () => {
      const req = {
        user: { id: "user-1" },
        params: { id: "rest-1" },
        body: { name: "Updated" },
        file: { filename: "new.png" },
      } as any;
      const res = createMockResponse();
      const updated = {
        _id: "rest-1",
        name: "Updated",
        image: "new.png",
      } as any;

      mockedService.updateRestaurant.mockResolvedValue(updated);

      await controller.update(req, res);

      expect(mockedService.updateRestaurant).toHaveBeenCalledWith(
        "rest-1",
        expect.objectContaining({ name: "Updated", image: "new.png" }),
      );
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it("returns 404 when restaurant is not found", async () => {
      const req = {
        user: { id: "user-1" },
        params: { id: "rest-404" },
        body: { name: "Updated" },
      } as any;
      const res = createMockResponse();

      mockedService.updateRestaurant.mockResolvedValue(null as any);

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Restaurant not found",
      });
    });

    it("returns 500 when service throws", async () => {
      const req = {
        user: { id: "user-1" },
        params: { id: "rest-1" },
        body: { name: "Updated" },
      } as any;
      const res = createMockResponse();

      mockedService.updateRestaurant.mockRejectedValue(
        new Error("update failed"),
      );

      await controller.update(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Something went wrong",
      });
    });
  });

  describe("listMenuItems", () => {
    it("returns menu items for restaurant", async () => {
      const req = { params: { id: "rest-1" } } as unknown as Request;
      const res = createMockResponse();

      const items = [{ _id: "m1", name: "Burger" }] as any;
      mockedService.listMenuItems.mockResolvedValue(items);

      await controller.listMenuItems(req, res);

      expect(mockedService.listMenuItems).toHaveBeenCalledWith("rest-1");
      expect(res.json).toHaveBeenCalledWith(items);
    });

    it("propagates errors when listMenuItems service rejects", async () => {
      const req = { params: { id: "rest-1" } } as unknown as Request;
      const res = createMockResponse();

      mockedService.listMenuItems.mockRejectedValue(
        new Error("list items failed"),
      );

      await expect(controller.listMenuItems(req, res)).rejects.toThrow(
        "list items failed",
      );
    });
  });

  describe("remove", () => {
    it("returns 401 when user is missing", async () => {
      const req = { params: { id: "rest-1" } } as any;
      const res = createMockResponse();

      await controller.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });

    it("returns 204 when delete succeeds", async () => {
      const req = { user: { id: "user-1" }, params: { id: "rest-1" } } as any;
      const res = createMockResponse();

      mockedService.deleteRestaurant.mockResolvedValue({
        _id: "rest-1",
        name: "R",
      } as any);

      await controller.remove(req, res);

      expect(mockedService.deleteRestaurant).toHaveBeenCalledWith("rest-1");
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("returns 404 when restaurant is missing", async () => {
      const req = { user: { id: "user-1" }, params: { id: "rest-404" } } as any;
      const res = createMockResponse();

      mockedService.deleteRestaurant.mockResolvedValue(null as any);

      await controller.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Restaurant not found",
      });
    });

    it("returns 500 when service throws", async () => {
      const req = { user: { id: "user-1" }, params: { id: "rest-1" } } as any;
      const res = createMockResponse();

      mockedService.deleteRestaurant.mockRejectedValue(
        new Error("delete failed"),
      );

      await controller.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Something went wrong",
      });
    });
  });

  describe("menu items", () => {
    it("addMenuItem returns 401 when user is missing", async () => {
      const req = {
        params: { id: "rest-1" },
        body: {
          name: "Burger",
          description: "D",
          category: "Main",
          price: 1200,
        },
      } as any;
      const res = createMockResponse();

      await controller.addMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });

    it("addMenuItem returns created menu item on success", async () => {
      const req = {
        user: { id: "user-1" },
        params: { id: "rest-1" },
        body: {
          name: "Burger",
          description: "Tasty",
          category: "Main",
          price: 1200,
        },
        file: { filename: "burger.png" },
      } as any;
      const res = createMockResponse();
      const item = { _id: { toString: () => "m1" }, name: "Burger" } as any;

      mockedService.addMenuItem.mockResolvedValue(item);

      await controller.addMenuItem(req, res);

      expect(mockedService.addMenuItem).toHaveBeenCalledWith(
        "rest-1",
        expect.objectContaining({
          name: "Burger",
          description: "Tasty",
          category: "Main",
          price: 1200,
          image: "burger.png",
          userId: "user-1",
        }),
      );
      expect(res.json).toHaveBeenCalledWith(item);
    });

    it("addMenuItem returns 500 when service throws", async () => {
      const req = {
        user: { id: "user-1" },
        params: { id: "rest-1" },
        body: {
          name: "Burger",
          description: "Tasty",
          category: "Main",
          price: 1200,
        },
      } as any;
      const res = createMockResponse();

      mockedService.addMenuItem.mockRejectedValue(new Error("add failed"));

      await controller.addMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Something went wrong",
      });
    });

    it("getOneMenuItem returns 404 when item is not found", async () => {
      const req = { params: { itemId: "m404" } } as any;
      const res = createMockResponse();

      mockedService.getOneMenuItem.mockResolvedValue(null as any);

      await controller.getOneMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Menu item not found" });
    });

    it("getOneMenuItem returns 400 for CastError", async () => {
      const req = { params: { itemId: "bad-id" } } as any;
      const res = createMockResponse();

      mockedService.getOneMenuItem.mockRejectedValue({
        name: "CastError",
      } as any);

      await controller.getOneMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid menu item ID format",
      });
    });

    it("getOneMenuItem returns item on success", async () => {
      const req = { params: { itemId: "m1" } } as any;
      const res = createMockResponse();
      const item = {
        _id: { toString: () => "m1" },
        name: "Burger",
        restaurantId: { toString: () => "rest-1" },
      } as any;

      mockedService.getOneMenuItem.mockResolvedValue(item);

      await controller.getOneMenuItem(req, res);

      expect(res.json).toHaveBeenCalledWith(item);
    });

    it("getOneMenuItem returns 500 for unexpected error", async () => {
      const req = { params: { itemId: "m1" } } as any;
      const res = createMockResponse();

      mockedService.getOneMenuItem.mockRejectedValue(
        new Error("lookup failed"),
      );

      await controller.getOneMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Something went wrong",
      });
    });

    it("getMenuItemsByUser returns 401 when user is missing", async () => {
      const req = {} as any;
      const res = createMockResponse();

      await controller.getMenuItemsByUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });

    it("getMenuItemsByUser returns items on success", async () => {
      const req = { user: { id: "user-1" } } as any;
      const res = createMockResponse();
      const items = [{ _id: "m1", userId: "user-1" }] as any;

      mockedService.getMenuItemsByUser.mockResolvedValue(items);

      await controller.getMenuItemsByUser(req, res);

      expect(mockedService.getMenuItemsByUser).toHaveBeenCalledWith("user-1");
      expect(res.json).toHaveBeenCalledWith(items);
    });

    it("getMenuItemsByUser returns 500 when service throws", async () => {
      const req = { user: { id: "user-1" } } as any;
      const res = createMockResponse();

      mockedService.getMenuItemsByUser.mockRejectedValue(
        new Error("list by user failed"),
      );

      await controller.getMenuItemsByUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Something went wrong",
      });
    });

    it("updateMenuItem returns 404 when item is not found", async () => {
      const req = {
        user: { id: "user-1" },
        params: { itemId: "m404" },
        body: { name: "Updated" },
      } as any;
      const res = createMockResponse();

      mockedService.updateMenuItem.mockResolvedValue(null as any);

      await controller.updateMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Menu item not found" });
    });

    it("updateMenuItem returns 401 when user is missing", async () => {
      const req = {
        params: { itemId: "m1" },
        body: { name: "Updated" },
      } as any;
      const res = createMockResponse();

      await controller.updateMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });

    it("updateMenuItem returns updated item on success", async () => {
      const req = {
        user: { id: "user-1" },
        params: { itemId: "m1" },
        body: { name: "Updated" },
        file: { filename: "updated.png" },
      } as any;
      const res = createMockResponse();
      const updated = { _id: { toString: () => "m1" }, name: "Updated" } as any;

      mockedService.updateMenuItem.mockResolvedValue(updated);

      await controller.updateMenuItem(req, res);

      expect(mockedService.updateMenuItem).toHaveBeenCalledWith(
        "m1",
        expect.objectContaining({ name: "Updated", image: "updated.png" }),
      );
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it("updateMenuItem returns 500 when service throws", async () => {
      const req = {
        user: { id: "user-1" },
        params: { itemId: "m1" },
        body: { name: "Updated" },
      } as any;
      const res = createMockResponse();

      mockedService.updateMenuItem.mockRejectedValue(
        new Error("update failed"),
      );

      await controller.updateMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Something went wrong",
      });
    });

    it("deleteMenuItem returns 401 when user is missing", async () => {
      const req = { params: { itemId: "m1" } } as any;
      const res = createMockResponse();

      await controller.deleteMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    });

    it("deleteMenuItem returns 404 when item is not found", async () => {
      const req = { user: { id: "user-1" }, params: { itemId: "m404" } } as any;
      const res = createMockResponse();

      mockedService.deleteMenuItem.mockResolvedValue(null as any);

      await controller.deleteMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Menu item not found" });
    });

    it("deleteMenuItem returns 204 on success", async () => {
      const req = { user: { id: "user-1" }, params: { itemId: "m1" } } as any;
      const res = createMockResponse();

      mockedService.deleteMenuItem.mockResolvedValue({
        _id: "m1",
        name: "Burger",
      } as any);

      await controller.deleteMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("deleteMenuItem returns 500 when service throws", async () => {
      const req = { user: { id: "user-1" }, params: { itemId: "m1" } } as any;
      const res = createMockResponse();

      mockedService.deleteMenuItem.mockRejectedValue(
        new Error("delete item failed"),
      );

      await controller.deleteMenuItem(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Something went wrong",
      });
    });
  });
});
