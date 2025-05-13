import { useState } from 'react'
import type { FC, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

export const MainAdmin: FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    try {
      const response = await api.get(`/songs/search?q=${encodeURIComponent(searchQuery)}`)
      navigate('/results', { state: { songs: response.data.songs } })
    } catch (err) {
      console.error('Failed to search songs:', err)
    }
  }

  return (
    <div className="main-page">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-center">Welcome, {user?.username}!</h1>
        
        <div className="mt-8 p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-center mb-6">
            Search any song...
          </h2>

          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter song name or artist..."
                className="w-full px-4 py-2 text-xl rounded-lg border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/50 outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-primary text-white text-lg rounded-lg hover:bg-primary/90 transition-colors"
            >
              Search
            </button>
          </form>

          <p className="mt-4 text-sm text-gray-600 text-center">
            Search works in both English and Hebrew
          </p>
        </div>
      </div>
    </div>
  )
} 