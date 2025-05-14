import { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Song } from '../types'

interface LiveSessionCardProps {
  song: Song | null;
}

export const LiveSessionCard: FC<LiveSessionCardProps> = ({ song }) => {
  const navigate = useNavigate()

  if (!song) {
    return (
      <div className="p-8 bg-white rounded-lg shadow-lg text-center">
        <h2 className="text-3xl font-semibold text-gray-800">
          No Active Session
        </h2>
        <p className="mt-4 text-gray-600">
          Waiting for an admin to start a session...
        </p>
      </div>
    )
  }

  const handleJoinSession = () => {
    navigate('/live', { state: { song } })
  }

  return (
    <div 
      onClick={handleJoinSession}
      className="p-8 bg-white rounded-lg shadow-lg cursor-pointer transform transition-transform hover:scale-105"
    >
      <div className="text-center">
        <h2 className="text-3xl font-semibold text-gray-800 mb-2">
          Active Session
        </h2>
        <div className="space-y-2">
          <p className="text-xl text-gray-700">
            {song.title}
          </p>
          <p className="text-lg text-gray-600">
            by {song.artist}
          </p>
          <button
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Join Session
          </button>
        </div>
      </div>
    </div>
  )
} 