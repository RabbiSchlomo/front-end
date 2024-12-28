import React from 'react';
import { FaXTwitter } from 'react-icons/fa6';
import { FaTelegram } from 'react-icons/fa';

const Footer = ({ isDark = false }) => {
  return (
    <footer className={`fixed bottom-0 left-0 right-0 ${isDark ? 'bg-[#1a1b1e] bg-opacity-90' : 'bg-white bg-opacity-90'} backdrop-blur-sm py-3`}>
      <div className="container mx-auto flex justify-center items-center gap-6">
        <a
          href="https://x.com/RabbiSchlomo_Ai"
          target="_blank"
          rel="noopener noreferrer"
          className={`${isDark ? 'text-white hover:text-blue-400' : 'text-black hover:text-blue-400'} transition-colors`}
        >
          <FaXTwitter size={24} />
        </a>
        <a
          href="https://t.me/SchlomosSynagogue"
          target="_blank"
          rel="noopener noreferrer"
          className={`${isDark ? 'text-white hover:text-blue-400' : 'text-black hover:text-blue-400'} transition-colors`}
        >
          <FaTelegram size={24} />
        </a>
      </div>
    </footer>
  );
};

export default Footer; 