import request from "supertest";
import * as restaurantsService from "../../services/restaurants.service";

process.env.JWT_SECRET = "test-secret";
// Import app after JWT secret is set because auth middleware validates env at module load.
import app from "../../app";

jest.mock("../../services/restaurants.service");
jest.mock("../../utils/logger", () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  requestContext: {
    run: (_context: unknown, callback: () => void) => callback(),
  },
}));

const mockedService = restaurantsService as jest.Mocked<typeof restaurantsService>;

describe("restaurants API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /api/restaurants/health returns healthy status", async () => {
    const res = await request(app).get("/api/restaurants/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.service).toBe("restaurants-service");
  });

  it("GET /api/restaurants returns list", async () => {
    mockedService.getAllRestaurants.mockResolvedValue([
      { _id: "1", name: "Burger Hub" },
    ] as any);

    const res = await request(app).get("/api/restaurants");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].name).toBe("Burger Hub");
  });

  it("GET /api/restaurants/:id returns 400 for CastError", async () => {
    mockedService.getRestaurantById.mockRejectedValue({ name: "CastError" } as any);

    const res = await request(app).get("/api/restaurants/not-an-object-id");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Invalid restaurant ID format" });
  });
});
