import { io } from 'socket.io-client'

// Create socket instance without connecting
const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000', {
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