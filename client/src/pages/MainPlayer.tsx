import type { FC } from 'react'
import { useSocket } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import type { User } from '../types'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

export const MainPlayer: FC = () => {
  const { isConnected, currentSong, socket } = useSocket()
  const { user } = useAuth()
  const navigate = useNavigate()
  const typedUser = user as User | null

  useEffect(() => {
    // Request current session state when component mounts
    if (socket && isConnected) {
      console.log('Requesting current session state')
      socket.emit('session:get_current')
    }
  }, [socket, isConnected])

  // Add effect to watch currentSong changes
  useEffect(() => {
    console.log('Current song state changed:', currentSong)
    // If we receive a song, verify it's still valid
    if (currentSong && socket && isConnected) {
      socket.emit('session:get_current')
    }
  }, [currentSong, socket, isConnected])

  const handleJoinSession = () => {
    if (!currentSong) {
      return
    }
    
    // Double check session state before joining
    socket?.emit('session:get_current')
    
    // Small delay to ensure we have latest state
    setTimeout(() => {
      if (currentSong) {
        // Emit join event before navigating
        socket?.emit('session:join')
        // Navigate to live view
        navigate('/live', { state: { song: currentSong } })
      }
    }, 100)
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome, {typedUser?.username}!</h1>
        <p className="text-xl text-gray-600 mb-8">Playing: {typedUser?.instrument}</p>
        
        {!isConnected ? (
          <div className="p-8 bg-white rounded-lg shadow-lg">
            <p className="text-gray-600">Connecting to session...</p>
          </div>
        ) : currentSong ? (
          <div 
            onClick={handleJoinSession}
            className="p-8 bg-white rounded-lg shadow-lg cursor-pointer transform transition-transform hover:scale-105"
            key={currentSong._id} // Add key to force re-render on song change
          >
            <h2 className="text-3xl font-semibold text-gray-800 mb-4">
              Active Session
            </h2>
            <p className="text-xl text-gray-700 mb-2">{currentSong.title}</p>
            <p className="text-lg text-gray-600 mb-6">by {currentSong.artist}</p>
            <button
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Join Session
            </button>
          </div>
        ) : (
          <div className="p-8 bg-white rounded-lg shadow-lg">
            <h2 className="text-3xl font-semibold text-gray-800">
              No Active Session
            </h2>
            <p className="mt-4 text-gray-600">
              Waiting for an admin to start a session...
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 