import React, { useState } from 'react'
import type { FC } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSocket } from '../context/SocketContext'
import api from '../utils/api'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

interface SearchResult {
  title: string;
  artist: string;
  url: string;
  source: string;
}

export const Results: FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { socket } = useSocket()
  const songs = location.state?.songs as SearchResult[] || []
  const [loading, setLoading] = useState<string | null>(null)

  const handleSelectSong = async (song: SearchResult) => {
    try {
      setLoading(song.url)

      if (song.source === 'local') {
        // For local songs, use socket
        if (!socket) {
          throw new Error('Socket connection not available');
        }
        socket.emit('song:select', song.url);
        navigate('/live', { state: { song } });
      } else {
        // For external songs, fetch details via API
        const response = await api.get('/songs/song-details', {
          params: { url: song.url }
        });
        
        const songDetails = response.data.data;
        navigate('/live', { state: { song: songDetails } });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch song details. Please try again.')
      setLoading(null)
    }
  }

  if (songs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">No songs found</h2>
          <p className="text-gray-600 mb-6">Try searching with different keywords</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 px-4">
          <h1 className="text-3xl font-bold text-gray-800">Search Results</h1>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Back
          </button>
        </div>

        <div className="grid gap-4 px-4">
          {songs.map((song: SearchResult) => (
            <div
              key={song.url}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleSelectSong(song)}
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-2">{song.title}</h2>
              <p className="text-gray-600 mb-4">{song.artist}</p>
              
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Source: {song.source}</span>
                {loading === song.url && (
                  <span className="text-primary">Loading...</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 