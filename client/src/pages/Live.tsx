import React, { useEffect, useRef, useState } from 'react'
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

interface Chord {
  text: string;
  position: number;
}

interface SongLineFormatted {
  type: 'lyrics' | 'chords';
  content: string;
  positions?: Chord[];
}

interface SongWithLines extends Omit<Song, 'lyrics' | 'chords'> {
  lines: SongLineFormatted[];
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
      console.log("📥 Got session:song_selected!", songData);
      console.log("🧪 Song lines:", songData?.lines);
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
      const song = location.state.song;
      console.log('Trying to emit song:select event with:', song)
      if (song.source === 'local') {
        // For local songs, use the song ID
        socket.emit('song:select', song._id || song.url)
      } else {
        // For external songs, use the URL
        console.log("📤 Emitting song:select with:", song.url);
        socket.emit('song:select', song.url)
      }
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
    let scrollInterval: NodeJS.Timeout | null = null;

    if (isAutoScrolling && contentRef.current) {
      scrollInterval = setInterval(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop += 1;
        }
      }, 50);
    }

    return () => {
      if (scrollInterval) {
        clearInterval(scrollInterval);
      }
    };
  }, [isAutoScrolling]);

  const handleQuit = () => {
    if (typedUser?.isAdmin) {
      socket?.emit('session:end')
    } else {
      socket?.emit('session:leave')
    }
    navigate(typedUser?.isAdmin ? '/admin' : '/player')
  }

  const renderLine = (line: any) => {
    if (!line) return null;
  
    if (line.type === 'chords') {
      const lineArray = Array(80).fill(' ');
      line.positions.forEach(({ text, position }: any) => {
        if (position < 80) {
          lineArray[position] = text;
        }
      });
  
      return (
        <pre className="text-blue-600 font-semibold leading-none">
          {lineArray.join('')}
        </pre>
      );
    }
  
    if (line.type === 'lyrics') {
      return (
        <pre className="leading-tight whitespace-pre-wrap">
          {line.content}
        </pre>
      );
    }
  
    return null;
  };  
  
  const renderChordLine = (chords: Array<{ text: string; position: number }>) => {
    const maxPos = Math.max(...chords.map(c => c.position + c.text.length), 30);
    const lineArr = Array(maxPos).fill(' ');

    chords.forEach(({ text, position }) => {
      if (position < 0 || position >= lineArr.length) return;
      for (let i = 0; i < text.length; i++) {
        const idx = position + i;
        if (idx < lineArr.length) {
          lineArr[idx] = text[i];
        }
      }
    });

    return lineArr.join('');
  }; 

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

  return (
    <div className="live-page p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
          <div className="w-full md:w-auto">
            <h1 className="text-2xl md:text-4xl font-bold break-words">
              {currentSong?.title}
            </h1>
            <h2 className="text-lg md:text-xl text-gray-600 mt-1">
              {currentSong?.artist}
            </h2>
          </div>
          <button
            onClick={handleQuit}
            className={`px-4 py-2 text-white rounded transition-colors ${
              typedUser?.isAdmin ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-500 hover:bg-gray-600'
            }`}
          >
            {typedUser?.isAdmin ? 'End Session' : 'Leave Session'}
          </button>
        </div>

        <div className="flex gap-6">
          <div 
            ref={contentRef}
            className="flex-grow bg-white rounded-lg shadow-lg p-6 overflow-y-auto max-h-[calc(100vh-200px)]"
          >
            {(currentSong as any)?.lines?.filter(Boolean).map((line, index) => (
              <div key={index}>
                {renderLine(line)}
              </div>
            ))}
          </div>

          <div className="w-64 flex-shrink-0">
            <ParticipantsList participants={participants} />
            <div className="mt-4">
              <AutoScrollToggle
                isEnabled={isAutoScrolling}
                onToggle={(enabled: boolean) => setIsAutoScrolling(enabled)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 