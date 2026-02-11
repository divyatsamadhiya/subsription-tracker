import mongoose from "mongoose";
import { config } from "./config.js";

export const connectMongo = async (): Promise<void> => {
  mongoose.set("sanitizeFilter", true);
  await mongoose.connect(config.mongoUri);
};
