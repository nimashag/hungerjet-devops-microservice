jest.mock("../../src/controllers/delivery.controller", () => ({
  assignDriverAutomatically: jest.fn(),
  respondToAssignment: jest.fn(),
  getAssignedOrders: jest.fn(),
  getMyDeliveries: jest.fn(),
  updateDeliveryStatus: jest.fn(),
  getAvailableOrders: jest.fn(),
}));

jest.mock("../../src/controllers/driver.controller", () => ({
  registerDriver: jest.fn(),
  updateDriver: jest.fn(),
  getDriverProfile: jest.fn(),
}));

jest.mock("../../src/middleware/auth", () => ({
  authenticate: jest.fn((_req, _res, next) => next()),
}));

jest.mock("../../src/middleware/authorize", () => ({
  authorizeRoles: jest.fn(() => jest.fn((_req, _res, next) => next())),
}));

jest.mock("../../src/middleware/upload", () => ({
  upload: {
    single: jest.fn(() => jest.fn((_req, _res, next) => next())),
  },
}));

import deliveryRouter from "../../src/routes/delivery.routes";
import driverRouter from "../../src/routes/driver.routes";

const getRouteDefinitions = (router: any) =>
  router.stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods),
      handlers: layer.route.stack.map((item: any) => item.handle),
    }));

describe("route definitions", () => {
  it("delivery routes include new available-orders endpoint and expected methods", () => {
    const defs = getRouteDefinitions(deliveryRouter);

    const paths = defs.map((d: any) => `${d.methods[0]} ${d.path}`);

    expect(paths).toEqual(
      expect.arrayContaining([
        "get /health",
        "post /assign",
        "post /respond",
        "get /assigned-orders",
        "get /available-orders",
        "get /my-deliveries",
        "patch /delivery/:deliveryId/status",
      ]),
    );

    const availableRoute = defs.find(
      (d: any) => d.path === "/available-orders",
    );
    expect(availableRoute).toBeDefined();
    expect(availableRoute.handlers.length).toBe(3);
  });

  it("driver routes include register, update me and get me", () => {
    const defs = getRouteDefinitions(driverRouter);
    const paths = defs.map((d: any) => `${d.methods[0]} ${d.path}`);

    expect(paths).toEqual(
      expect.arrayContaining(["post /register", "patch /me", "get /me"]),
    );

    const registerRoute = defs.find((d: any) => d.path === "/register");
    expect(registerRoute.handlers.length).toBe(4);
  });
});
