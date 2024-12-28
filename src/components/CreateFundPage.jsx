import React, { useState, memo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Snackbar, Alert } from '@mui/material';
import internBenny from '../assets/intern_benny.jpg';
import miriamCohen from '../assets/miriam_cohen.jpg';
import rabbiSchlomo from '../assets/rabbi_schlomo.jpg';
import blueStar from '../assets/android-chrome-512x512.png';
import { useAccount } from 'wagmi';
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';
import ConnectWallet from './ConnectWallet';

const MIN_BALANCE_FOR_FUND_APPLICATION = 1000000; // 1 million SHEKEL

// Create a memoized allocation slider component
const AllocationSlider = memo(({ label, value, onChange, isLocked }) => (
  <div className="space-y-1 md:space-y-2">
    <div className="flex justify-between items-center text-sm font-medium text-gray-800">
      <span>{label}</span>
      <span>{value}%</span>
    </div>
    <input
      type="range"
      min="0"
      max="100"
      value={value}
      onChange={onChange}
      disabled={isLocked}
      className={`w-full accent-blue-600 h-2 ${isLocked ? 'opacity-60' : ''}`}
    />
  </div>
));

// Move AllocationStep to a separate component to prevent re-renders
const AllocationStep = memo(({ onComplete, initialValues }) => {
  const [total, setTotal] = useState(0);
  const [allocations, setAllocations] = useState(initialValues || {
    btc: 0,
    majorsAndL1s: 0,
    aiInfrastructure: 0,
    aiAgents: 0,
    altcoins: 0,
    memecoins: 0,
  });

  useEffect(() => {
    if (initialValues) {
      setAllocations(initialValues);
      setTotal(Object.values(initialValues).reduce((sum, val) => sum + val, 0));
    }
  }, [initialValues]);

  useEffect(() => {
    const newTotal = Object.values(allocations).reduce((sum, val) => sum + Number(val), 0);
    setTotal(newTotal);
  }, [allocations]);

  const handleChange = (field, value) => {
    const newValue = parseInt(value) || 0;
    const newAllocations = { ...allocations, [field]: newValue };
    setAllocations(newAllocations);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="sticky top-8 md:top-0 bg-white p-2 -mx-2 z-10">
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium text-gray-800">
            Total allocation: {total}%
            {total !== 100 && (
              <span className="text-red-600 ml-1">(Must equal 100%)</span>
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6">
        {Object.entries({
          btc: 'BTC',
          majorsAndL1s: 'Majors and L1s',
          aiInfrastructure: 'AI Infrastructure',
          aiAgents: 'AI Agents',
          altcoins: 'Altcoins',
          memecoins: 'Memecoins'
        }).map(([key, label]) => (
          <AllocationSlider
            key={key}
            label={label}
            value={allocations[key]}
            onChange={(e) => handleChange(key, e.target.value)}
            isLocked={false}
          />
        ))}
      </div>

      <button
        onClick={() => {
          if (total === 100) {
            onComplete(allocations);
          }
        }}
        disabled={total !== 100}
        className={`w-full p-3 md:p-4 rounded-lg ${
          total === 100
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            : 'bg-gray-100 text-gray-500 cursor-not-allowed'
        }`}
      >
        Save and Continue
      </button>
    </div>
  );
});

// Create a memoized fund description step component
const FundDescriptionStep = memo(({ description, onComplete }) => {
  const [value, setValue] = useState(description || '');

  return (
    <motion.div className="space-y-4">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full h-48 p-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 placeholder-gray-500"
        placeholder="Include any special instructions or additional information..."
      />
      <motion.button
        onClick={() => {
          if (value.trim()) {
            onComplete(value);
          }
        }}
        disabled={!value.trim()}
        className={`w-full ${
          value.trim() 
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
            : 'bg-gray-100 text-gray-500 cursor-not-allowed'
        } p-4 rounded-lg`}
      >
        Save and Continue
      </motion.button>
    </motion.div>
  );
});

const FeesStep = memo(({ fees, onComplete }) => {
  const [values, setValues] = useState(fees || { performanceFee: 0, walletAddress: '' });

  useEffect(() => {
    if (fees) {
      setValues(fees);
    }
  }, [fees]);

  return (
    <motion.div className="space-y-6">
      <div className="bg-gray-100 p-6 rounded-lg space-y-4 text-gray-800">
        <p className="font-medium text-lg">Base Fees (Non-adjustable):</p>
        <ul className="list-disc pl-5 space-y-3">
          <li>25% Performance Fee from funds profits at maturity date to SHEKEL stakers</li>
          <li>2% AUM upon completion of deposit phase to development</li>
          <li>1% Withdrawal Fee to Kosher Capital Treasury in BTC</li>
          <li>30% Early Withdraw Penalty to Kosher Capital Treasury</li>
        </ul>
      </div>

      <div className="space-y-6 text-gray-800">
        <div>
          <label className="block text-lg font-medium mb-2">Additional Performance Fee (up to 10%)</label>
          <input
            type="number"
            min="0"
            max="10"
            value={values.performanceFee}
            onChange={(e) => setValues(prev => ({
              ...prev,
              performanceFee: Math.min(10, Math.max(0, parseFloat(e.target.value) || 0))
            }))}
            className="w-full p-4 rounded-lg border border-gray-300 text-lg"
          />
        </div>

        <div>
          <label className="block text-lg font-medium mb-2">Wallet to Send Performance Fee</label>
          <input
            type="text"
            value={values.walletAddress}
            onChange={(e) => setValues(prev => ({
              ...prev,
              walletAddress: e.target.value
            }))}
            className="w-full p-4 rounded-lg border border-gray-300 text-lg"
            placeholder="Enter wallet address"
          />
        </div>
      </div>

      <div className="mt-auto pt-6 pb-24 md:pb-6">
        <button
          onClick={() => onComplete(values)}
          className="w-full bg-blue-100 text-blue-700 hover:bg-blue-200 p-4 rounded-lg text-lg font-medium"
        >
          Save and Continue
        </button>
      </div>
    </motion.div>
  );
});

const validateAllSteps = (formData) => {
  const errors = [];

  // Step 1: Blockchain and Base Currency
  if (!formData.blockchain || !formData.baseCurrency) {
    errors.push('Please complete Step 1: Choose Blockchain and Base Currency');
  }

  // Step 2: Fund Manager
  if (!formData.manager) {
    errors.push('Please complete Step 2: Choose Fund Manager');
  }

  // Step 3: Duration and Start Date
  if (!formData.duration || !formData.startDate) {
    errors.push('Please complete Step 3: Choose Duration and Start Date');
  }

  // Step 4: Risk Level
  if (!formData.riskLevel) {
    errors.push('Please complete Step 4: Set Risk Level');
  }

  // Step 5: Fund Allocation
  const totalAllocation = Object.values(formData.allocation).reduce((sum, val) => sum + val, 0);
  if (totalAllocation !== 100) {
    errors.push('Please complete Step 5: Fund Allocation must total 100%');
  }

  // Step 6: Fund Description
  if (!formData.description.trim()) {
    errors.push('Please complete Step 6: Fund Description');
  }

  // Step 7: Fees
  if (!formData.fees.walletAddress.trim()) {
    errors.push('Please complete Step 7: Set Performance Fee Wallet');
  }

  return errors;
};

const SubmitApplicationStep = memo(({ initialValues, onComplete, formData }) => {
  const { isConnected, address } = useAccount();
  const navigate = useNavigate();
  const [values, setValues] = useState(initialValues || {
    name: '',
    email: '',
    xHandle: '',
    tgHandle: '',
    stakedShekelWallet: '',
    credentials: '',
    furtherConsiderations: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const validateForm = () => {
    const newErrors = {};
    
    // Validate all previous steps first
    const stepErrors = validateAllSteps(formData);
    if (stepErrors.length > 0) {
      newErrors.steps = stepErrors;
      setErrors(newErrors);
      return false;
    }
    
    // Name validation (new)
    if (!values.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    // Email validation only if provided
    if (values.email.trim() && !/\S+@\S+\.\S+/.test(values.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Either Twitter or Telegram handle must be provided
    if (!values.xHandle.trim() && !values.tgHandle.trim()) {
      newErrors.contact = 'Please provide either a Twitter or Telegram handle';
    }

    if (!values.stakedShekelWallet.trim()) {
      newErrors.stakedShekelWallet = 'Staked SHEKEL wallet is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    if (!isConnected || !address) {
      setErrors(prev => ({
        ...prev,
        wallet: 'Please connect your wallet to submit'
      }));
      return;
    }

    if (validateForm()) {
      setIsSubmitting(true);
      try {
        // Combine all form data with application values and wallet address
        const finalFormData = {
          ...formData,
          application: values,
          walletAddress: address
        };

        const result = await submitApplication(finalFormData);
        
        if (result.success) {
          setSubmitStatus({
            type: 'success',
            message: result.message
          });
          setTimeout(() => {
            navigate('/funds');
          }, 2000);
        } else {
          setSubmitStatus({
            type: 'error',
            message: result.message
          });
        }
      } catch (error) {
        setSubmitStatus({
          type: 'error',
          message: 'An error occurred while submitting the application. Please try again.'
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <motion.div className="space-y-4 pb-20 text-gray-800">
      {!isConnected && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-6">
          <p className="text-blue-700">
            Please connect your wallet to submit your application. Your form data will be preserved.
          </p>
        </div>
      )}

      {submitStatus && (
        <div className={`${
          submitStatus.type === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
        } border-l-4 p-4 rounded-lg mb-6`}>
          <p className={`${
            submitStatus.type === 'success' ? 'text-green-700' : 'text-red-700'
          }`}>
            {submitStatus.message}
          </p>
        </div>
      )}

      <div className="space-y-1">
        <input
          placeholder="Name *"
          value={values.name}
          onChange={(e) => setValues(prev => ({ ...prev, name: e.target.value }))}
          className={`w-full p-4 rounded-lg border ${errors.name ? 'border-red-500' : 'border-gray-300'} text-lg`}
          required
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
      </div>

      <div className="space-y-1">
        <input
          type="email"
          placeholder="Email Address"
          value={values.email}
          onChange={(e) => setValues(prev => ({ ...prev, email: e.target.value }))}
          className={`w-full p-4 rounded-lg border ${errors.email ? 'border-red-500' : 'border-gray-300'} text-lg`}
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
      </div>
      
      <div className="space-y-1">
        <input
          placeholder="X Handle (e.g., @username)"
          value={values.xHandle}
          onChange={(e) => setValues(prev => ({ ...prev, xHandle: e.target.value }))}
          className={`w-full p-4 rounded-lg border ${errors.contact ? 'border-red-500' : 'border-gray-300'} text-lg`}
        />
      </div>

      <div className="space-y-1">
        <input
          placeholder="Telegram Handle (e.g., @username)"
          value={values.tgHandle}
          onChange={(e) => setValues(prev => ({ ...prev, tgHandle: e.target.value }))}
          className={`w-full p-4 rounded-lg border ${errors.contact ? 'border-red-500' : 'border-gray-300'} text-lg`}
        />
        {errors.contact && <p className="text-red-500 text-sm">{errors.contact}</p>}
      </div>

      <div className="space-y-1">
        <input
          placeholder="Amount of staked SHEKEL"
          value={values.stakedShekelWallet}
          onChange={(e) => setValues(prev => ({ ...prev, stakedShekelWallet: e.target.value }))}
          className={`w-full p-4 rounded-lg border ${errors.stakedShekelWallet ? 'border-red-500' : 'border-gray-300'} text-lg`}
        />
        {errors.stakedShekelWallet && <p className="text-red-500 text-sm">{errors.stakedShekelWallet}</p>}
      </div>

      <textarea
        placeholder="Credentials"
        value={values.credentials}
        onChange={(e) => setValues(prev => ({ ...prev, credentials: e.target.value }))}
        className="w-full h-32 p-4 rounded-lg border border-gray-300 text-lg"
      />

      <textarea
        placeholder="Further Considerations"
        value={values.furtherConsiderations}
        onChange={(e) => setValues(prev => ({ ...prev, furtherConsiderations: e.target.value }))}
        className="w-full h-32 p-4 rounded-lg border border-gray-300 text-lg"
      />

      <div className="mt-auto pt-6">
        <motion.button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full p-4 rounded-lg text-lg font-medium transition-all ${
            isSubmitting
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Application'}
        </motion.button>
        {errors.wallet && (
          <p className="text-red-500 text-sm mt-2 text-center">{errors.wallet}</p>
        )}
      </div>
    </motion.div>
  );
});

const MobileStepsList = memo(({ currentStep, steps, onStepClick, isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleStepClick = (stepNumber) => {
    onStepClick(stepNumber);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 z-50 bg-white flex flex-col"
    >
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-medium">Steps</h2>
        <button onClick={onClose} className="text-gray-500">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {steps.map((label, index) => (
            <button
              key={index}
              onClick={() => handleStepClick(index + 1)}
              className={`w-full flex items-center space-x-4 p-4 ${
                index + 1 === currentStep
                  ? 'bg-blue-600 text-white rounded-lg'
                  : index + 1 < currentStep
                  ? 'text-gray-900'
                  : 'text-gray-400'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  index + 1 === currentStep
                    ? 'bg-white text-blue-600'
                    : index + 1 < currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {index + 1}
              </div>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
});

const submitApplication = async (formData) => {
  const botToken = '7915369358:AAFjbLvu8UjJyv5bzDijIWu861_N-L3c6tk';
  const channelId = '@kosherCapitalFundRequests';

  try {
    // First check the user's balance
    const publicClient = createPublicClient({
      chain: base,
      transport: http()
    });

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
      args: [formData.walletAddress], // Need to pass the connected wallet address
    });
    
    const formattedBalance = Number(formatEther(balance));
    
    if (formattedBalance < MIN_BALANCE_FOR_FUND_APPLICATION) {
      return {
        success: false,
        message: `You need at least ${MIN_BALANCE_FOR_FUND_APPLICATION.toLocaleString()} SHEKEL to submit a fund application.`
      };
    }

    // If balance check passes, continue with sending the message
    const message = `
New Fund Application

Fund Manager: ${formData.manager}
Blockchain: ${formData.blockchain}
Base Currency: ${formData.baseCurrency}
Duration: ${formData.duration}
Start Date: ${formData.startDate}
Risk Level: ${formData.riskLevel}

Allocation:
${Object.entries(formData.allocation)
  .map(([key, value]) => `- ${key}: ${value}%`)
  .join('\n')}

Fund Description:
${formData.description}

Fees:
- Additional Performance Fee: ${formData.fees.performanceFee}%
- Performance Fee Wallet: ${formData.fees.walletAddress}

Applicant Information:
- Name: ${formData.application.name}
- Email: ${formData.application.email}
- X Handle: ${formData.application.xHandle}
- Telegram: ${formData.application.tgHandle}
- Staked SHEKEL Amount: ${formData.application.stakedShekelWallet}
- Connected Wallet Balance: ${formattedBalance.toLocaleString()} SHEKEL

Credentials:
${formData.application.credentials}

Further Considerations:
${formData.application.furtherConsiderations}`;

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: channelId,
        text: message
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Telegram API Error:', data);
      throw new Error(data.description || 'Failed to submit application');
    }

    return {
      success: true,
      message: 'Thank you for your application! We will review it and get back to you shortly.'
    };
  } catch (error) {
    console.error('Error submitting application:', error);
    return {
      success: false,
      message: 'Failed to submit application. Please try again later.'
    };
  }
};

const CreateFundPage = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [userBalance, setUserBalance] = useState(0);
  const [step, setStep] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Function to handle step changes
  const handleStepChange = (newStep) => {
    if (newStep > 0 && newStep <= stepLabels.length) {
      setStep(newStep);
      const element = document.getElementById(`step-${newStep}`);
      if (element) {
        const headerHeight = window.innerWidth >= 768 ? 64 : 120;
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Adjust for header
        window.scrollBy(0, -headerHeight);
      }
    }
  };

  // Function to handle step completion
  const handleStepComplete = (currentStep) => {
    const nextStep = currentStep + 1;
    if (nextStep <= stepLabels.length) {
      handleStepChange(nextStep);
    }
  };

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

  const [formData, setFormData] = useState({
    blockchain: '',
    baseCurrency: '',
    manager: '',
    duration: '',
    startDate: '',
    riskLevel: '',
    allocation: {
      btc: 0,
      majorsAndL1s: 0,
      aiInfrastructure: 0,
      aiAgents: 0,
      altcoins: 0,
      memecoins: 0,
    },
    description: '',
    fees: {
      performanceFee: 0,
      walletAddress: ''
    },
    application: {
      name: '',
      email: '',
      xHandle: '',
      tgHandle: '',
      stakedShekelWallet: '',
      credentials: '',
      furtherConsiderations: ''
    }
  });

  const blockchains = [
    { name: 'Solana', image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
    { name: 'Base', image: 'https://avatars.githubusercontent.com/u/108554348?s=200&v=4' },
    { name: 'Ethereum', image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' }
  ];
  const baseCurrencies = {
    'Solana': [
      { name: 'SOL', image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
      { name: 'USDC', image: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png' },
      { name: 'wBTC', image: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png' }
    ],
    'Base': [
      { name: 'ETH', image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
      { name: 'USDC', image: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png' },
      { name: 'VIRTUALS', image: 'https://assets.coingecko.com/coins/images/34057/standard/LOGOMARK.png?1708356054' },
      { name: 'cbBTC', image: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png' },
      { name: 'SHEKEL', image: blueStar }
    ],
    'Ethereum': [
      { name: 'ETH', image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
      { name: 'USDC', image: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png' }
    ]
  };
  const managers = ['Rabbi Schlomo', 'Miriam Cohen', 'Intern Benny'];
  const durations = ['1 month', '3 months', '6 months', '1 year', 'Perpetual'];
  const riskLevels = [
    'Ultra Conservative',
    'Conservative',
    'Mid level risk',
    'High Risk',
    'Ultra high risk'
  ];

  const stepLabels = [
    'Choose Blockchain',
    'Choose Fund Manager',
    'Choose Duration',
    'Set Risk Level',
    'Fund Allocation',
    'Fund Description',
    'Set Fees',
    'Submit Application'
  ];

  const StepIndicator = ({ currentStep, stepNumber, label, onClick }) => (
    <motion.button
      onClick={() => onClick?.(stepNumber)}
      className={`flex items-center space-x-4 w-full p-4 ${
        stepNumber === currentStep 
          ? 'bg-blue-600 text-white rounded-lg'
          : stepNumber < currentStep
          ? 'text-gray-900'
          : 'text-gray-400'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          stepNumber === currentStep 
            ? 'bg-white text-blue-600'
            : stepNumber < currentStep
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-400'
        }`}
      >
        {stepNumber}
      </div>
      <span className="text-base">{label}</span>
    </motion.button>
  );

  const Step = ({ number, title, children }) => {
    const [ref, inView] = useInView({
      threshold: 0.5,
      onChange: (inView) => {
        if (inView) {
          setStep(number);
        }
      },
    });

    return (
      <div
        id={`step-${number}`}
        ref={ref}
        className="min-h-screen flex flex-col py-8 md:py-12"
      >
        <h2 className="hidden md:block text-2xl font-bold text-gray-900 mb-8">
          {title || `Step ${number}`}
        </h2>
        <div className="flex-grow flex flex-col justify-center">
          {children}
        </div>
      </div>
    );
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Add this function to handle step 7 state updates
  const handleFeesUpdate = (fees) => {
    setFormData(prev => ({
      ...prev,
      fees
    }));
    handleStepComplete(7);
  };

  // Add this function to handle step 8 state updates without submission
  const handleApplicationUpdate = (applicationData) => {
    setFormData(prev => ({
      ...prev,
      application: applicationData
    }));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white z-50">
        {/* Top row with Back and Connect Wallet */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button
            onClick={() => navigate('/funds')}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
          >
            <span className="mr-1">←</span> Back
          </button>
          <ConnectWallet />
        </div>
        
        {/* Bottom row with step indicator */}
        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200 bg-gray-50">
          <span className="text-sm text-gray-600">Step {step} of {stepLabels.length}: {stepLabels[step - 1]}</span>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-gray-600 p-1"
          >
            <svg
              className={`w-5 h-5 transform transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Desktop ConnectWallet */}
      <div className="hidden md:block">
        <ConnectWallet />
      </div>

      {/* Mobile Steps List */}
      <AnimatePresence>
        <MobileStepsList
          currentStep={step}
          steps={stepLabels}
          onStepClick={handleStepChange}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.div 
        className="hidden md:block fixed left-0 top-0 h-full w-64 bg-gray-50 border-r border-gray-200 p-6 overflow-y-auto"
        initial={{ x: -100 }}
        animate={{ x: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        <button
          onClick={() => navigate('/funds')}
          className="mb-8 text-blue-600 hover:text-blue-700 font-medium flex items-center"
        >
          <span className="mr-1">←</span> Back
        </button>
        
        <div className="space-y-2">
          {stepLabels.map((label, index) => (
            <StepIndicator
              key={index}
              currentStep={step}
              stepNumber={index + 1}
              label={label}
              onClick={handleStepChange}
            />
          ))}
        </div>
      </motion.div>

      {/* Main content area */}
      <div className="md:ml-64 h-screen overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto px-4 sm:pt-[120px] pt-[70px] md:pt-8 pb-20">
          <Step number={1} title="Choose Blockchain">
            <motion.div className="space-y-4 pb-20 mt-12">
              <h3 className="text-lg font-medium mb-2 text-gray-800">Select Blockchain Network</h3>
              {blockchains.map((chain, index) => (
                <motion.button
                  key={chain.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, blockchain: chain.name }));
                  }}
                  className={`w-full p-4 rounded-lg border flex items-center space-x-3 ${
                    formData.blockchain === chain.name
                      ? 'bg-blue-100 text-blue-700 border-blue-600'
                      : 'bg-white text-gray-800 border-gray-300 hover:border-blue-600 hover:text-blue-600'
                  }`}
                >
                  <img src={chain.image} alt={chain.name} className="w-8 h-8 rounded-full" />
                  <span className="font-medium">{chain.name}</span>
                </motion.button>
              ))}

              {formData.blockchain && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-8"
                >
                  <h3 className="text-lg font-medium mb-2 text-gray-800">Select base currency for the Fund</h3>
                  <div className="space-y-2">
                    {baseCurrencies[formData.blockchain]?.map((currency) => (
                      <motion.button
                        key={currency.name}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, baseCurrency: currency.name }));
                          handleStepComplete(1);
                        }}
                        className={`w-full p-3 rounded-lg border flex items-center space-x-3 ${
                          formData.baseCurrency === currency.name
                            ? 'bg-blue-100 text-blue-700 border-blue-600'
                            : 'bg-white text-gray-800 border-gray-300 hover:border-blue-600'
                        }`}
                      >
                        <img src={currency.image} alt={currency.name} className="w-6 h-6 rounded-full" />
                        <span className="font-medium">{currency.name}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </Step>

          <Step number={2}>
            <motion.div className="space-y-4">
              {managers.map((manager, index) => (
                <motion.button
                  key={manager}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, manager }));
                    handleStepComplete(2);
                  }}
                  className={`w-full p-4 rounded-lg border flex items-center space-x-4 ${
                    formData.manager === manager
                      ? 'bg-blue-100 text-blue-700 border-blue-600'
                      : 'bg-white text-gray-800 border-gray-300 hover:border-blue-600 hover:text-blue-600'
                  }`}
                >
                  <img 
                    src={
                      manager === 'Intern Benny' ? internBenny :
                      manager === 'Miriam Cohen' ? miriamCohen :
                      rabbiSchlomo
                    }
                    alt={manager}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex flex-col items-start">
                    <span>{manager}</span>
                    <span className="text-sm opacity-75">
                      {manager === 'Rabbi Schlomo' ? 'The Value Investor' :
                       manager === 'Miriam Cohen' ? 'The Queen of Capital Preservation' :
                       'The Risk Taker'}
                    </span>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          </Step>

          <Step number={3}>
            <motion.div className="space-y-6">
              <div className="space-y-4 text-gray-800">
                {durations.map((duration, index) => (
                  <motion.button
                    key={duration}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, duration }));
                    }}
                    className={`w-full p-4 rounded-lg border ${
                      formData.duration === duration
                        ? 'bg-blue-100 text-blue-700 border-blue-600'
                        : 'bg-white text-gray-800 border-gray-300 hover:border-blue-600'
                    }`}
                  >
                    {duration}
                  </motion.button>
                ))}
              </div>

              <div className="mt-6 text-gray-800">
                <h3 className="text-lg font-medium mb-2">Choose Start Date</h3>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, startDate: e.target.value }));
                    handleStepComplete(3);
                  }}
                  className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </motion.div>
          </Step>

          <Step number={4} >
            <motion.div className="space-y-4">
              {riskLevels.map((risk, index) => (
                <motion.button
                  key={risk}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, riskLevel: risk }));
                    handleStepComplete(4);
                  }}
                  className={`w-full p-4 rounded-lg border ${
                    formData.riskLevel === risk
                      ? 'bg-blue-100 text-blue-700 border-blue-600'
                      : 'bg-white text-gray-800 border-gray-300 hover:border-blue-600 hover:text-blue-600'
                  }`}
                >
                  {risk}
                </motion.button>
              ))}
            </motion.div>
          </Step>

          <Step number={5} >
            <AllocationStep
              initialValues={formData.allocation}
              onComplete={(allocations) => {
                setFormData(prev => ({
                  ...prev,
                  allocation: allocations
                }));
                handleStepComplete(5);
              }}
            />
          </Step>

          <Step number={6}>
            <FundDescriptionStep
              description={formData.description}
              onComplete={(description) => {
                setFormData(prev => ({ ...prev, description }));
                handleStepComplete(6);
              }}
            />
          </Step>

          <Step number={7}>
            <FeesStep
              fees={formData.fees}
              onComplete={handleFeesUpdate}
            />
          </Step>

          <Step number={8}>
            <SubmitApplicationStep
              initialValues={formData.application}
              formData={formData}
              onComplete={handleApplicationUpdate}
            />
          </Step>

          {/* Add Snackbar component */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert 
              onClose={handleCloseSnackbar} 
              severity={snackbar.severity}
              sx={{ width: '100%' }}
              elevation={6}
              variant="filled"
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </div>
      </div>
    </div>
  );
};

export default CreateFundPage; 