import React from 'react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="typing-indicator">
      <div className="flex space-x-1">
        <div className="typing-dot" style={{ animationDelay: '0ms' }} />
        <div className="typing-dot" style={{ animationDelay: '300ms' }} />
        <div className="typing-dot" style={{ animationDelay: '600ms' }} />
      </div>
      <span className="text-sm text-gray-500 font-medium">Thinking...</span>
    </div>
  );
};

export default TypingIndicator;