import { io } from 'socket.io-client'

// Create socket instance without connecting
const socket = io(import.meta.env.VITE_SOCKET_URL || 'https://jamoveo-g2eg.onrender.com', {
  autoConnect: false
})

// Function to update auth token and reconnect
export const updateSocketAuth = (token: string | null) => {
  if (token) {
    socket.auth = { token }
    socket.connect()
  } else {
    socket.disconnect()
  }
}

export default socket 