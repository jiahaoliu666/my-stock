import { useState, useEffect } from 'react';
import { wsService, type MarketData } from '../services/websocketService';

export function useMarketData() {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 初始化連接
    wsService.connect();

    // 監聽市場數據更新
    const handleMarketData = (data: MarketData) => {
      setMarketData(data);
      setIsLoading(false);
    };

    wsService.on('marketData', handleMarketData);

    // 清理函數
    return () => {
      wsService.removeListener('marketData', handleMarketData);
      wsService.disconnect();
    };
  }, []);

  return {
    marketData,
    isLoading,
    error
  };
} 