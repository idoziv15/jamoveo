import { createBrowserRouter } from 'react-router-dom'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { AdminSignup } from './pages/AdminSignup'
import { MainPlayer } from './pages/MainPlayer'
import { MainAdmin } from './pages/MainAdmin'
import { Results } from './pages/Results'
import { Live } from './pages/Live'
// Import other pages as they are implemented

export const router = createBrowserRouter([
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
    element: <MainPlayer />,
  },
  {
    path: '/admin',
    element: <MainAdmin />,
  },
  {
    path: '/results',
    element: <Results />,
  },
  {
    path: '/live',
    element: <Live />,
  },
  // Add other routes as pages are implemented
]) 