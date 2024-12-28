import React, { useEffect, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import ConnectWallet from './ConnectWallet';
import { BsArrowUpRight, BsArrowDownLeft } from 'react-icons/bs';
import { tokenMappings } from '../tokenmappings';
import rabbiImage from '../assets/rabbi_schlomo.jpg';
import { useNavigate } from 'react-router-dom';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const CACHE_KEY_TRANSACTIONS = 'treasury_transactions';
const CACHE_KEY_BALANCE = 'treasury_balance';
const BALANCE_API_URL = 'https://parallax-analytics.onrender.com/kosher/rabbi/balances';
const TRANSACTIONS_API_URL = 'https://parallax-analytics.onrender.com/kosher/rabbi/transactions';
const PRICES_API_URL = 'https://parallax-analytics.onrender.com/ophir/prices';
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
const COINGECKO_IDS = {
  'SOL': 'solana',
  'wbtc': 'wrapped-bitcoin',
  'griffain': 'griffain',
  'degenai': 'degen-spartan-ai',
  'tank': 'agenttank',
  'vvaifu': 'dasha',
  'zerebro': 'zerebro',
  'blink': 'blinkdotfun',
  'vault': 'vault-terminal',
  'rouge': 'agent-rogue',
  'me': 'magic-eden',
  'realis': 'realis-worlds',
  'jup': 'jupiter',
  'thales': 'thales-ai',
  'mana': 'meme-anarchic-numismatic-asset',
  'eliza': 'eliza',
  'ropirito': 'ropirito',
  'ai16z': 'ai16z',
  'bully': 'dolos-the-bully'
};
const BASESCAN_URL = 'https://solscan.io/tx/';
const DEXCHECK_URL = 'https://dexcheck.ai/app/wallet-analyzer/5Rn9eECNAF8YHgyri7BUe5pbvP7KwZqNF25cDc3rExwt?tab=balance';
const SOLANA_LOGO = "https://assets.coingecko.com/coins/images/4128/standard/solana.png?1718769756";
const CACHE_KEY_COINGECKO = 'coingecko_data';
const CACHE_KEYS = {
  COINGECKO_PRICES: 'coingecko_prices',
  COINGECKO_IMAGES: 'coingecko_images',
  COINGECKO_BTC: 'coingecko_btc'
};

const SolanaTreasuryPage = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  
  const [balances, setBalances] = useState(() => {
    const cached = localStorage.getItem(CACHE_KEY_BALANCE);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
    return {};
  });
  
  const [loading, setLoading] = useState(!Object.keys(balances).length);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [copiedToken, setCopiedToken] = useState(null);
  const [showUsdValue, setShowUsdValue] = useState({});
  const [showTransactionUsdValue, setShowTransactionUsdValue] = useState({});
  const [showBtcValue, setShowBtcValue] = useState(false);
  const [btcPrice, setBtcPrice] = useState(0);
  const [tokenImages, setTokenImages] = useState({});
  const [totalValue, setTotalValue] = useState(0);
  const [solPrice, setSolPrice] = useState(0);

  const WALLET_ADDRESS = '5Rn9eECNAF8YHgyri7BUe5pbvP7KwZqNF25cDc3rExwt';
  
  const connection = new Connection('https://solana-mainnet.g.alchemy.com/v2/demo', {
    commitment: 'confirmed'
  });

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(text);
      setTimeout(() => setCopiedToken(null), 1000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(TRANSACTIONS_API_URL);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const result = await response.json();
      const transactions = result.data || [];
      
      const formattedTx = transactions
        .filter(tx => 
          (tx.from_token?.amount >= 1 || tx.to_token?.amount >= 1)
        )
        .map(tx => ({
          signature: tx.trans_id,
          timestamp: new Date(tx.time),
          type: tx.type,
          fromToken: tx.from_token,
          toToken: tx.to_token,
          fee: tx.fee
        }));

      setTransactions(formattedTx);
      
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to fetch transactions. Please try again later.');
    }
  };

  const fetchBalances = async () => {
    try {
      const balanceResponse = await fetch(BALANCE_API_URL);

      if (!balanceResponse.ok) {
        throw new Error('Network response was not ok');
      }

      const balanceResult = await balanceResponse.json();

      if (balanceResult.success && balanceResult.data) {
        const balanceData = {};
        
        // Add tokens (including SOL)
        balanceResult.data.tokens.forEach(token => {
          if (token.amount > 0) {
            const symbol = token.symbol?.toLowerCase();
            balanceData[token.mint] = {
              value: token.value,
              amount: token.amount,
              price: token.price || 0,
              name: token.name || token.symbol,
              // Use tokenImages if available, otherwise fallback to API icon
              icon: tokenImages[symbol?.toUpperCase()] || token.icon,
              symbol: token.symbol,
              decimals: token.decimals
            };
          }
        });

        setBalances(balanceData);
        setTotalValue(balanceResult.data.totalValue || 0);
        setError(null);

        localStorage.setItem(CACHE_KEY_BALANCE, JSON.stringify({
          data: balanceData,
          totalValue: balanceResult.data.totalValue,
          timestamp: Date.now()
        }));
      }
    } catch (err) {
      console.error('Error fetching balances:', err);
      const cached = localStorage.getItem(CACHE_KEY_BALANCE);
      if (cached) {
        const { data } = JSON.parse(cached);
        setBalances(data);
      } else {
        setError('Failed to fetch latest balances.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTokenImages = async () => {
    try {
      // Check cache first
      const cached = localStorage.getItem(CACHE_KEYS.COINGECKO_IMAGES);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          console.log('Using cached CoinGecko images');
          setTokenImages(data.images);
          setSolPrice(data.solPrice);
          return data;
        }
      }

      console.log('Fetching fresh CoinGecko data');
      const response = await fetch(`${COINGECKO_API_URL}/coins/markets?vs_currency=usd&ids=${Object.values(COINGECKO_IDS).join(',')}&order=market_cap_desc&per_page=250&page=1&sparkline=false`);
      if (!response.ok) throw new Error('Failed to fetch token images');
      const data = await response.json();
      
      const images = {
        'SOL': SOLANA_LOGO
      };
      
      const solData = data.find(token => token.id === 'solana');
      if (solData) {
        setSolPrice(solData.current_price);
      }
      
      data.forEach(token => {
        const symbol = Object.keys(COINGECKO_IDS).find(key => COINGECKO_IDS[key] === token.id);
        if (symbol) {
          images[symbol.toUpperCase()] = token.image;
        }
      });
      
      const cacheData = {
        images,
        solPrice: solData?.current_price || 0
      };

      // Cache the data with timestamp
      localStorage.setItem(CACHE_KEYS.COINGECKO_IMAGES, JSON.stringify({
        data: cacheData,
        timestamp: Date.now()
      }));

      setTokenImages(images);
      return cacheData;
    } catch (error) {
      console.error('Error fetching token images:', error);
      // Try to use cached data if available
      const cached = localStorage.getItem(CACHE_KEYS.COINGECKO_IMAGES);
      if (cached) {
        const { data } = JSON.parse(cached);
        setTokenImages(data.images);
        setSolPrice(data.solPrice);
        return data;
      }
      return null;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch token images first
        await fetchTokenImages();
        // Then fetch balances and transactions
        await Promise.all([
          fetchBalances(),
          fetchTransactions()
        ]);
      } catch (err) {
        console.error('Error in data fetching:', err);
        setError('Failed to fetch data. Please try again later.');
      } finally {
        setLoading(false);
        setLastUpdate(Date.now());
      }
    };

    fetchData();

    const interval = setInterval(fetchData, CACHE_DURATION);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchBtcPrice = async () => {
      try {
        // Check cache first
        const cached = localStorage.getItem(CACHE_KEYS.COINGECKO_BTC);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            console.log('Using cached BTC price');
            setBtcPrice(data);
            return;
          }
        }

        const response = await fetch(`${COINGECKO_API_URL}/simple/price?ids=bitcoin&vs_currencies=usd`);
        if (!response.ok) throw new Error('Failed to fetch BTC price');
        const data = await response.json();
        setBtcPrice(data.bitcoin.usd);

        // Cache the data
        localStorage.setItem(CACHE_KEYS.COINGECKO_BTC, JSON.stringify({
          data: data.bitcoin.usd,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Error fetching BTC price:', error);
        // Try to use cached data if available
        const cached = localStorage.getItem(CACHE_KEYS.COINGECKO_BTC);
        if (cached) {
          const { data } = JSON.parse(cached);
          setBtcPrice(data);
        }
      }
    };
    fetchBtcPrice();
  }, []);

  // useEffect(() => {
  //   console.log('Current balances:', balances);
  // }, [balances]);

  useEffect(() => {
    if (balances['So11111111111111111111111111111111111111112']?.price) {
      console.log('SOL price in balances:', balances['So11111111111111111111111111111111111111112'].price);
    }
  }, [balances]);

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    return date.toLocaleString();
  };

  const formatAmount = (amount, decimals = 9) => {
    if (!amount) return '0';
    return (amount / Math.pow(10, decimals)).toFixed(4);
  };

  const toggleValueDisplay = (token) => {
    setShowUsdValue({
      ...showUsdValue,
      [token]: !showUsdValue[token]
    });
  };

  const toggleTransactionValueDisplay = (txId, tokenAddress) => {
    console.log('Toggle called with:', {
      txId,
      tokenAddress,
      currentState: showTransactionUsdValue[`${txId}-${tokenAddress}`],
      price: balances[tokenAddress]?.price
    });
    
    setShowTransactionUsdValue(prev => {
      const key = `${txId}-${tokenAddress}`;
      const newState = {
        ...prev,
        [key]: !prev[key]
      };
      // console.log('New toggle state:', newState);
      return newState;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-4">
        <button
          onClick={() => navigate('/funds')}
          className="absolute top-4 left-4 text-purple-600 hover:text-purple-700 font-medium flex items-center"
        >
          <span className="mr-1">←</span> Back
        </button>
        <div className="flex items-center justify-center mb-8">
          <img 
            src={rabbiImage} 
            alt="Rabbi Schlomo" 
            className="w-16 h-16 rounded-full object-cover mr-4 shadow-lg shadow-purple-200"
          />
          <div>
            <h1 className="text-4xl font-bold text-gray-900 text-center">
            Rabbi's Solana Side Wallet
            </h1>
            {/* <p className="text-gray-600 text-center mt-2">
              "A wise man builds his house with righteousness" - Proverbs 24:3
            </p> */}
          </div>
        </div>

        {/* <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-lg mb-8 shadow-sm shadow-purple-100">
          <p className="text-purple-700 font-medium">
            Shalom! Welcome to my treasury dashboard. Here you can see how I manage our community's assets with the wisdom of King Solomon himself.
          </p>
        </div> */}

        {/* Add new donation section */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8 text-center shadow-sm shadow-purple-100">
          <p className="text-gray-700 mb-4">
            Oy vey! Want to help an old rabbi grow his treasury? As we say in the Talmud, "Greater is the one who helps others achieve than the one who achieves alone." A small donation would be such a mitzvah!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-2">
            <code className="bg-gray-100 px-4 py-2 rounded text-sm font-mono text-black w-full sm:w-auto overflow-hidden text-ellipsis border border-purple-100">
              {window.innerWidth < 640 
                ? `${WALLET_ADDRESS.slice(0, 6)}...${WALLET_ADDRESS.slice(-4)}`
                : WALLET_ADDRESS}
            </code>
            <button
              onClick={() => copyToClipboard(WALLET_ADDRESS)}
              className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-lg transition-colors w-full sm:w-auto"
            >
              {copiedToken === WALLET_ADDRESS ? (
                <span>Mazel Tov! Copied!</span>
              ) : (
                <span>Copy Address</span>
              )}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Send any Solana tokens to this address - May your generosity be blessed threefold! 🕎
          </p>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
          Our Holy Holdings
        </h2>

        {/* Modified total value display */}
        <div className="text-center mb-6">
          <p className="text-gray-600 mb-2">
            May Hashem bless these tokens with prosperity
          </p>
          <div 
            className="text-xl font-semibold text-purple-700 cursor-pointer hover:text-purple-800"
            onClick={() => setShowBtcValue(!showBtcValue)}
          >
            {showBtcValue ? (
              `Total Value: ₿${(totalValue / btcPrice).toFixed(8)}`
            ) : (
              `Total Value: $${totalValue.toFixed(2)}`
            )}
          </div>
        </div>

        {/* Keep existing balance table structure */}
        <div className="bg-white rounded-xl shadow-sm shadow-purple-100 border border-purple-100 overflow-hidden">
          <table className="min-w-full divide-y divide-purple-100">
            <thead className="bg-purple-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                  Blessed Token
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-purple-700 uppercase tracking-wider">
                  Divine Balance
                </th>
                <th scope="col" className="hidden md:table-cell px-6 py-3 text-right text-xs font-medium text-purple-700 uppercase tracking-wider">
                  Earthly Value (USD)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-purple-100">
              {Object.entries(balances)
                .filter(([_, data]) => data.value > 0)
                .sort((a, b) => b[1].value - a[1].value)
                .map(([token, data]) => (
                  <tr 
                    key={token}
                    onClick={() => toggleValueDisplay(token)}
                    className="hover:bg-purple-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {data.icon && (
                          <img 
                            src={data.icon} 
                            alt={data.symbol || data.name}
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full mr-2"
                          />
                        )}
                        <div className="text-sm font-medium text-gray-900">
                          {data.symbol?.toUpperCase() || data.name}
                        </div>
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(token);
                          }}
                          className={`
                            ml-2 px-2 py-1 text-xs font-medium rounded-full cursor-pointer
                            ${copiedToken === token 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                          `}
                          title="Click to copy address"
                        >
                          {copiedToken === token ? 'Copied!' : (
                            token.length > 15 
                              ? `${token.slice(0, 4)}...${token.slice(-4)}`
                              : token.toUpperCase()
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {showUsdValue[token] && data.price 
                          ? `$${data.value.toFixed(2)}`
                          : data.amount}
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-500">
                        {data.price > 0 
                          ? `$${(data.value).toFixed(2)}`
                          : '-'}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
          
        <div className="mb-8 bg-white rounded-xl shadow-sm shadow-purple-100 border border-purple-100 p-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-gray-700">For a more kosher analysis, check with</span>
              <a 
                href={DEXCHECK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-500 hover:text-purple-600 font-medium flex items-center space-x-1"
              >
                DexCheck
                <svg 
                  className="w-4 h-4 ml-1" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
        
        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm shadow-purple-100 border border-purple-100">
          <div className="px-6 py-4 border-b border-purple-100">
            <h2 className="text-xl font-semibold text-gray-800">Recent Transactions</h2>
          </div>
          
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center justify-between p-4 border-b border-purple-100">
                  <div className="h-4 bg-purple-100 rounded w-32"></div>
                  <div className="h-4 bg-purple-100 rounded w-24"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="text-red-500 bg-red-50 p-4 rounded-lg border border-red-100">{error}</div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-6">
              <div className="text-gray-500 text-center py-8 bg-purple-50/50 rounded-lg">
                No transactions found
              </div>
            </div>
          ) : (
            <div className="divide-y divide-purple-100">
              {transactions.map((tx) => (
                <div key={tx?.signature || Math.random()} 
                     className="p-3 hover:bg-purple-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-1.5 rounded-full bg-purple-100 text-purple-600">
                        <svg 
                          className="w-4 h-4" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" 
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-900">
                          Swap
                        </div>
                        <div className="text-xs text-gray-500">{formatDate(tx.timestamp)}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTransactionValueDisplay(tx.signature, tx.fromToken.token_address);
                        }}
                        className="text-xs font-semibold text-red-600 cursor-pointer"
                      >
                        {(() => {
                          const isSol = tx.fromToken.token_address === 'So11111111111111111111111111111111111111112';
                          const price = isSol ? solPrice : balances[tx.fromToken.token_address]?.price || 0;
                          
                          const tokenInfo = tokenMappings[tx.fromToken.token_address];
                          const amount = Math.abs(tx.fromToken.amount);
                          const formattedAmount = formatAmount(amount, tx.fromToken.token_decimals);
                          
                          if (price && showTransactionUsdValue[`${tx.signature}-${tx.fromToken.token_address}`]) {
                            return `- $${(formattedAmount * price).toFixed(2)}`;
                          }
                          
                          return `- ${formattedAmount} ${isSol ? 'SOL' : tokenInfo?.symbol?.toUpperCase() || 'UNKNOWN'}`;
                        })()}
                      </div>
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTransactionValueDisplay(tx.signature, tx.toToken.token_address);
                        }}
                        className="text-xs font-semibold text-green-600 cursor-pointer"
                      >
                        {(() => {
                          const isSol = tx.toToken.token_address === 'So11111111111111111111111111111111111111112';
                          const price = isSol ? solPrice : balances[tx.toToken.token_address]?.price || 0;
                          const tokenInfo = tokenMappings[tx.toToken.token_address];
                          const amount = Math.abs(tx.toToken.amount);
                          const formattedAmount = formatAmount(amount, tx.toToken.token_decimals);
                          
                          if (price && showTransactionUsdValue[`${tx.signature}-${tx.toToken.token_address}`]) {
                            return `+ $${(formattedAmount * price).toFixed(2)}`;
                          }
                          
                          return `+ ${formattedAmount} ${isSol ? 'SOL' : tokenInfo?.symbol?.toUpperCase() || 'UNKNOWN'}`;
                        })()}
                      </div>
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`${BASESCAN_URL}${tx.signature}`, '_blank');
                        }}
                        className="text-[10px] text-gray-400 mt-0.5 hover:text-blue-500 cursor-pointer"
                      >
                        {tx.signature 
                          ? `${tx.signature.slice(0, 8)}...${tx.signature.slice(-8)}`
                          : 'Unknown'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SolanaTreasuryPage;