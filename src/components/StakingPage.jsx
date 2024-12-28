import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useConfig } from 'wagmi';
import { createPublicClient, http, createWalletClient, custom } from 'viem';
import { base } from 'viem/chains';
import { formatEther, parseEther } from 'viem';
import ConnectWallet from './ConnectWallet';
import AIChatBubble from './AIChatBubble';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import { Alert } from '@mui/material';
import rabbiImage from '../assets/rabbi_schlomo.jpg';

const STAKING_CONTRACT_ADDRESS = '0x8cd8A5ABCdd4cA6ecb4413477243009F97F2EB08';
const NEW_STAKING_CONTRACT_ADDRESS = '0x5F6a682A58854C7fBE228712aEEFfcCDe0008Ac0';
const SHEKEL_TOKEN_ADDRESS = '0x5f6a682a58854c7fbe228712aeeffccde0008ac0';
const BASE_CHAIN_ID = 8453;

const stakingABI = [
  {"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"uint256","name":"_option","type":"uint256"}],"name":"deposit","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_index","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getStakedTokens","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getStakedItemLength","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_index","type":"uint256"}],"name":"getStakedItemAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_index","type":"uint256"}],"name":"getStakedItemAPY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_index","type":"uint256"}],"name":"getStakedItemReward","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_index","type":"uint256"}],"name":"getStakedItemElapsed","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_index","type":"uint256"}],"name":"getStakedItemTimestamp","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_user","type":"address"},{"internalType":"uint256","name":"_index","type":"uint256"}],"name":"getStakedItemDuration","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
];

const tokenABI = [
  {"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"},
  {"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"type":"function"},
  {"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"type":"function"}
];

const STAKING_TIERS = [
    { name: 'Tier 1', lockPeriod: '7 days', apy: '10%', unlockDays: 7 },
    { name: 'Tier 2', lockPeriod: '30 days', apy: '25%', unlockDays: 30 },
    { name: 'Tier 3', lockPeriod: '365 days', apy: '100%', unlockDays: 365 },
  ];

const StakingPage = () => {
  const navigate = useNavigate();
  const { address, isConnected, chainId } = useAccount();
  const config = useConfig();
  const [publicClient, setPublicClient] = useState(null);
  const [walletClient, setWalletClient] = useState(null);
  const [stakedBalance, setStakedBalance] = useState('0');
  const [stakingAPY, setStakingAPY] = useState('0');
  const [rewards, setRewards] = useState('0');
  const [userBalance, setUserBalance] = useState('0');
  const [stakeAmount, setStakeAmount] = useState('');
  const [selectedTier, setSelectedTier] = useState(0);
  const [isApproved, setIsApproved] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showStakingDetails, setShowStakingDetails] = useState(false);
  const [stakingDetails, setStakingDetails] = useState([]);
  const [isProcessingStake, setIsProcessingStake] = useState(false);
  const [isProcessingUnstake, setIsProcessingUnstake] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState('0');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('warning');
  const [pendingApproval, setPendingApproval] = useState(() => {
    const stored = localStorage.getItem('pendingApproval');
    return stored ? JSON.parse(stored) : false;
  });
  const [approvalTxHash, setApprovalTxHash] = useState(() => {
    return localStorage.getItem('approvalTxHash');
  });
  const [storedStakeAmount, setStoredStakeAmount] = useState(() => {
    return localStorage.getItem('pendingStakeAmount');
  });
  const [isPendingNextAction, setIsPendingNextAction] = useState(() => {
    return localStorage.getItem('isPendingNextAction') === 'true';
  });
  const pollingInterval = useRef(null);

  // Initialize clients
  useEffect(() => {
    const initClients = async () => {
      if (isConnected) {
        const public_client = createPublicClient({
          chain: base,
          transport: http()
        });
        
        const wallet_client = createWalletClient({
          chain: base,
          transport: custom(window.ethereum)
        });
        
        setPublicClient(public_client);
        setWalletClient(wallet_client);
      }
    };
    initClients();
  }, [isConnected]);

  // Fetch balances when clients are ready
  useEffect(() => {
    if (publicClient && address && isConnected) {
      fetchUserBalance();
      fetchStakingInfo();
    }
  }, [publicClient, address, isConnected]);

  // Add useEffect to handle auto-dismiss
  useEffect(() => {
    let timeoutId;
    if (showAlert) {
      timeoutId = setTimeout(() => {
        setShowAlert(false);
      }, 10000); // 10 seconds
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [showAlert]);

  // Add useEffect to handle storage
  useEffect(() => {
    if (pendingApproval) {
      localStorage.setItem('pendingApproval', JSON.stringify(pendingApproval));
    } else {
      localStorage.removeItem('pendingApproval');
    }
  }, [pendingApproval]);

  useEffect(() => {
    if (approvalTxHash) {
      localStorage.setItem('approvalTxHash', approvalTxHash);
    } else {
      localStorage.removeItem('approvalTxHash');
    }
  }, [approvalTxHash]);

  // Add this useEffect to handle the persistent loading state
  useEffect(() => {
    if (isPendingNextAction) {
      localStorage.setItem('isPendingNextAction', 'true');
      setErrorWithAlert('Please wait, your previous transaction is still processing. The next transaction will be prompted automatically.', 'info');
    } else {
      localStorage.removeItem('isPendingNextAction');
    }
  }, [isPendingNextAction]);

  // Modified useEffect for polling
  useEffect(() => {
    const pollForApproval = async () => {
      if (!pendingApproval || !approvalTxHash || !address) return;

      console.log('Polling for approval status...')
      try {
        const allowance = await publicClient.readContract({
          address: SHEKEL_TOKEN_ADDRESS,
          abi: tokenABI,
          functionName: 'allowance',
          args: [address, STAKING_CONTRACT_ADDRESS],
        });
        console.log('Current allowance:', allowance);
        
        if (Number(allowance) > 0) {
          console.log('Approval detected!');
          setPendingApproval(false);
          setApprovalTxHash(null);
          setIsApproved(true);
          
          const storedAmount = localStorage.getItem('pendingStakeAmount');
          if (storedAmount) {
            setStakeAmount(storedAmount);
            setIsPendingNextAction(true);
            setErrorWithAlert('Approval confirmed! Preparing staking transaction... Please wait.', 'info');
            await new Promise(resolve => setTimeout(resolve, 6000));
            setShowAlert(false);
            await handleStake();
            localStorage.removeItem('pendingStakeAmount');
            setIsPendingNextAction(false);
          }
          
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
          }
        }
      } catch (error) {
        console.error('Error polling for approval:', error);
        setIsPendingNextAction(false);
      }
    };

    if (pendingApproval && approvalTxHash && address) {
      console.log('Starting approval polling...');
      setIsPendingNextAction(true);
      pollForApproval();
      pollingInterval.current = setInterval(pollForApproval, 3000);
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, [pendingApproval, approvalTxHash, address]);

  const setErrorWithAlert = (message, type = 'error') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
    setError(message);
  };

  const fetchUserBalance = useCallback(async () => {
    if (!isConnected || !address || !publicClient) {
      setUserBalance('0');
      setApprovedAmount('0');
      return;
    }

    try {
      const balance = await publicClient.readContract({
        address: SHEKEL_TOKEN_ADDRESS,
        abi: tokenABI,
        functionName: 'balanceOf',
        args: [address],
      });
      const formattedBalance = formatEther(balance);
      setUserBalance(formattedBalance);

      if (Number(chainId) === BASE_CHAIN_ID) {
        const allowance = await publicClient.readContract({
          address: SHEKEL_TOKEN_ADDRESS,
          abi: tokenABI,
          functionName: 'allowance',
          args: [address, STAKING_CONTRACT_ADDRESS],
        });
        const formattedAllowance = formatEther(allowance);
        setApprovedAmount(formattedAllowance);
        setIsApproved(allowance > 0);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      setUserBalance('0');
      setApprovedAmount('0');
    }
  }, [isConnected, address, chainId, publicClient]);

  const fetchStakingInfo = useCallback(async () => {
    if (!isConnected || !address || !publicClient) {
      setStakedBalance('0');
      setRewards('0');
      setStakingDetails([]);
      return;
    }

    try {
      const stakedAmount = await publicClient.readContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: stakingABI,
        functionName: 'getStakedTokens',
        args: [address],
      });
      setStakedBalance(formatEther(stakedAmount));

      let itemsLength = 0;
      try {
        itemsLength = await publicClient.readContract({
          address: STAKING_CONTRACT_ADDRESS,
          abi: stakingABI,
          functionName: 'getStakedItemLength',
          args: [address],
        });
        console.log('Number of Staked Items:', itemsLength);
      } catch (error) {
        console.warn('Error fetching staked item length:', error);
      }
      
      const details = [];
      let totalRewards = 0;

      for (let i = 0; i < itemsLength; i++) {
        try {
          console.log(`\nFetching details for stake ${i}:`);
          
          const amount = await publicClient.readContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: stakingABI,
            functionName: 'getStakedItemAmount',
            args: [address, i],
          });
          const apy = await publicClient.readContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: stakingABI,
            functionName: 'getStakedItemAPY',
            args: [address, i],
          });
          const reward = await publicClient.readContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: stakingABI,
            functionName: 'getStakedItemReward',
            args: [address, i],
          });
          
          // Get elapsed time directly from contract
          const elapsed = await publicClient.readContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: stakingABI,
            functionName: 'getStakedItemElapsed',
            args: [address, i],
          });
          
          // Calculate duration based on tier
          const duration = STAKING_TIERS[getTierFromAPY(apy)].unlockDays * 24 * 60 * 60;
          
          console.log('Time Calculation:', {
            elapsed: Number(elapsed),
            duration: duration,
            elapsedDays: Number(elapsed) / (24 * 60 * 60),
            durationDays: duration / (24 * 60 * 60),
            percentage: (Number(elapsed) / duration) * 100
          });
          
          totalRewards += Number(reward);
          
          details.push({
            amount: formatEther(amount),
            tier: getTierFromAPY(apy),
            reward: formatEther(reward),
            duration: duration,
            elapsed: Number(elapsed),
            isClaimable: Number(elapsed) >= duration
          });
        } catch (error) {
          console.warn(`Error fetching staked item at index ${i}:`, error);
          console.error('Full error:', error);
          continue;
        }
      }

      console.log('\nFinal processed details:', details);
      console.log('Total rewards:', totalRewards);

      setStakingDetails(details);
      setRewards(formatEther(totalRewards));
      
    } catch (error) {
      console.error('Error fetching staking info:', error);
    }
  }, [isConnected, address, publicClient]);

  useEffect(() => {
    fetchUserBalance();
    fetchStakingInfo();
  }, [fetchUserBalance, fetchStakingInfo]);

  useEffect(() => {
    if (!isConnected || !address || Number(chainId) !== BASE_CHAIN_ID) {
      // Reset all staking-related states when disconnected or wrong network
      setStakedBalance('0');
      setRewards('0');
      setStakingDetails([]);
      setIsApproved(false);
      setError('');
      setUserBalance('0');
      setStakeAmount('');
      setShowStakingDetails(false);
    }
  }, [isConnected, address, chainId]);

  const handleChainChanged = (newChainId) => {
    if (Number(newChainId) !== BASE_CHAIN_ID) {
      setError('Please switch to Base network');
    } else {
      setError('');
      fetchUserBalance();
      fetchStakingInfo();
    }
  };

  const handleApprove = async () => {
    if (!isConnected) {
      setErrorWithAlert('Please connect your wallet first!', 'warning');
      return;
    }

    if (!walletClient) {
      setErrorWithAlert('Wallet client not initialized!', 'warning');
      return;
    }

    if (isPendingNextAction) {
      setErrorWithAlert('Please wait for the previous transaction to complete.', 'warning');
      return;
    }

    setError('');
    setIsLoading(true);
    
    try {
      let approvalAmount;
      if (stakeAmount && Number(stakeAmount) > 0) {
        approvalAmount = parseEther(stakeAmount);
      } else {
        const balance = await publicClient.readContract({
          address: SHEKEL_TOKEN_ADDRESS,
          abi: tokenABI,
          functionName: 'balanceOf',
          args: [address],
        });
        approvalAmount = balance;
      }

      const { request } = await publicClient.simulateContract({
        address: SHEKEL_TOKEN_ADDRESS,
        abi: tokenABI,
        functionName: 'approve',
        args: [STAKING_CONTRACT_ADDRESS, approvalAmount],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      console.log('Approval transaction hash:', hash);

      localStorage.setItem('pendingApproval', 'true');
      localStorage.setItem('approvalTxHash', hash);
      localStorage.setItem('pendingStakeAmount', stakeAmount);
      
      setPendingApproval(true);
      setApprovalTxHash(hash);
      setIsPendingNextAction(true);
      setErrorWithAlert('Approval transaction sent! Please wait...', 'info');

    } catch (error) {
      console.error('Error in approval process:', error);
      setError(error.message || 'Failed to approve token');
      setIsApproved(false);
      setPendingApproval(false);
      setApprovalTxHash(null);
      setIsPendingNextAction(false);
      localStorage.removeItem('pendingApproval');
      localStorage.removeItem('approvalTxHash');
      localStorage.removeItem('pendingStakeAmount');
      localStorage.removeItem('isPendingNextAction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStake = async () => {
    if (isProcessingStake) {
      console.log('Stake already processing, returning');
      return;
    }
    
    try {
      console.log('Starting stake process');
      setIsProcessingStake(true);
      setError('');
      
      if (!isConnected || !address || !walletClient) {
        setErrorWithAlert('Oy vey! Please connect your wallet first, my friend!', 'warning');
        return;
      }

      const currentChainId = Number(chainId);
      if (currentChainId !== BASE_CHAIN_ID) {
        setErrorWithAlert('Bubbeleh, you need to switch to the Base network!', 'warning');
        return;
      }
      
      if (!stakeAmount || Number(stakeAmount) <= 0) {
        setErrorWithAlert('Oy gevalt! Please enter a valid amount to stake!', 'warning');
        return;
      }
      
      console.log('Preliminary checks passed, proceeding with stake');
      setIsLoading(true);
      
      const amountInWei = parseEther(stakeAmount.toString());
      const optionValue = (selectedTier + 1).toString();

      console.log('Preparing stake transaction:', {
        amount: amountInWei,
        option: optionValue
      });

      const { request } = await publicClient.simulateContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: stakingABI,
        functionName: 'deposit',
        args: [amountInWei, BigInt(optionValue)],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      console.log('Stake transaction hash:', hash);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await fetchUserBalance();
      await fetchStakingInfo();
      setStakeAmount('');
      setError('');
      
      console.log('Stake process completed successfully');

      // Clean up all stored data after successful stake
      localStorage.removeItem('pendingStakeAmount');
      localStorage.removeItem('pendingApproval');
      localStorage.removeItem('approvalTxHash');
      localStorage.removeItem('isPendingNextAction');
      setPendingApproval(false);
      setApprovalTxHash(null);
      setIsPendingNextAction(false);
      
    } catch (error) {
      console.error('Error in stake process:', error);
      setError(error.message || 'Failed to stake tokens');
      setIsPendingNextAction(false);
      localStorage.removeItem('isPendingNextAction');
    } finally {
      setIsProcessingStake(false);
      setIsLoading(false);
    }
  };

  const handleUnstake = async (index) => {
    if (isProcessingUnstake) return;
    
    try {
      setIsProcessingUnstake(true);
      const { request } = await publicClient.simulateContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: stakingABI,
        functionName: 'withdraw',
        args: [index],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      console.log('Unstake transaction hash:', hash);

      await fetchUserBalance();
      await fetchStakingInfo();
      setError('');
    } catch (error) {
      console.error('Error unstaking:', error);
      setError(error.message || 'Failed to unstake tokens');
    } finally {
      setIsProcessingUnstake(false);
      setIsLoading(false);
    }
  };

  const getTierFromAPY = (apy) => {
    switch (Number(apy)) {
      case 10: return 0; // Tier 1 - 10%
      case 25: return 1; // Tier 2 - 25%
      case 100: return 2; // Tier 3 - 100%
      default: return 0;
    }
  };

  // Add debounced check for stake amount
  const debouncedCheckApproval = useCallback(
    debounce((amount) => {
      if (Number(amount) > Number(approvedAmount)) {
        setErrorWithAlert('Oy vey! You need to approve this higher amount first!', 'warning');
        setIsApproved(false);
      } else if (Number(amount) > 0) {
        setShowAlert(false);
        setError('');
      }
    }, 300),
    [approvedAmount]
  );

  // Update the stake amount handler
  const handleStakeAmountChange = (e) => {
    const value = e.target.value;
    setStakeAmount(value);
    setError(''); // Clear error immediately when input changes
    debouncedCheckApproval(value);
  };

  // Add this useEffect to handle button state changes
  useEffect(() => {
    if (Number(stakeAmount) > Number(approvedAmount)) {
      setIsApproved(false);
    } else if (Number(stakeAmount) <= Number(approvedAmount) && Number(approvedAmount) > 0) {
      setIsApproved(true);
    }
  }, [stakeAmount, approvedAmount]);

  // Helper function to format numbers based on their size
  const formatNumber = (number) => {
    const num = Number(number);
    
    if (num >= 1000000) { // 6+ digits
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    } else if (num >= 10000) { // 4+ digits
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } else {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 6,
        maximumFractionDigits: 6
      });
    }
  };

  // Add the formatTimeProgress function
  const formatTimeProgress = (elapsed, duration) => {
    if (!elapsed || !duration) return '0%';
    const progress = (elapsed / duration) * 100;
    return `${Math.min(100, Math.max(0, progress)).toFixed(1)}%`;
  };

  const formatTimeLeft = (elapsed, duration) => {
    if (!elapsed || !duration) return '0 days';
    const timeLeft = Math.max(0, duration - elapsed);
    const days = Math.floor(timeLeft / (24 * 60 * 60));
    return `${days} days`;
  };

  return (
    <div className="bg-white text-black container mx-auto px-4 max-w-[100vw] overflow-x-hidden relative min-h-[100dvh] flex flex-col pb-16">
      <AIChatBubble />
      <ConnectWallet setAddress={address} onChainChanged={handleChainChanged} />

      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
      >
        ← Back
      </button>

      <div className="flex flex-col items-center mb-4 mt-16 sm:mt-28">
        <div className="w-full max-w-md mb-6 p-6 bg-yellow-50 border-2 border-yellow-500 rounded-[2rem] text-center shadow-lg">
          <div className="flex items-center justify-center gap-4">
            <img 
              src={rabbiImage} 
              alt="Rabbi" 
              className="w-16 h-16 rounded-full object-cover border-2 border-yellow-500"
            />
            <p className="text-yellow-800 font-bold text-lg">
              Oy vey! Staking is being upgraded and currently disabled, will be re-enabled soon
            </p>
          </div>
        </div>

        <div className="w-full max-w-md p-6 rounded-[2rem] border-2 border-blue-600 text-center space-y-4">
          <h2 className="text-2xl font-bold text-blue-600 mb-4">Staking Dashboard</h2>

          {/* Staking Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-gray-50 rounded-lg cursor-pointer" onClick={() => setShowStakingDetails(true)}>
              <p className="text-sm text-gray-600">Staked Balance</p>
              <p className="text-lg font-bold">{formatNumber(stakedBalance)} SHEKEL</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Available Balance</p>
              <p className="text-lg font-bold">{formatNumber(userBalance)} SHEKEL</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Pending Rewards</p>
              <p className="text-lg font-bold text-green-600">{formatNumber(rewards)} SHEKEL</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Selected APY</p>
              <p className="text-lg font-bold text-green-600">{STAKING_TIERS[selectedTier].apy}</p>
            </div>
          </div>

          {/* Staking Tiers */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {STAKING_TIERS.map((tier, index) => (
              <button
                key={tier.name}
                onClick={() => setSelectedTier(index)}
                className={`p-3 rounded-lg transition-all ${
                  selectedTier === index
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <div className="text-sm font-bold">{tier.name}</div>
                <div className="text-xs">{tier.lockPeriod}</div>
                <div className="text-sm font-bold text-green-500">{tier.apy}</div>
              </button>
            ))}
          </div>

          {/* Staking Input */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="Enter amount to stake"
                value={stakeAmount}
                onChange={handleStakeAmountChange}
                className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => setStakeAmount(userBalance)}
                className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700"
              >
                MAX
              </button>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {!isApproved ? (
                <button
                  onClick={handleApprove}
                  disabled={true}
                //   disabled={isLoading || !isConnected}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                  {isLoading ? 'Processing...' : 'Approve Staking Contract'}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleStake}
                    disabled={true}
                    // disabled={isProcessingStake || !stakeAmount || Number(stakeAmount) <= 0 || !isConnected}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                  >
                    {isProcessingStake ? 'Processing...' : `Stake for ${STAKING_TIERS[selectedTier].lockPeriod}`}
                  </button>
                  
                  {/* <button
                    onClick={handleUnstake}
                    disabled={isProcessingUnstake || Number(stakedBalance) <= 0 || !isConnected}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                  >
                    {isProcessingUnstake ? 'Processing...' : 'Unstake'}
                  </button> */}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Staking Details Modal */}
      {showStakingDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Staking Details</h3>
              <button 
                onClick={() => setShowStakingDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {stakingDetails.length > 0 ? (
              <div className="space-y-4">
                {stakingDetails.map((detail, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Staked Amount</p>
                        <p className="text-lg font-bold">{formatNumber(detail.amount)} SHEKEL</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tier</p>
                        <p className="text-lg font-bold">{STAKING_TIERS[detail.tier].name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">APY</p>
                        <p className="text-lg font-bold text-green-600">{STAKING_TIERS[detail.tier].apy}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Pending Reward</p>
                        <p className="text-lg font-bold text-green-600">{formatNumber(detail.reward)} SHEKEL</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Progress</p>
                        <p className="text-lg font-bold">
                          {formatTimeProgress(detail.elapsed, detail.duration).percentage}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTimeProgress(detail.elapsed, detail.duration).timeDisplay}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p className={`text-lg font-bold ${detail.isClaimable ? 'text-green-600' : 'text-yellow-600'}`}>
                          {detail.isClaimable ? 'Ready to Claim' : 'Locked'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowStakingDetails(false);
                        handleUnstake(index);
                      }}
                      disabled={isLoading}
                      className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                        detail.isClaimable 
                          ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400'
                          : 'bg-yellow-600 text-white hover:bg-yellow-700 disabled:bg-gray-400'
                      }`}
                    >
                      {isLoading ? 'Processing...' : (detail.isClaimable ? 'Claim Rewards' : 'Early Withdraw (1% Penalty)')}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500">No staking details available</p>
            )}
          </div>
        </div>
      )}

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
    </div>
  );
};

export default StakingPage; 