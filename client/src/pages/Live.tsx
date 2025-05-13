import { FC, useEffect } from 'react'
import socket from '../utils/socket'

export const Live: FC = () => {
  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to socket server')
    })

    return () => {
      socket.off('connect')
    }
  }, [])

  return (
    <div>
      {/* Add your live page implementation */}
    </div>
  )
} 