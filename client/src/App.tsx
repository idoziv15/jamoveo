import type { FC } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { AuthProvider } from './context/AuthContext'

export const App: FC = () => {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
