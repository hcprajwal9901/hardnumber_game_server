import dotenv from 'dotenv';
dotenv.config();

export const PORT = Number(process.env.PORT || 4000);
export const REDIS_URL = process.env.REDIS_URL || "";
export const NODE_ENV = process.env.NODE_ENV || "development";
export const JWT_SECRET = process.env.JWT_SECRET || "change_me";
