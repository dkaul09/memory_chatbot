import React, { useState, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number; 
  onComplete?: () => void;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ 
  text, 
  speed = 30, 
  onComplete 
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      
      return () => clearTimeout(timer);
    } else if (!completed) {
      setCompleted(true);
      onComplete && onComplete();
    }
  }, [currentIndex, text, speed, completed, onComplete]);
  
  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
    setCompleted(false);
  }, [text]);

  return <span>{displayedText}</span>;
};

export default TypewriterText;