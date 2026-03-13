import { Request, Response } from "express";
import * as controller from "./restaurants.controller";
import * as restaurantsService from "../services/restaurants.service";

jest.mock("../services/restaurants.service");
jest.mock("../utils/logger", () => ({
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
  });

  describe("toggleAvailability", () => {
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
  });
});
