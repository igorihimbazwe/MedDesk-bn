import express, { Application } from "express";
import connectDB from "./config/db";
import routes from "./routes";
import dotenv from "dotenv";
import errorHandler from "./middleware/errorMiddleware";

dotenv.config(); 

const app: Application = express();


connectDB();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(errorHandler);


app.use("/api", routes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
