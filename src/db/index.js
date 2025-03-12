import mongoose from "mongoose";
import { DB_NAME } from "../constant.js"; 

const connectDb = async () => {
  try {
    const mongoDbUrl = `${process.env.MONGODB_URL}/${DB_NAME}`; 
    await mongoose.connect(mongoDbUrl);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.log("MongoDB connection error", error);
  }
};

export default connectDb;
