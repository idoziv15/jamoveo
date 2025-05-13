import type { FC } from 'react'
import { Outlet } from 'react-router-dom'
import { SocketProvider } from '../context/SocketContext'

export const RootLayout: FC = () => {
  return (
    <SocketProvider>
      <Outlet />
    </SocketProvider>
  )
} 