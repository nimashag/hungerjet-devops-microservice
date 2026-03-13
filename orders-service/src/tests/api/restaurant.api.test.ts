jest.mock("../../utils/httpClient", () => ({
  httpClient: {
    get: jest.fn(),
  },
}));

jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}));

jest.mock("dotenv", () => ({
  config: jest.fn(),
}));

import { httpClient } from "../../utils/httpClient";
import { fetchMenuItems, fetchRestaurant } from "../../api/restaurant.api";

describe("restaurant.api", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESTAURANTS_SERVICE_URL =
      "http://restaurants-service/api/restaurants";
  });

  it("fetchMenuItems returns menu data on success", async () => {
    const menuItems = [{ id: "m1", name: "Burger" }];
    (httpClient.get as jest.Mock).mockResolvedValueOnce({
      data: menuItems,
      status: 200,
    });

    const result = await fetchMenuItems("rest_123");

    expect(httpClient.get).toHaveBeenCalledWith(
      "http://restaurants-service/api/restaurants/rest_123/menu-items",
    );
    expect(result).toEqual(menuItems);
  });

  it("fetchMenuItems encodes restaurant id", async () => {
    (httpClient.get as jest.Mock).mockResolvedValueOnce({
      data: [],
      status: 200,
    });

    await fetchMenuItems("rest/unsafe id");

    expect(httpClient.get).toHaveBeenCalledWith(
      "http://restaurants-service/api/restaurants/rest%2Funsafe%20id/menu-items",
    );
  });

  it("fetchMenuItems rethrows http errors", async () => {
    (httpClient.get as jest.Mock).mockRejectedValueOnce(
      new Error("network fail"),
    );

    await expect(fetchMenuItems("rest_123")).rejects.toThrow("network fail");
  });

  it("fetchRestaurant returns restaurant data on success", async () => {
    const restaurant = { id: "rest_1", name: "Bistro" };
    (httpClient.get as jest.Mock).mockResolvedValueOnce({
      data: restaurant,
      status: 200,
    });

    const result = await fetchRestaurant("rest_1");

    expect(httpClient.get).toHaveBeenCalledWith(
      "http://restaurants-service/api/restaurants/rest_1",
    );
    expect(result).toEqual(restaurant);
  });

  it("fetchRestaurant rethrows http errors", async () => {
    (httpClient.get as jest.Mock).mockRejectedValueOnce(new Error("timeout"));

    await expect(fetchRestaurant("rest_1")).rejects.toThrow("timeout");
  });
});
