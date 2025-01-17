import { useEffect, useState } from 'react';

interface QuoteData {
  price: string;
  change: string;
  volume: string;
  timestamp: string;
}

export default function RealtimeQuote() {
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 建立 WebSocket 連接
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/proxy`);

    ws.onopen = () => {
      console.log('WebSocket 連接成功');
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setQuoteData(data);
      } catch (error) {
        console.error('解析數據失敗:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket 錯誤:', error);
      setError('連接發生錯誤');
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket 連接關閉');
      setIsConnected(false);
    };

    // 定時發送 ping 消息
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    // 清理函數
    return () => {
      clearInterval(pingInterval);
      ws.close();
    };
  }, []);

  if (error) {
    return <div className="text-red-500">錯誤: {error}</div>;
  }

  if (!isConnected) {
    return <div>正在連接...</div>;
  }

  if (!quoteData) {
    return <div>等待數據...</div>;
  }

  const changeColor = parseFloat(quoteData.change) >= 0 ? 'text-green-500' : 'text-red-500';

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">台指期即時報價</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-600">最新價格</p>
          <p className="text-2xl font-bold">{quoteData.price}</p>
        </div>
        <div>
          <p className="text-gray-600">漲跌</p>
          <p className={`text-2xl font-bold ${changeColor}`}>{quoteData.change}</p>
        </div>
        <div>
          <p className="text-gray-600">成交量</p>
          <p className="text-xl">{quoteData.volume}</p>
        </div>
        <div>
          <p className="text-gray-600">更新時間</p>
          <p className="text-sm">
            {new Date(quoteData.timestamp).toLocaleTimeString('zh-TW')}
          </p>
        </div>
      </div>
    </div>
  );
} 