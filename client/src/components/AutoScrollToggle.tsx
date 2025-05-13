import type { FC } from 'react'

interface AutoScrollToggleProps {
  isActive: boolean;
  onToggle: () => void;
}

export const AutoScrollToggle: FC<AutoScrollToggleProps> = ({ isActive, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="auto-scroll-toggle"
      aria-label="Toggle auto-scroll"
      title="Toggle auto-scroll"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-6 w-6 transition-transform ${isActive ? 'rotate-180' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
        />
      </svg>
    </button>
  )
} 