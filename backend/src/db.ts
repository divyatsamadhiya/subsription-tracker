import mongoose from "mongoose";
import { config } from "./config.js";

export const connectMongo = async (): Promise<void> => {
  await mongoose.connect(config.mongoUri);
};
