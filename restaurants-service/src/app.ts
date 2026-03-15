import express from "express";
import cors from "cors";
import restaurantsRoutes from "./routes/restaurants.routes";
import path from "node:path";
import YAML from "yamljs";
import swaggerUi from "swagger-ui-express";
import { requestLogger } from "./middlewares/requestLogger";

const app = express();
const openApiPath = path.resolve(process.cwd(), "docs/openapi.yaml");
const openApiDocument = YAML.load(openApiPath);

app.disable("x-powered-by");

//Allow requests from your frontend
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(requestLogger);

app.get("/api/restaurants/openapi.yaml", (_req, res) => {
  res.sendFile(openApiPath);
});

app.use(
  "/api/restaurants/docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument),
);

app.use("/api/restaurants", restaurantsRoutes);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

export default app;
