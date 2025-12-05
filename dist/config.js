"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = exports.NODE_ENV = exports.REDIS_URL = exports.PORT = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.PORT = Number(process.env.PORT || 4000);
exports.REDIS_URL = process.env.REDIS_URL || "";
exports.NODE_ENV = process.env.NODE_ENV || "development";
exports.JWT_SECRET = process.env.JWT_SECRET || "change_me";
