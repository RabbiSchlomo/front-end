import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Navigate } from 'react-router-dom';
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';
import ConnectWallet from './ConnectWallet';

const MIN_BALANCE = 1000000; 

const ProtectedMillionBoardRoom = ({ children }) => {
  const { address, isConnected } = useAccount();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize viem public client
  const publicClient = createPublicClient({
    chain: base,
    transport: http()
  });

  useEffect(() => {
    const checkBalance = async () => {
      if (!isConnected || !address) {
        console.log('Not connected or no address');
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      try {
        console.log('Fetching balance for account:', address);
        
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
        console.log('Formatted balance:', formattedBalance);
        console.log('Min balance required:', MIN_BALANCE);
        
        const isAuth = formattedBalance >= MIN_BALANCE;
        console.log('Is authorized:', isAuth);
        
        setIsAuthorized(isAuth);
        setIsLoading(false);
      } catch (error) {
        console.error('Detailed error fetching balance:', error);
        setIsAuthorized(false);
        setIsLoading(false);
      }
    };

    if (isConnected && address) {
      checkBalance();
    }
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <ConnectWallet />
        <p className="mt-4 text-lg">Please connect your wallet to access the Gold Partner Room</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  console.log('Final check - Connected:', isConnected, 'Authorized:', isAuthorized);
  
  if (isConnected && !isAuthorized) {
    return <Navigate to="/" replace />;
  }

  if (isConnected && isAuthorized) {
    return children;
  }

  return <div className="min-h-screen flex items-center justify-center">Checking authorization...</div>;
};

export default ProtectedMillionBoardRoom; 