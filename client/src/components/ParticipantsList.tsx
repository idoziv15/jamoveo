import type { FC } from 'react'

interface Participant {
  username: string;
  instrument: string;
  isAdmin: boolean;
}

interface ParticipantsListProps {
  participants: Participant[];
}

export const ParticipantsList: FC<ParticipantsListProps> = ({ participants }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center justify-between">
        <span>Connected Users</span>
        <span className="text-sm font-normal text-gray-500">({participants.length})</span>
      </h3>
      <div className="grid grid-cols-1 gap-2">
        {participants.map((participant, index) => (
          <div 
            key={index}
            className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-gray-700 truncate">{participant.username}</span>
              {participant.isAdmin && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded flex-shrink-0">
                  Admin
                </span>
              )}
            </div>
            <span className="text-sm text-gray-500 ml-2 flex-shrink-0">{participant.instrument}</span>
          </div>
        ))}
      </div>
    </div>
  )
} 