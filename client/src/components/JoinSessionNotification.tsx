import type { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Song } from '../types'

interface JoinSessionNotificationProps {
  song: Song | null;
  onClose: () => void;
}

export const JoinSessionNotification: FC<JoinSessionNotificationProps> = ({ song, onClose }) => {
  const navigate = useNavigate()

  if (!song) return null

  const handleJoin = () => {
    navigate('/live', { state: { song } })
    onClose()
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm border border-blue-200 animate-slide-in">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        New Song Selected!
      </h3>
      <p className="text-gray-600 mb-4">
        {song.title} by {song.artist} is now playing.
      </p>
      <div className="flex justify-end space-x-2">
        <button
          onClick={onClose}
          className="px-3 py-1 text-gray-600 hover:text-gray-800"
        >
          Dismiss
        </button>
        <button
          onClick={handleJoin}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Join Session
        </button>
      </div>
    </div>
  )
} 