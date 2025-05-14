import { createContext, useContext, useEffect, useState, useCallback, type FC, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'
import type { Song, User } from '../types'
import { toast } from 'react-toastify'
import { config } from '../config/config'

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  currentSong: Song | null;
  clearCurrentSong: () => void;
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
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const typedUser = user as User | null

  const handleSessionEnd = useCallback(() => {
    console.log('Session ended, clearing state')
    setCurrentSong(null)
    setIsConnected(true) // Keep socket connected
    if (window.location.pathname === '/live') {
      navigate(typedUser?.isAdmin ? '/admin' : '/player')
    }
  }, [navigate, typedUser?.isAdmin])

  const forceStateClear = useCallback(() => {
    console.log('Forcing state clear')
    setCurrentSong(null)
  }, [])

  useEffect(() => {
    if (!token) return

    // Initialize socket with auth token
    const newSocket = io(config.socketUrl, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      path: config.wsPath,
    })

    // Set up event listeners
    newSocket.on('connect', () => {
      setIsConnected(true)
      console.log('Socket connected')
      // Request current session state when connecting
      newSocket.emit('session:get_current')
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
      setCurrentSong(null)
      console.log('Socket disconnected')
    })

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      toast.error('Connection error. Please check your connection.')
    })

    newSocket.on('session:song_selected', (song: Song) => {
      console.log('Song selected:', song)
      setCurrentSong(song)
      if (typedUser?.isAdmin) {
        navigate('/live', { state: { song } })
      }
    })

    newSocket.on('session:current_state', (song: Song | null) => {
      console.log('Current state received:', song)
      setCurrentSong(song)
      // Only request participants if we have a valid song and aren't already in a session
      if (song && window.location.pathname !== '/live') {
        newSocket.emit('session:get_current')
      }
    })

    newSocket.on('session:new', (song: Song) => {
      console.log('New session notification received:', song)
      setCurrentSong(song)
      // Show toast notification for non-admin users
      if (!typedUser?.isAdmin) {
        toast.info('New session available!')
      }
    })

    newSocket.on('session:ended', () => {
      console.log('Session ended event received')
      handleSessionEnd()
      // Single request to verify state after a delay
      setTimeout(() => {
        newSocket.emit('session:get_current')
      }, 500)
    })

    newSocket.on('session:force_clear', () => {
      console.log('Force clear received')
      forceStateClear()
      // No need to request state here as it's a forced clear
    })

    // Handle errors
    newSocket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error)
      toast.error(error.message)
      if (error.message.includes('No admin present')) {
        handleSessionEnd()
      }
    })

    setSocket(newSocket)

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.off('connect')
        newSocket.off('disconnect')
        newSocket.off('connect_error')
        newSocket.off('session:song_selected')
        newSocket.off('session:current_state')
        newSocket.off('session:new')
        newSocket.off('session:ended')
        newSocket.off('session:force_clear')
        newSocket.off('error')
        newSocket.close()
      }
    }
  }, [token, navigate, typedUser, handleSessionEnd, forceStateClear])

  const clearCurrentSong = useCallback(() => {
    setCurrentSong(null)
  }, [])

  const value = {
    socket,
    isConnected,
    currentSong,
    clearCurrentSong
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
} 