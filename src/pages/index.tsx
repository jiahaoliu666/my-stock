import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import TradingSignals from '@/components/TradingSignals';
import { getFuturesData, type FuturesData, type ChartData } from '@/services/futuresService';
import type { SignalResult } from '@/services/tradingSignals';
import ChartWidget from '@/components/ChartWidget';
import RealtimeQuote from '../components/RealtimeQuote';

interface ExtendedFuturesData extends FuturesData {
  signal?: SignalResult;
}

export default function Home() {
  const [futuresData, setFuturesData] = useState<ExtendedFuturesData>({
    price: '---',
    change: '---',
    changePercent: '---',
    volume: '---',
    updateTime: '---',
    isMarketOpen: false,
    chartData: []
  });

  const [prevPrice, setPrevPrice] = useState<string>('---');
  const [isLoading, setIsLoading] = useState(true);

  const updateFuturesData = async () => {
    try {
      setPrevPrice(futuresData.price);
      const data = await getFuturesData();
      setFuturesData(data);
      setIsLoading(false);
    } catch (error) {
      console.error('更新期貨數據失敗:', error);
      // 保持現有數據，只更新時間
      setFuturesData(prev => ({
        ...prev,
        updateTime: new Date().toLocaleTimeString('zh-TW')
      }));
    }
  };

  useEffect(() => {
    // 首次載入時更新數據
    updateFuturesData();

    // 設置定時更新（每30秒更新一次）
    const interval = setInterval(updateFuturesData, 30000);

    // 清理定時器
    return () => clearInterval(interval);
  }, []);

  // 計算價格變化的顏色
  const getPriceColor = () => {
    if (prevPrice === '---' || futuresData.price === '---') return 'text-gray-900';
    return Number(futuresData.price) > Number(prevPrice) ? 'text-red-600' : 'text-green-600';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">台指期即時行情</h1>
        
        {/* 主要報價區 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">即時報價</h2>
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${futuresData.isMarketOpen ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm text-gray-500">
                  {futuresData.isMarketOpen ? '盤中' : '已收盤'} • 
                  最後更新：{futuresData.updateTime}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600">現價</p>
                <p className={`text-3xl font-bold ${getPriceColor()}`}>
                  {futuresData.price}
                </p>
              </div>
              <div>
                <p className="text-gray-600">漲跌</p>
                <p className={`text-2xl font-bold ${parseFloat(futuresData.change) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {futuresData.change} ({futuresData.changePercent}%)
                </p>
              </div>
              <div>
                <p className="text-gray-600">成交量</p>
                <p className="text-xl">{futuresData.volume}</p>
              </div>
            </div>
          </div>
          
          {/* 交易訊號區 */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <TradingSignals signal={futuresData.signal} />
          </div>
        </div>

        {/* K線圖區域 */}
        <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-semibold mb-4">K線圖</h2>
          <div className="h-[600px]">
            {futuresData.chartData && futuresData.chartData.length > 0 && (
              <ChartWidget 
                data={futuresData.chartData} 
                currentPrice={Number(futuresData.price)}
              />
            )}
          </div>
        </div>

        <RealtimeQuote />
      </main>
    </div>
  );
}
