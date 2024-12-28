import React, { useState, useEffect, useRef } from 'react';
import ConnectWallet from './ConnectWallet';
import { db } from '../firebase-config';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import AIChatBubble from './AIChatBubble';
import { Filter } from 'bad-words';
import { Alert } from '@mui/material';
import rabbiImage from '../assets/rabbi_schlomo.jpg';
import { useAccount } from 'wagmi';
import Footer from './Footer';

const BoardRoom = () => {
  const navigate = useNavigate();
  const filter = new Filter();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const { address, isConnected } = useAccount();
  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const messagesEndRef = useRef(null);
  const USERNAME_MAX_LENGTH = 10;
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('warning');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    let unsubscribe = () => {};

    const setupListener = () => {
      try {
        const q = query(collection(db, "boardRoomChat"), orderBy("timestamp", "asc"));
        unsubscribe = onSnapshot(q, 
          (snapshot) => {
            const messageData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setMessages(messageData);
            scrollToBottom();
          },
          (error) => {
            console.error("Error fetching messages:", error);
          }
        );
      } catch (error) {
        console.error("Error setting up listener:", error);
      }
    };

    setupListener();
    
    return () => {
      try {
        unsubscribe();
      } catch (error) {
        console.error("Error unsubscribing:", error);
      }
    };
  }, []);

  useEffect(() => {
    const fetchUsername = async () => {
      if (!address) return;
      try {
        const userDoc = await getDoc(doc(db, "usernames", address));
        if (userDoc.exists()) {
          setUsername(userDoc.data().username);
        } else {
          setUsername(truncateAddress(address));
        }
      } catch (error) {
        console.error("Error fetching username:", error);
        setUsername(truncateAddress(address));
      }
    };

    fetchUsername();
  }, [address]);

  const truncateAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    
    // If message is from a different day, show the date
    if (date.toDateString() !== now.toDateString()) {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(date);
    }
    
    // If same day, just show time
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    if (!address || !tempUsername.trim()) return;

    const cleanUsername = tempUsername.trim();

    if (cleanUsername.length > USERNAME_MAX_LENGTH) {
      setAlertMessage(`Oy vey! Username must be ${USERNAME_MAX_LENGTH} characters or less!`);
      setAlertType('warning');
      setShowAlert(true);
      return;
    }

    try {
      // Check for profanity
      if (filter.isProfane(cleanUsername)) {
        setAlertMessage("Such language! Please choose a more appropriate username!");
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      // Check if username exists for this address
      const userDoc = await getDoc(doc(db, "usernames", address));
      
      if (userDoc.exists()) {
        // Update existing username
        await setDoc(doc(db, "usernames", address), {
          username: cleanUsername,
          address: address,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new username entry
        await setDoc(doc(db, "usernames", address), {
          username: cleanUsername,
          address: address,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      setUsername(cleanUsername);
      setIsEditingUsername(false);
      setTempUsername('');
      setAlertMessage(`Mazel tov! Your new username is ${cleanUsername}!`);
      setAlertType('success');
      setShowAlert(true);
    } catch (error) {
      console.error("Error updating username:", error);
      setAlertMessage("Oy gevalt! Something went wrong!");
      setAlertType('error');
      setShowAlert(true);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !address) return;

    try {
      await addDoc(collection(db, "boardRoomChat"), {
        text: newMessage,
        sender: address,
        username: username,
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const usernameSection = (
    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-5 py-2.5 text-white border border-white/20">
      {address && (
        <>
          <span className="text-white/70 text-sm">Username:</span>
          {isEditingUsername ? (
            <form 
              onSubmit={handleUsernameSubmit} 
              className="inline-flex items-center"
            >
              <input
                type="text"
                value={tempUsername}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= USERNAME_MAX_LENGTH) {
                    setTempUsername(value);
                  }
                }}
                onBlur={() => {
                  if (tempUsername.trim() !== username) {
                    handleUsernameSubmit({ preventDefault: () => {} });
                  } else {
                    setIsEditingUsername(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsEditingUsername(false);
                    setTempUsername(username);
                  }
                }}
                className="w-40 bg-transparent border-b border-white/30 px-1 py-0.5 text-white focus:outline-none focus:border-blue-500 text-sm placeholder-white/50"
                autoFocus
                placeholder="Enter username"
                maxLength={USERNAME_MAX_LENGTH}
              />
              {isEditingUsername && (
                <span className="ml-2 text-xs text-white/50">
                  {tempUsername.length}/{USERNAME_MAX_LENGTH}
                </span>
              )}
            </form>
          ) : (
            <div 
              onClick={() => {
                setTempUsername(username);
                setIsEditingUsername(true);
              }}
              className="group cursor-pointer inline-flex items-center gap-1"
            >
              <span className="font-medium text-sm text-white group-hover:text-blue-400 transition-colors">
                {username}
              </span>
              <span className="text-white/50 opacity-0 group-hover:opacity-100 transition-opacity">
                ✎
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="bg-[#1a1b1e] min-h-screen text-white pb-16">
      {showAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
          <Alert 
            severity={alertType}
            onClose={() => setShowAlert(false)}
            className="flex items-center"
            sx={{
              '& .MuiAlert-icon': {
                padding: 0,
                marginRight: 1
              }
            }}
          >
            <div className="flex items-center gap-3">
              <img 
                src={rabbiImage} 
                alt="Rabbi" 
                className="w-12 h-12 rounded-full object-cover"
              />
              <span>{alertMessage}</span>
            </div>
          </Alert>
        </div>
      )}
      
      <div className="w-full h-[calc(100vh-4rem)] md:h-[calc(100vh-6rem)] max-w-[420px] md:max-w-[1200px] mx-auto md:my-4 flex flex-col bg-[#1E1E1E] rounded-none md:rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a365d] to-[#2563eb] p-4">
          <div className="flex items-center justify-between mb-2">
            <button 
              onClick={() => navigate('/')}
              className="text-white hover:text-gray-200 transition-colors flex items-center gap-2"
            >
              ← Back
            </button>
            <div className="text-sm opacity-70">
              {address && truncateAddress(address)}
            </div>
          </div>
          <div className="text-center space-y-2">
            {usernameSection}
            <h1 className="text-xl font-semibold">Board Room</h1>
          </div>
        </div>

        {/* Chat Buttons */}
        <div className="flex gap-2 p-2 bg-[#1E1E1E] max-w-[600px] mx-auto w-full">
          <button className="flex-1 bg-[#1a1b1e] text-white py-2 px-4 rounded-lg border border-blue-500 hover:bg-blue-500/20 transition-colors text-sm">
            Board Chat
          </button>
          <button 
            disabled
            className="flex-1 bg-[#1a1b1e] text-gray-500 py-2 px-4 rounded-lg border border-gray-700 cursor-not-allowed text-sm relative group"
          >
            Private Rabbi Chat
            <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">Soon™</span>
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#1E1E1E] space-y-4">
          <div className="max-w-[800px] mx-auto">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`${msg.sender === address ? 'text-right' : 'text-left'} mb-4`}
              >
                <div className={`flex items-center gap-1 text-xs text-gray-400 mb-1 ${
                  msg.sender === address ? 'justify-end' : 'justify-start'
                }`}>
                  <span>{msg.username || truncateAddress(msg.sender)}</span>
                  <span>•</span>
                  <span>{formatTimestamp(msg.timestamp)}</span>
                </div>
                <p className={`inline-block rounded-lg px-3 py-2 max-w-[85%] md:max-w-[50%] text-sm ${
                  msg.sender === address 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-[#2A2A2A] text-gray-100'
                }`}>
                  {msg.text}
                </p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="p-3 bg-[#1E1E1E] border-t border-gray-800">
          <form onSubmit={sendMessage} className="flex gap-2 max-w-[800px] mx-auto">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Send a message ..."
              className="flex-1 rounded-lg bg-[#2A2A2A] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-white placeholder-gray-400"
            />
            <button 
              type="submit"
              disabled={!address || !newMessage.trim()}
              className={`p-2 rounded-lg transition-colors ${
                !address || !newMessage.trim()
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>
        </div>
      </div>
      {/* <Footer isDark={true} /> */}
    </div>
  );
};

export default BoardRoom; 