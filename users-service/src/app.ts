import express from "express";
import cors from "cors";
import path from "node:path";
import YAML from "yamljs";
import swaggerUi from "swagger-ui-express";
import authRoutes from "./routes/users.routes";

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

app.get("/api/auth/openapi.yaml", (_req, res) => {
  res.sendFile(openApiPath);
});

app.use("/api/auth/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

// Your routes
app.use("/api/auth", authRoutes);

export default app;
