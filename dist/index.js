"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const socket_1 = require("./socket");
const config_1 = require("./config");
const server = http_1.default.createServer(app_1.default);
// Initialize Socket.IO
(0, socket_1.initSocket)(server);
// Start server
server.listen(config_1.PORT, () => {
    console.log(`Server listening on port ${config_1.PORT}`);
});
