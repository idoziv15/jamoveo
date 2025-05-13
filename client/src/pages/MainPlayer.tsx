import type { FC } from 'react'
import { useSocket } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import type { User } from '../types'

export const MainPlayer: FC = () => {
  const { isConnected } = useSocket()
  const { user } = useAuth()
  const typedUser = user as User | null

  return (
    <div className="main-page">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome, {typedUser?.username}!</h1>
        <p className="text-xl text-gray-600 mb-4">Playing: {typedUser?.instrument}</p>
        
        <div className="p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-3xl font-semibold text-gray-800">
            Waiting for next song...
          </h2>
          
          <p className="mt-4 text-gray-600">
            {isConnected ? (
              'Connected to session. The admin will select a song soon.'
            ) : (
              'Connecting to session...'
            )}
          </p>
        </div>
      </div>
    </div>
  )
} 