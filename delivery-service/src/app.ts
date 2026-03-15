import express from "express";
import path from "node:path";
import cors from "cors";
import dotenv from "dotenv";
import YAML from "yamljs";
import swaggerUi from "swagger-ui-express";
import deliveryRoutes from "./routes/delivery.routes";
import driverRoutes from "./routes/driver.routes";
import { requestLogger } from "./middleware/requestLogger";

dotenv.config();
const app = express();
const openApiPath = path.resolve(process.cwd(), "docs/openapi.yaml");
const openApiDocument = YAML.load(openApiPath);

//Allow requests from your frontend
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  }),
);

app.use(express.json());

app.use(requestLogger);
app.get("/api/delivery/openapi.yaml", (_req, res) => {
  res.sendFile(openApiPath);
});
app.use(
  "/api/delivery/docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument),
);

app.use("/api/drivers", driverRoutes);
app.use("/api/delivery", deliveryRoutes);

export default app;
