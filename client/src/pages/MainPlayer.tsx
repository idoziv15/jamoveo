import { FC } from 'react'
import { SongCard } from '../components/SongCard'
import { AutoScrollToggle } from '../components/AutoScrollToggle'

export const MainPlayer: FC = () => {
  return (
    <div>
      <SongCard />
      <AutoScrollToggle />
      {/* Add your main player implementation */}
    </div>
  )
} 