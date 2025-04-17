import React, { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import { Message } from '../types/Message';
import { User } from '../types/User';
import { openAiService } from '../services/openAiService';

const ChatContainer: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch previous messages on component mount
  useEffect(() => {
    const initializeChat = async () => {
      try {
        // Check if this is a page refresh
        if (window.performance.navigation.type === 1) { // 1 is PAGE_RELOAD
          // If it's a refresh, clear the stored user ID to force creation of a new one
          sessionStorage.removeItem('userId');
          console.log("Page refreshed, starting new chat");
        }

        // First get the user (will create a new one if userId not in sessionStorage)
        const userData = await openAiService.createOrGetUser();
        setUser(userData);
        
        // Then fetch messages for this user
        const messagesData = await openAiService.getMessages(userData.id);
        setMessages(messagesData);
      } catch (error) {
        console.error('Error initializing chat:', error);
      }
    };
    
    initializeChat();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Create new message object
    const newMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date()
    };

    // Add message to UI immediately
    setMessages(prev => [...prev, newMessage]);
    
    // Show typing indicator
    setIsLoading(true);

    try {
      // Call OpenAI API
      const response = await openAiService.sendMessage(content, user.id);
      
      // Add AI response to messages
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again later.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen max-w-6xl mx-auto shadow-xl rounded-lg overflow-hidden">
      {/* Main chat area */}
      <div className="flex flex-col flex-1 bg-white">
        {/* Header */}
        <div className="px-6 py-4 bg-blue-600 text-white">
          <h1 className="text-xl font-bold">Memory Chatbot</h1>
          <p className="text-sm text-blue-100">AI assistant that remembers your information</p>
        </div>
        
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4">
          <MessageList messages={messages} />
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input area */}
        <div className="border-t p-4">
          <ChatInput onSendMessage={sendMessage} isDisabled={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default ChatContainer;