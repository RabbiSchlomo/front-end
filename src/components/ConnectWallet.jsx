import { useAccount, useDisconnect, useConnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { injected } from 'wagmi/connectors';
import { useEffect, useState } from 'react';

const ConnectWallet = ({ setAddress, onChainChanged }) => {
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect } = useConnect();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handlePhantomConnect = async () => {
    try {
      if (isConnected) {
        console.log('Disconnecting...');
        await disconnect();
      } else {
        console.log('Attempting direct connection...');
        const connector = injected({
          shimDisconnect: true,
        });
        
        await connect({ connector });

        if (address) {
          console.log('Connected with address:', address);
          setAddress?.(address);
        }
      }
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  return (
    <div className="absolute top-2 right-2 flex gap-2">
      {isMobile && !isConnected && (
        <button
          onClick={handlePhantomConnect}
          className="bg-white hover:bg-purple-700 text-black px-4 py-2 rounded-xl flex items-center justify-center transition-colors"
        >
          <img 
            src="https://cryptocurrencyjobs.co/startups/assets/logos/phantom.jpg" 
            alt="Phantom"
            className="w-6 h-6 object-contain"
          />
        </button>
      )}
      
      <ConnectButton 
        chainStatus="icon"
        showBalance={false}
      />
    </div>
  );
};

export default ConnectWallet; 