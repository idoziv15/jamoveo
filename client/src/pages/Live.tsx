import { useEffect, useRef, useState } from 'react'
import type { FC } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSocket } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import { AutoScrollToggle } from '../components/AutoScrollToggle'
import type { Song, User } from '../types'

export const Live: FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { socket } = useSocket()
  const { user } = useAuth()
  const contentRef = useRef<HTMLDivElement>(null)
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)
  const song = location.state?.song as Song
  const typedUser = user as User | null

  useEffect(() => {
    if (!song) {
      navigate(typedUser?.isAdmin ? '/admin' : '/player')
    }
  }, [song, navigate, typedUser])

  useEffect(() => {
    let scrollInterval: number | null = null

    if (isAutoScrolling && contentRef.current) {
      scrollInterval = setInterval(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop += 1
        }
      }, 50)
    }

    return () => {
      if (scrollInterval) {
        clearInterval(scrollInterval)
      }
    }
  }, [isAutoScrolling])

  const handleQuit = () => {
    socket.emit('session:end')
    navigate(typedUser?.isAdmin ? '/admin' : '/player')
  }

  if (!song) return null

  const showChords = typedUser?.instrument !== 'vocals'

  return (
    <div className="live-page">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold">{song.title}</h1>
            <p className="text-xl text-gray-600">{song.artist}</p>
          </div>
          {typedUser?.isAdmin && (
            <button
              onClick={handleQuit}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Quit Session
            </button>
          )}
        </div>

        <div
          ref={contentRef}
          className="bg-white rounded-lg shadow-lg p-8 max-h-[70vh] overflow-y-auto"
          style={{
            fontSize: '1.25rem',
            lineHeight: '1.75',
            color: '#111827',
            backgroundColor: '#ffffff',
          }}
        >
          {showChords ? (
            <div className="whitespace-pre-wrap font-mono">{song.chords}</div>
          ) : (
            <div className="whitespace-pre-wrap">{song.lyrics}</div>
          )}
        </div>

        <AutoScrollToggle
          isActive={isAutoScrolling}
          onToggle={() => setIsAutoScrolling(!isAutoScrolling)}
        />
      </div>
    </div>
  )
} 