import React, { useState, useRef, useEffect } from 'react';
import { IoMdClose } from 'react-icons/io';
import { IoMdSend } from 'react-icons/io';
import rabbiImage from '../assets/rabbi_schlomo.jpg';
import { getGrokResponse } from '../services/grok';
import schlomoCharacter from '../assets/schlomo.character.json';

const AIChatBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        content: "Shalom! I'm Rabbi Schlomo. How can I help you today? Perhaps you need advice about investments? Put a $shekel on it!",
        sender: 'rabbi',
        timestamp: new Date().toISOString()
      }]);
    }
  }, [isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      content: inputMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const shekelBuyQuestion = inputMessage.toLowerCase().match(/(\$?shekel|buy shekel|shekel.*price)/i);
      
      if (shekelBuyQuestion) {
        // Initialize empty message for streaming
        setMessages(prev => [...prev, {
          content: '',
          sender: 'rabbi',
          timestamp: new Date().toISOString()
        }]);

        const shekelResponse = "Of course, put a shekel on it! I've blessed $SHEKEL, so 100x is reasonable for a start, but I'm not risking my kids' bar mitzvah fund, only a small wager.";
        
        // Simulate streaming by breaking the message into chunks
        const chunks = shekelResponse.split(' ');
        for (const word of chunks) {
          await new Promise(resolve => setTimeout(resolve, 50)); // Adjust timing as needed
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            return prev.map((msg, i) => 
              i === prev.length - 1 
                ? {...msg, content: msg.content + (msg.content ? ' ' : '') + word}
                : msg
            );
          });
        }
      } else {
        // Initialize an empty message for streaming
        setMessages(prev => [...prev, {
          content: '',
          sender: 'rabbi',
          timestamp: new Date().toISOString()
        }]);

        // Handle streaming response
        await getGrokResponse(
          [...messages, userMessage],
          import.meta.env.VITE_GROK_API_KEY,
          (chunk) => {
            setMessages(prev => {
              const lastMessage = prev[prev.length - 1];
              // Only update if the content would actually change
              if (lastMessage.content + chunk === lastMessage.content) {
                return prev;
              }
              return prev.map((msg, i) => 
                i === prev.length - 1 
                  ? {...msg, content: msg.content + chunk}
                  : msg
              );
            });
          }
        );
      }
    } catch (error) {
      console.error('Error getting response:', error);
      setMessages(prev => [...prev, {
        content: "Oy vey! Something went wrong with my connection. Could you try again?",
        sender: 'rabbi',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="bg-white rounded-lg shadow-xl w-[320px] h-[450px] border border-gray-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <img 
                src={rabbiImage} 
                alt="Rabbi Schlomo" 
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="font-medium">Rabbi Schlomo</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <IoMdClose className="text-xl" />
            </button>
          </div>
          
          <div className="flex flex-col h-[calc(450px-128px)] p-4 overflow-y-auto">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
              >
                {message.sender === 'rabbi' && (
                  <img 
                    src={rabbiImage} 
                    alt="Rabbi Schlomo" 
                    className="w-6 h-6 rounded-full object-cover mr-2 self-end"
                  />
                )}
                <div className={`max-w-[70%] p-3 rounded-lg text-sm ${
                  message.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}>
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="animate-pulse">Rabbi Schlomo is typing...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form 
            onSubmit={handleSendMessage}
            className="border-t border-gray-200 p-4"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask Rabbi Schlomo..."
                disabled={isLoading}
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
              >
                <IoMdSend />
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 p-1 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        >
          <img 
            src={rabbiImage} 
            alt="Rabbi Schlomo" 
            className="w-10 h-10 rounded-full object-cover"
          />
        </button>
      )}
    </div>
  );
};

export default AIChatBubble; 