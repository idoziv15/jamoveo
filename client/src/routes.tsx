import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { AdminSignup } from './pages/AdminSignup'
import { MainPlayer } from './pages/MainPlayer'
import { MainAdmin } from './pages/MainAdmin'
import { Results } from './pages/Results'
import { Live } from './pages/Live'
import { ProtectedRoute } from './components/ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '/admin/signup',
    element: <AdminSignup />,
  },
  {
    path: '/player',
    element: (
      <ProtectedRoute>
        <MainPlayer />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute requireAdmin>
        <MainAdmin />
      </ProtectedRoute>
    ),
  },
  {
    path: '/results',
    element: (
      <ProtectedRoute requireAdmin>
        <Results />
      </ProtectedRoute>
    ),
  },
  {
    path: '/live',
    element: (
      <ProtectedRoute>
        <Live />
      </ProtectedRoute>
    ),
  },
  // Add other routes as pages are implemented
]) 