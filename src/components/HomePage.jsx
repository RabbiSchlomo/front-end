import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';
import Web3 from 'web3';
import mainLogoWide from '../assets/main_logo_wide.jpg';
import aiImg from '../assets/ai_img.jpg';
import tokenImg from '../assets/token_img.jpg';
import kosherCapital from '../assets/kosher_capital.jpg';
import mainLogoDescription from '../assets/main_logo_w_description.jpg';
import rabbiSchlomo from '../assets/rabbi_schlomo.jpg';
import ConnectWallet from './ConnectWallet';
import { useNavigate } from 'react-router-dom';
import { BsChatFill } from 'react-icons/bs';
import AIChatBubble from './AIChatBubble';

const MIN_BALANCE_FOR_GOLD_PARTNER_ROOM = 1000000;
const MIN_BALANCE_FOR_BOARD_ROOM = 10000000;

const calculateProgress = (current, target) => {
  const progress = Math.min((Number(current) / target) * 100, 100);
  return Math.max(0, progress); // Returns 0-100
};

const HomePage = () => {
  const { address, isConnected } = useAccount();
  const [holders, setHolders] = useState([]);
  const [userBalance, setUserBalance] = useState(null);
  const [mcap, setMcap] = useState(null);
  const [shekelPrice, setShekelPrice] = useState(null);
  const [calculationDetails, setCalculationDetails] = useState({
    virtualPrice: null,
    virtualBalance: null,
    shekelBalance: null
  });
  const [showUsdValue, setShowUsdValue] = useState(false);
  const navigate = useNavigate();

  // Initialize viem public client
  const publicClient = createPublicClient({
    chain: base,
    transport: http()
  });

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
      if (isConnected && address) {
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
          
          setUserBalance(formattedBalance);
        } catch (error) {
          console.error('Detailed error fetching balance:', error);
          setUserBalance(0);
        }
      } else {
        console.log('Not fetching balance - Connected:', isConnected, 'Address:', address);
      }
    };

    fetchUserBalance();
  }, [isConnected, address]);

  useEffect(() => {
    const fetchPricesAndCalculate = async () => {
      try {
        // Check cache first
        const cachedData = localStorage.getItem('coingeckoPrice');
        const cachedTimestamp = localStorage.getItem('coingeckoPriceTimestamp');
        const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
        
        let priceData;
        if (cachedData && cachedTimestamp && (Date.now() - Number(cachedTimestamp)) < CACHE_DURATION) {
          priceData = JSON.parse(cachedData);
        } else {
          const priceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=virtual-protocol&vs_currencies=USD');
          priceData = await priceResponse.json();
          
          localStorage.setItem('coingeckoPrice', JSON.stringify(priceData));
          localStorage.setItem('coingeckoPriceTimestamp', Date.now().toString());
        }

        const virtualPrice = priceData['virtual-protocol'].usd;

        // Updated contract addresses
        const web3 = new Web3('https://mainnet.base.org');
        const minABI = [
          {
            "constant": true,
            "inputs": [{"name": "_owner", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "balance", "type": "uint256"}],
            "type": "function"
          }
        ];

        const virtualContract = new web3.eth.Contract(minABI, '0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b');
        const shekelContract = new web3.eth.Contract(minABI, '0x5f6a682a58854c7fbe228712aeeffccde0008ac0');
        
        // Updated pool contract address
        const poolAddress = '0xded72b40970af70720adbc5127092f3152392273';
        const [virtualBalance, shekelBalance] = await Promise.all([
          virtualContract.methods.balanceOf(poolAddress).call(),
          shekelContract.methods.balanceOf(poolAddress).call()
        ]);

        const virtualBalanceInEther = web3.utils.fromWei(virtualBalance, 'ether');
        const shekelBalanceInEther = web3.utils.fromWei(shekelBalance, 'ether');
        
        // Calculate total virtual value in USD
        const virtualValueInUSD = virtualPrice * virtualBalanceInEther;
        // Calculate shekel price by dividing virtual USD value by shekel balance
        const price = virtualValueInUSD / shekelBalanceInEther;
        setShekelPrice(price);
        
        setCalculationDetails({
          virtualPrice,
          virtualBalance: virtualBalanceInEther,
          shekelBalance: shekelBalanceInEther
        });

        // Calculate mcap using the new shekel price
        const virtualData = await fetch('https://api.virtuals.io/api/virtuals/8290?populate[0]=image&populate[1]=creator&populate[2]=tier').then(res => res.json());
        const value = Number(virtualData.data.virtualTokenValue) / 1000000000;
        setMcap(value * virtualPrice);

      } catch (error) {
        console.error('Error fetching prices and calculating values:', error);
      }
    };

    fetchPricesAndCalculate();
  }, []);

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getUserLevel = (balance) => {
    const balanceNum = Number(balance);
    if (!balanceNum) return 'Holder';
    if (balanceNum >= 10000000) return 'Board Member';
    if (balanceNum >= 1000000) return 'Gold Partner';
    return 'Holder';
  };

  const getUsdValue = () => {
    if (!userBalance || !shekelPrice) return '0';
    const usdValue = userBalance * shekelPrice;
    return usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="bg-white text-black container mx-auto px-4 max-w-[100vw] overflow-x-hidden relative min-h-[100dvh] flex flex-col justify-center pb-16">
      <AIChatBubble />
      {/* Connect Wallet Section */}
      <ConnectWallet />

      {/* Hero Section - adjusted margin */}
      <div className="flex flex-col items-center mb-4 mt-6">
        <img src={mainLogoDescription} alt="Kosher Capital Logo" className="w-full max-w-2xl mb-6" />
        
        {/* Mobile Action Buttons - adjusted margin */}
        <div className="flex gap-4 w-full max-w-sm justify-center mb-6">
          <button 
            onClick={() => navigate('/staking')} 
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            Stake
          </button>
          <button 
            onClick={() => navigate('/buy')} 
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            Buy
          </button>
          <button 
            onClick={() => navigate('/funds')}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            Funds
          </button>
        </div>

       

        {/* Price and Market Cap - adjusted margins */}
        {shekelPrice && calculationDetails.virtualPrice && (
          <div className="relative group opacity-0 animate-fadeIn mb-3">
            <p className="text-lg text-gray-600 cursor-help font-bold">
              Shekel Price: ${shekelPrice.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 })}
            </p>
            <div className="absolute hidden group-hover:block z-10 w-[280px] sm:w-96 p-2 sm:p-4 bg-gray-800 text-white text-xs sm:text-sm rounded-lg shadow-lg -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full mx-2">
              <div className="text-center mb-1 sm:mb-2 font-semibold">Price Calculation:</div>
              <div className="space-y-1 sm:space-y-2">
                <div className="border-b border-gray-600 pb-1 sm:pb-2">
                  <p className="font-medium">Virtual Token Price:</p>
                  <p className="text-gray-300">${calculationDetails.virtualPrice.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 })}</p>
                </div>
                <div className="border-b border-gray-600 pb-1 sm:pb-2">
                  <p className="font-medium">Virtual Balance in Contract:</p>
                  <p className="text-gray-300">{Number(calculationDetails.virtualBalance).toLocaleString()} VIRTUAL</p>
                </div>
                <div className="border-b border-gray-600 pb-1 sm:pb-2">
                  <p className="font-medium">Shekel Balance in Contract:</p>
                  <p className="text-gray-300">{Number(calculationDetails.shekelBalance).toLocaleString()} SHKL</p>
                </div>
                <div className="pt-1 sm:pt-2">
                  <p className="font-medium">Formula:</p>
                  <p className="text-gray-300">(VIRTUAL Price × VIRTUAL Balance) ÷ SHKL Balance</p>
                </div>
              </div>
              <div className="mt-2 sm:mt-4 text-center space-y-1 sm:space-y-2">
                <a 
                  href="https://basescan.org/address/0xf42732626cd72c78597f817e74fd3340fd3f375a" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-300 hover:text-blue-400 text-xs underline block"
                >
                  View Contract on BaseScan
                </a>
                <div className="text-xs text-gray-400">
                  <p className="mt-1">Note: Calculated price may not be accurate</p>
                  <a 
                    href="https://fun.virtuals.io/agents/0x365119d015112a70C79EECf65A4451E7973d311a" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-300 hover:text-blue-400 underline"
                  >
                    Confirm price on Fun Virtuals
                  </a>
                </div>
              </div>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-gray-800 rotate-45"></div>
            </div>
          </div>
        )}
        
        {/* Display Virtual Token Value */}
        {mcap && (
          <p className="text-lg text-gray-600 mb-4 opacity-0 animate-fadeIn animation-delay-200 font-bold">
            Market Cap: ${mcap.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        )}

        {/* New Balance and Level Display - Updated styling */}
        <div className="w-full max-w-md p-4 sm:p-6 rounded-[2rem] border-2 border-blue-600 text-center space-y-2 mx-auto">
          <p 
            className="text-base sm:text-lg font-medium cursor-pointer hover:opacity-80"
            onClick={() => setShowUsdValue(!showUsdValue)}
          >
            Balance: {showUsdValue 
              ? `$${getUsdValue()}`
              : `${userBalance ? Number(userBalance).toLocaleString() : '0'} SHEKEL`}
          </p>
          <p className="text-base sm:text-lg font-medium text-blue-600">
            Level: {getUserLevel(userBalance)}
          </p>
          {/* Protected Room Buttons - With visual progress indicator */}
          <div className="flex gap-2 sm:gap-4 w-full justify-center mt-3">
            <div className="flex-1">
              <button 
                onClick={() => Number(userBalance) >= MIN_BALANCE_FOR_GOLD_PARTNER_ROOM ? navigate('/gold-partner-room') : null}
                className={`relative w-full py-1.5 sm:py-2 px-2 sm:px-3 rounded-[1.5rem] font-medium transition-all shadow-md text-sm sm:text-base overflow-hidden ${Number(userBalance) >= MIN_BALANCE_FOR_GOLD_PARTNER_ROOM ? 'hover:opacity-90' : 'cursor-not-allowed'}`}
                style={{
                  background: Number(userBalance) >= MIN_BALANCE_FOR_GOLD_PARTNER_ROOM 
                    ? '#B8860B'
                    : `linear-gradient(to right, #B8860B ${calculateProgress(userBalance || 0, MIN_BALANCE_FOR_GOLD_PARTNER_ROOM)}%, #B8860B33 ${calculateProgress(userBalance || 0, MIN_BALANCE_FOR_GOLD_PARTNER_ROOM)}%)`
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 text-white">
                    <BsChatFill className="text-lg sm:text-xl" />
                    <span>Gold Partner</span>
                  </div>
                </div>
              </button>
              {Number(userBalance) < MIN_BALANCE_FOR_GOLD_PARTNER_ROOM && (
                <p className="text-xs text-gray-600 mt-1">
                  Requires {MIN_BALANCE_FOR_GOLD_PARTNER_ROOM.toLocaleString()} SHEKEL
                </p>
              )}
            </div>
            
            <div className="flex-1">
              <button 
                onClick={() => Number(userBalance) >= MIN_BALANCE_FOR_BOARD_ROOM ? navigate('/board-member-room') : null}
                className={`relative w-full py-1.5 sm:py-2 px-2 sm:px-3 rounded-[1.5rem] font-medium transition-all shadow-md text-sm sm:text-base overflow-hidden ${Number(userBalance) >= MIN_BALANCE_FOR_BOARD_ROOM ? 'hover:opacity-90' : 'cursor-not-allowed'}`}
                style={{
                  background: Number(userBalance) >= MIN_BALANCE_FOR_BOARD_ROOM 
                    ? '#9333ea'
                    : `linear-gradient(to right, #9333ea ${calculateProgress(userBalance || 0, MIN_BALANCE_FOR_BOARD_ROOM)}%, #9333ea33 ${calculateProgress(userBalance || 0, MIN_BALANCE_FOR_BOARD_ROOM)}%)`
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 text-white">
                    <BsChatFill className="text-lg sm:text-xl" />
                    <span>Board Member</span>
                  </div>
                </div>
              </button>
              {Number(userBalance) < MIN_BALANCE_FOR_BOARD_ROOM && (
                <p className="text-xs text-gray-600 mt-1">
                  Requires {MIN_BALANCE_FOR_BOARD_ROOM.toLocaleString()} SHEKEL
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 