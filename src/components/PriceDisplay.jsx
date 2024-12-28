import React, { useState, useEffect } from 'react';

const PriceDisplay = () => {
  const [price, setPrice] = useState(null);
  const [priceChange, setPriceChange] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch('https://app.geckoterminal.com/api/p1/base/pools/0xdEd72b40970af70720aDBc5127092f3152392273?include=dex%2Cdex.network.explorers%2Cdex_link_services%2Cnetwork_link_services%2Cpairs%2Ctoken_link_services%2Ctokens.token_security_metric%2Ctokens.tags%2Cpool_locked_liquidities&base_token=0');
        const data = await response.json();
        
        // Extract price and 24h price change
        const currentPrice = data.data.attributes.price_in_usd;
        const priceChangePercent = data.data.attributes.price_percent_changes.last_24h;
        
        setPrice(currentPrice);
        setPriceChange(priceChangePercent);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching price:', error);
        setIsLoading(false);
      }
    };

    fetchPrice();
    // Fetch price every 30 seconds
    const interval = setInterval(fetchPrice, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <div className="text-gray-400">Loading price...</div>;
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 8,
      maximumFractionDigits: 8
    }).format(price);
  };

  const isPriceUp = priceChange && !priceChange.startsWith('-');

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-lg font-semibold">
        {formatPrice(price)}
      </div>
      {priceChange && (
        <div className={`text-sm ${isPriceUp ? 'text-green-500' : 'text-red-500'}`}>
          {isPriceUp ? '+' : ''}{priceChange}
        </div>
      )}
    </div>
  );
};

export default PriceDisplay; 