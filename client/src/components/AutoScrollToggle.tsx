import React from 'react';

interface AutoScrollToggleProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const AutoScrollToggle: React.FC<AutoScrollToggleProps> = ({ isEnabled, onToggle }) => {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onToggle(!isEnabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          isEnabled ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isEnabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span className="text-sm text-gray-600">Auto-scroll</span>
    </div>
  );
}; 