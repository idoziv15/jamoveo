import { useState } from 'react'
import type { FC, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Instrument } from '../types'
import api from '../utils/api'

const INSTRUMENTS: Instrument[] = ['drums', 'guitar', 'bass', 'saxophone', 'keyboard', 'vocals']

export const AdminSignup: FC = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [instrument, setInstrument] = useState<Instrument>('guitar')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const response = await api.post('/auth/admin/signup', {
        username,
        password,
        isAdmin: true,
        instrument: instrument === 'vocals' ? undefined : instrument
      })
      login(response.data.token, response.data.user)
      navigate('/admin')
    } catch (err) {
      setError('Failed to create admin account. Username might be taken.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-6">Admin Sign Up</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Admin Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="instrument" className="block text-sm font-medium text-gray-700">
              Instrument
            </label>
            <select
              id="instrument"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value as Instrument)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              {INSTRUMENTS.map((inst) => (
                <option key={inst} value={inst}>
                  {inst.charAt(0).toUpperCase() + inst.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Admin Account
          </button>
        </form>
      </div>
    </div>
  )
} 