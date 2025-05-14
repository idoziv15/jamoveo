export const config = {
  socketUrl: 'http://localhost:3000', // Server runs on port 3000
  apiUrl: 'http://localhost:3000/api',
  wsPath: '/socket.io', // Match the server's socket path
} as const; 