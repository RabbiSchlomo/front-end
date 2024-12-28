import React, { useEffect, useState } from 'react';
import ConnectWallet from './ConnectWallet';
import { useSDK } from '@metamask/sdk-react';
import Web3 from 'web3';
import { useNavigate } from 'react-router-dom';
import AIChatBubble from './AIChatBubble';

const BuyPage = () => {
  const navigate = useNavigate();
  const { connected, account } = useSDK();
  const [holders, setHolders] = useState([]);
  const [userBalance, setUserBalance] = useState(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    const fetchHolders = async () => {
      try {
        const response = await fetch('https://api.virtuals.io/api/tokens/0x365119d015112a70C79EECf65A4451E7973d311a/holders');
        const data = await response.json();
        setHolders(data.data);
      } catch (error) {
        console.error('Error fetching holders:', error);
      }
    };

    fetchHolders();
  }, []);

  useEffect(() => {
    const fetchUserBalance = async () => {
      if (connected && account) {
        try {
          console.log('Fetching balance for account:', account);
          
          const web3 = new Web3('https://mainnet.base.org');
          if (!web3) {
            throw new Error('Failed to initialize Web3');
          }
          
          const minABI = [
            {
              "constant": true,
              "inputs": [{"name": "_owner", "type": "address"}],
              "name": "balanceOf",
              "outputs": [{"name": "balance", "type": "uint256"}],
              "type": "function"
            }
          ];

          const tokenContract = new web3.eth.Contract(
            minABI,
            '0x365119d015112a70C79EECf65A4451E7973d311a'
          );
          
          const balance = await tokenContract.methods.balanceOf(account).call();
          const formattedBalance = web3.utils.fromWei(balance, 'ether');
          setUserBalance(formattedBalance);
        } catch (error) {
          console.error('Detailed error fetching balance:', error);
          setUserBalance('0');
        }
      }
    };

    fetchUserBalance();
  }, [connected, account]);

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="bg-white text-black container mx-auto px-4 max-w-[100vw] overflow-x-hidden relative">
      <AIChatBubble />
      {/* <ConnectWallet /> */}
      
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 text-blue-600 hover:text-blue-700 font-medium flex items-center"
      >
        <span className="mr-1">←</span> Back
      </button>
      
      <div className="mt-10">
        <h1 className="text-4xl font-bold text-center mb-8 pt-4">Buy SHEKEL</h1>
        
        {/* Modified iframe section */}
        <div className="w-full max-w-4xl mx-auto mb-8">
          <iframe
            src="https://fun.virtuals.io/agents/0x365119d015112a70C79EECf65A4451E7973d311a"
            className={`w-full h-[600px] border-0 rounded-lg transition-opacity duration-300 ${
              iframeLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            title="Virtuals Fun Trading Interface"
            onLoad={() => setIframeLoaded(true)}
          />
        </div>

        {/* Token Holders Section */}
        {/* <div className="mb-16">
          <h2 className="text-3xl font-bold mb-6 text-center">Top Token Holders</h2>
          <div className="overflow-x-auto">
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 md:gap-8">
                <div className="font-bold text-lg mb-2">Address</div>
                <div className="font-bold text-lg mb-2">Ownership</div>
                {holders.map(([address, percentage]) => (
                  <React.Fragment key={address}>
                    <div className="text-gray-600 break-all">
                      {formatAddress(address)}
                    </div>
                    <div className="text-gray-600">
                      {Number(percentage).toFixed(2)}%
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default BuyPage; 