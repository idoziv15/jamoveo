import { createContext, useContext, useEffect, type FC, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import socket, { updateSocketAuth } from '../utils/socket'
import { useAuth } from './AuthContext'
import type { Song } from '../types'

interface SocketContextType {
  socket: typeof socket;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | null>(null)

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: FC<SocketProviderProps> = ({ children }) => {
  const { user, token } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Update socket authentication when token changes
    updateSocketAuth(token)

    function onConnect() {
      console.log('Connected to socket server')
      if (user) {
        socket.emit('join', { userId: user.id, isAdmin: user.isAdmin })
      }
    }

    function onDisconnect() {
      console.log('Disconnected from socket server')
    }

    function onError(error: Error) {
      console.error('Socket error:', error)
      if (error.message.includes('authentication')) {
        socket.disconnect()
      }
    }

    function onSongSelected(song: Song) {
      navigate('/live', { state: { song } })
    }

    function onSessionEnded() {
      navigate(user?.isAdmin ? '/admin' : '/player')
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onError)
    socket.on('song:selected', onSongSelected)
    socket.on('session:ended', onSessionEnded)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onError)
      socket.off('song:selected', onSongSelected)
      socket.off('session:ended', onSessionEnded)
      socket.disconnect()
    }
  }, [user, token, navigate])

  return (
    <SocketContext.Provider value={{ socket, isConnected: socket.connected }}>
      {children}
    </SocketContext.Provider>
  )
} 