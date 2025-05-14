import { useState } from 'react'
import type { FC, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

export const MainAdmin: FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      toast.warning('Please enter a search term')
      return
    }

    try {
      setIsLoading(true)
      const response = await api.get(`/songs/search?q=${encodeURIComponent(searchQuery)}`)
      const songs = response.data.data.songs

      if (!songs || songs.length === 0) {
        toast.info('No songs found. Try a different search term.')
        return
      }

      navigate('/results', { state: { songs } })
    } catch (error) {
      // The error message will be handled by the API interceptor
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">Song Search Dashboard</h1>
          <p className="text-gray-600 text-center mb-8">
            Search for songs to share with your band members
          </p>

          <form onSubmit={handleSearch} className="space-y-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter song name, artist, or both (e.g., 'Sweet Home Alabama' or 'Lynyrd Skynyrd')"
                className="w-full p-4 pr-12 text-lg border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {isLoading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                ) : (
                  <svg
                    className="h-6 w-6 text-gray-400"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Searching...' : 'Search Songs'}
            </button>
          </form>
        </div>

        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">Search Tips</h2>
          <ul className="list-disc list-inside space-y-2 text-blue-700">
            <li>Try searching by song title, artist name, or both</li>
            <li>Use specific terms for better results</li>
            <li>Check spelling if you don't find what you're looking for</li>
            <li>Results will show available tabs and chord sheets</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 