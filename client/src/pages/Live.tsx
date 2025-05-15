import { useEffect, useRef, useState } from 'react'
import type { FC } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSocket } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import { AutoScrollToggle } from '../components/AutoScrollToggle'
import { ParticipantsList } from '../components/ParticipantsList'
import { toast } from 'react-toastify'
import type { Song, User } from '../types'

interface Participant {
  username: string;
  instrument: string;
  isAdmin: boolean;
}

interface SongLine {
  lyrics: string;
  chords: string;
}

interface SongWithLines extends Omit<Song, 'lyrics' | 'chords'> {
  lines: SongLine[];
}

export const Live: FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { socket } = useSocket()
  const { user } = useAuth()
  const contentRef = useRef<HTMLDivElement>(null)
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [currentSong, setCurrentSong] = useState<SongWithLines | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const typedUser = user as User | null

  useEffect(() => {
    if (!socket) {
      setError('Socket connection not available')
      setIsLoading(false)
      return
    }

    // Handle current session state
    socket.on('session:current_state', (songData: SongWithLines) => {
      console.log('Received current state:', songData)
      setCurrentSong(songData)
      setIsLoading(false)
    })

    // Handle song selection updates
    socket.on('session:song_selected', (songData: SongWithLines) => {
      console.log('Received song selection:', songData)
      setCurrentSong(songData)
      setIsLoading(false)
    })

    // Handle session end
    socket.on('session:ended', () => {
      toast.info('Session has ended')
      navigate(typedUser?.isAdmin ? '/admin' : '/player')
    })

    // Handle errors
    socket.on('error', (error: { message: string }) => {
      toast.error(error.message)
      if (error.message.includes('No admin present')) {
        navigate('/player')
      }
    })

    // If admin and we have a song from location state, start the session
    if (typedUser?.isAdmin && location.state?.song) {
      // Send only the song ID for selection
      socket.emit('song:select', location.state.song._id || 'hey_jude')
    }
    // Join session if not admin
    else if (!typedUser?.isAdmin) {
      socket.emit('session:join')
    }

    setIsLoading(false)

    return () => {
      socket.off('session:current_state')
      socket.off('session:song_selected')
      socket.off('session:ended')
      socket.off('error')
    }
  }, [socket, navigate, typedUser, location.state])

  useEffect(() => {
    if (!socket) return

    const handleParticipants = (updatedParticipants: Participant[]) => {
      console.log('Received participants update:', updatedParticipants)
      setParticipants(updatedParticipants)
    }

    socket.on('session:participants', handleParticipants)

    return () => {
      socket.off('session:participants', handleParticipants)
    }
  }, [socket])

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
    if (typedUser?.isAdmin) {
      socket?.emit('session:end')
    } else {
      socket?.emit('session:leave')
    }
    navigate(typedUser?.isAdmin ? '/admin' : '/player')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading session...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    )
  }

  if (!currentSong) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">No active session</div>
      </div>
    )
  }

  const showChords = typedUser?.instrument !== 'vocals'

  return (
    <div className="live-page p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
          <div className="w-full md:w-auto">
            <h1 className="text-2xl md:text-4xl font-bold break-words">{currentSong.title}</h1>
            <p className="text-lg md:text-xl text-gray-600">{currentSong.artist}</p>
          </div>
          <button
            onClick={handleQuit}
            className={`w-full md:w-auto px-4 py-2 text-white rounded-lg ${
              typedUser?.isAdmin 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            {typedUser?.isAdmin ? 'End Session' : 'Exit Session'}
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow order-2 md:order-1">
            <div
              ref={contentRef}
              className="bg-white rounded-lg shadow-lg p-4 md:p-8 max-h-[60vh] md:max-h-[70vh] overflow-y-auto"
            >
              <div className="font-mono whitespace-pre-wrap text-base md:text-lg">
                {currentSong.lines?.map((line, index) => (
                  <div key={index} className="mb-6 md:mb-8">
                    {showChords && line.chords && (
                      <div className="text-blue-600 h-6 text-sm md:text-base">
                        {line.chords}
                      </div>
                    )}
                    <div className="text-gray-800">
                      {line.lyrics}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <AutoScrollToggle
                isActive={isAutoScrolling}
                onToggle={() => setIsAutoScrolling(!isAutoScrolling)}
              />
            </div>
          </div>

          <div className="flex-shrink-0 order-1 md:order-2 w-full md:w-auto md:min-w-[250px]">
            <ParticipantsList participants={participants} />
          </div>
        </div>
      </div>
    </div>
  )
} 