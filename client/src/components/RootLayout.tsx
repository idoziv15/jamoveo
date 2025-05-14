import type { FC } from 'react'
import { Outlet } from 'react-router-dom'
import { SocketProvider } from '../context/SocketContext'
import { Header } from './Header'

export const RootLayout: FC = () => {
  return (
    <SocketProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </SocketProvider>
  )
} 