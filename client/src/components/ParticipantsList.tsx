import { FC } from 'react'

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
    <div className="bg-white rounded-lg shadow-lg p-4 min-w-[250px]">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Connected Users ({participants.length})
      </h3>
      <div className="space-y-2">
        {participants.map((participant, index) => (
          <div 
            key={index}
            className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-gray-700">{participant.username}</span>
              {participant.isAdmin && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  Admin
                </span>
              )}
            </div>
            <span className="text-sm text-gray-500">{participant.instrument}</span>
          </div>
        ))}
      </div>
    </div>
  )
} 