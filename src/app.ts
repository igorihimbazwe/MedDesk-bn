import express, { Application } from "express";
import connectDB from "./config/db";
import routes from "./routes";
import dotenv from "dotenv";
import errorHandler from "./middleware/errorMiddleware";
import patientRoutes from "./routes/patientRoutes";
import doctorRoutes from "./routes/doctor"
import adminRoutes  from "./routes/adminRoutes"

import cors from "cors";

dotenv.config(); 

const app: Application = express();


connectDB();

const corsOptions: cors.CorsOptions = {
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

if (process.env.NODE_EN === 'production') {
  corsOptions.origin = process.env.FRONTEND_URL;
} else {
  corsOptions.origin = 'http://localhost:5173';
}

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(errorHandler);


app.use("/api", routes);
app.use("/api/patients", patientRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/admin", adminRoutes);


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
