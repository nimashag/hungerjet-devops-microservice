import express from "express";
import cors from "cors";
import path from "node:path";
import YAML from "yamljs";
import swaggerUi from "swagger-ui-express";
import orderRoutes from "./routes/orders.routes";
import { requestLogger } from "./middlewares/requestLogger";

const app = express();
const openApiPath = path.resolve(process.cwd(), "docs/openapi.yaml");
const openApiDocument = YAML.load(openApiPath);

//Allow requests from your frontend
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(requestLogger);

app.get("/api/orders/openapi.yaml", (_req, res) => {
  res.sendFile(openApiPath);
});

app.use("/api/orders/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use("/api/orders", orderRoutes);

export default app;
