import express from 'express';
import cors from 'cors'; 
import restaurantsRoutes from './routes/restaurants.routes';
import path from 'node:path';
import { requestLogger } from './middlewares/requestLogger';

const app = express();

app.disable('x-powered-by');

//Allow requests from your frontend
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
  }));

app.use(express.json());
app.use(requestLogger);

app.use('/api/restaurants', restaurantsRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


export default app;
