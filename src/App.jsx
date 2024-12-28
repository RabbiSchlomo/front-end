import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './components/HomePage';
import BuyPage from './components/BuyPage';
import ProtectedBoardRoom from './components/ProtectedBoardRoom';
import BoardRoom from './components/BoardRoom';
import ProtectedMillionBoardRoom from './components/ProtectedMillionBoardRoom';
import MillionBoardRoom from './components/MillionBoardRoom';
import StakingPage from './components/StakingPage';
import TreasuriesOverviewPage from './components/TreasuriesOverviewPage';
import SolanaTreasuryPage from './components/SolanaTreasuryPage';
import Footer from './components/Footer';
import { http } from 'viem';
import CreateFundPage from './components/CreateFundPage';

// Create config with transport explicitly defined
const config = getDefaultConfig({
  appName: 'Kosher Capital',
  projectId: '44a3a1fa2f194d33b6e9230f7da955f9',
  chains: [base],
  ssr: false,
  transports: {
    [base.id]: http('https://mainnet.base.org')
  }
});

const queryClient = new QueryClient();

// Create a wrapper component to handle the footer logic
const AppContent = () => {
  const location = useLocation();
  const showFooter = !location.pathname.includes('-room'); // Hide footer for both chat rooms

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/buy" element={<BuyPage />} />
        <Route path="/staking" element={<StakingPage />} />
        <Route path="/funds" element={<TreasuriesOverviewPage />} />
        <Route path="/funds/solana" element={<SolanaTreasuryPage />} />
        <Route path="/funds/create" element={<CreateFundPage />} />
        <Route 
          path="/board-member-room" 
          element={
            <ProtectedBoardRoom>
              <BoardRoom />
            </ProtectedBoardRoom>
          } 
        />
        <Route 
          path="/gold-partner-room" 
          element={
            <ProtectedMillionBoardRoom>
              <MillionBoardRoom />
            </ProtectedMillionBoardRoom>
          } 
        />
      </Routes>
      {showFooter && <Footer />}
    </div>
  );
};

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <Router>
            <AppContent />
          </Router>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
