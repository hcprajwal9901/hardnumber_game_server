import http from 'http';
import app from './app';
import { initSocket } from './socket';
import { PORT } from './config';

const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
