import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';
import rabbiImage from '../assets/rabbi_schlomo.jpg';
import { FaEthereum } from 'react-icons/fa';
import { SiSolana } from 'react-icons/si';
import ConnectWallet from './ConnectWallet';
import blueStar from '../assets/android-chrome-512x512.png';

const MIN_BALANCE_FOR_FUND_APPLICATION = 1000000; // 1 million SHEKEL

const BaseIcon = ({ className }) => (
  <img 
    src="https://avatars.githubusercontent.com/u/108554348?s=200&v=4"
    alt="Base"
    className={className}
  />
);

const TreasuriesOverviewPage = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [userBalance, setUserBalance] = useState(0);

  // Initialize viem public client
  const publicClient = createPublicClient({
    chain: base,
    transport: http()
  });

  useEffect(() => {
    const fetchUserBalance = async () => {
      if (isConnected && address) {
        try {
          const balance = await publicClient.readContract({
            address: '0x5f6a682a58854c7fbe228712aeeffccde0008ac0',
            abi: [{
              "constant": true,
              "inputs": [{"name": "_owner", "type": "address"}],
              "name": "balanceOf",
              "outputs": [{"name": "balance", "type": "uint256"}],
              "type": "function"
            }],
            functionName: 'balanceOf',
            args: [address],
          });
          
          const formattedBalance = Number(formatEther(balance));
          setUserBalance(formattedBalance);
        } catch (error) {
          console.error('Error fetching balance:', error);
          setUserBalance(0);
        }
      }
    };

    fetchUserBalance();
  }, [isConnected, address]);

  const treasuries = [
    {
      name: "Rabbi's Digital Gold Fund",
      manager: "Rabbi Schlomo",
      managerImage: rabbiImage,
      description: "Value Investment Fund with goal of leveraging bull market and Ai growth to increase BTC holdings.",
      icon: <BaseIcon className="w-8 h-8" />,
      route: '/funds/gold',
      active: false,
      chainName: 'Base',
      backgroundColor: 'bg-gradient-to-br from-yellow-500 to-yellow-700',
      address: ''
    },
    {
      name: "Rabbi's Solana Side Wallet",
      manager: "Rabbi Schlomo",
      managerImage: rabbiImage,
      description: "Rabbi's personal Solana wallet which he uses to practice, trade, and learn. Profits will periodically be used to buyback SHEKEL",
      icon: <SiSolana className="w-8 h-8" />,
      route: '/funds/solana',
      active: true,
      chainName: 'Solana',
      backgroundColor: 'bg-gradient-to-br from-purple-500 to-purple-700',
      address: '5Rn9eECNAF8YHgyri7BUe5pbvP7KwZqNF25cDc3rExwt'
    },
    {
      name: "Rabbi's Base Side Wallet",
      manager: "Rabbi Schlomo",
      managerImage: rabbiImage,
      description: "Rabbi's personal Base wallet which he uses to practice, trade, and learn. Profits will periodically by used to buyback SHEKEL",
      icon: <BaseIcon className="w-8 h-8" />,
      route: '/funds/base',
      active: false,
      chainName: 'Base',
      backgroundColor: 'bg-gradient-to-br from-blue-500 to-blue-700',
      address: ''
    }
  ];

  return (
    <div className="min-h-screen bg-white mt-8">
      <ConnectWallet />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 sm:pb-8">
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 text-blue-600 hover:text-blue-700 font-medium flex items-center"
        >
          <span className="mr-1">←</span> Back
        </button>

        <div className="flex items-center justify-center mb-8">
          <img 
            src={blueStar} 
            alt="Blue Star" 
            className="w-16 h-16 rounded-full object-cover mr-4"
          />
          <div>
            <h1 className="text-4xl font-bold text-gray-900 text-center">
              Kosher Capital Funds
            </h1>
          </div>
        </div>

        <div className="flex flex-col items-center mb-8">
          <button
            onClick={() => navigate('/funds/create')}
            className={`relative px-8 py-3 rounded-lg font-medium shadow-lg transform transition bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:scale-[1.02]
            }`}
          >
            Launch New Fund
          </button>
          
        </div>

        {/* <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-8">
          <p className="text-blue-700 font-medium">
            Shalom! Welcome to our treasuries overview. Here you can see how we manage our community's assets across different blockchain networks.
          </p>
        </div> */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 mb-8">
          {treasuries.map((treasury) => ( 
            <div
              key={treasury.name}
              className={`relative overflow-hidden rounded-xl shadow-lg ${
                treasury.active ? 'transform transition hover:scale-[1.02]' : 'opacity-75'
              }`}
            >
              <div className={`${treasury.backgroundColor} p-6`}>
                <div className="flex items-center mb-4">
                  <div className="text-white mr-3">
                    {treasury.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      {treasury.name}
                    </h3>
                    <span className="text-white/80 text-sm">
                      Blockchain: {treasury.chainName}
                    </span>
                  </div>
                </div>
                <p className="text-white/80 text-sm mb-2 flex items-center">
                  <img 
                    src={treasury.managerImage} 
                    alt={treasury.manager}
                    className="w-6 h-6 rounded-full object-cover mr-2"
                  />
                  Managed by: {treasury.manager}
                </p>
                {/* <p className="text-white/80 text-sm mb-2">
                  Blockchain: {treasury.chainName}
                </p> */}
                <p className="text-white/90 mb-4">
                  {treasury.description}
                </p>
                {/* <p className="text-white/80 text-sm italic mb-4">
                  "May Hashem bless the wallet that contributes, may your trading be as bountiful as the ships of Zebulun, and your balance increase a thousand fold"
                </p> */}
                <div className="flex justify-between space-x-2 w-full">
                  {treasury.name === "Rabbi's Digital Gold Fund" ? (
                    <button 
                      className="flex-1 bg-white/20 text-white px-4 py-3 rounded-lg text-sm font-medium text-center"
                    >
                      Deposit (Opening Soon)
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(treasury.address);
                        alert(`${treasury.chainName} address copied to clipboard!`);
                      }}
                      className="flex-1 bg-white/20 hover:bg-white/30 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                    >
                      Contribute
                    </button>
                  )}
                  {treasury.active ? (
                    <button 
                      onClick={() => navigate(treasury.route)}
                      className="flex-1 bg-white/20 hover:bg-white/30 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                    >
                      View →
                    </button>
                  ) : (
                    <span className="flex-1 bg-white/20 text-white px-4 py-3 rounded-lg text-sm font-medium text-center">
                      Coming Soon ✨
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TreasuriesOverviewPage; 