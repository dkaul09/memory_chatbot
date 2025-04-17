import React, { useState } from 'react';
import { Message } from '../types/Message';
import TypewriterText from './TypewriterText';

interface MessageListProps {
  messages: Message[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const [completedAnimations, setCompletedAnimations] = useState<{[key: number]: boolean}>({});
  const handleAnimationComplete = (index: number) => {
    setCompletedAnimations(prev => ({
      ...prev,
      [index]: true
    }));
  };
  
  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        const isUser = message.role === 'user';
        
        return (
          <div 
            key={index} 
            className={`flex items-start ${isUser ? 'justify-end' : ''}`}
          >
            {!isUser && (
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-2">
                AI
              </div>
            )}
            
            <div className={`p-3 rounded-lg max-w-xs md:max-w-md ${
              isUser ? 'bg-gray-200' : 'bg-blue-100'
            }`}>
              {isUser || completedAnimations[index] ? (
                <p className="text-gray-800">{message.content}</p>
              ) : (
                <p className="text-gray-800">
                  <TypewriterText 
                    text={message.content} 
                    speed={25} 
                    onComplete={() => handleAnimationComplete(index)} 
                  />
                </p>
              )}
            </div>
            
            {isUser && (
              <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white font-bold ml-2">
                You
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;