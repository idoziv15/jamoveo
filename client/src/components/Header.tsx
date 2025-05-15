import type { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'

export const Header: FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user) return null

  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="text-lg font-semibold text-gray-800">
          JaMoveo - {user.isAdmin ? 'Admin' : 'Player'}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">
            Welcome, {user.username}
          </span>
          <button
            onClick={handleLogout}
            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            aria-label="Logout"
            title="Logout"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  )
} 