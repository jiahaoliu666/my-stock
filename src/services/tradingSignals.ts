interface PriceData {
  price: number;
  prevPrice: number;
  ma5: number;
  ma20: number;
  rsi: number;
  volume: number;
  avgVolume: number;
}

export interface SignalResult {
  type: 'ENTRY' | 'EXIT' | 'HOLD';
  reason: string;
  strength: 'strong' | 'moderate' | 'weak';
  timestamp: string;
}

export function analyzeSignals(data: PriceData): SignalResult {
  const signals: { condition: boolean; type: 'ENTRY' | 'EXIT'; reason: string; strength: 'strong' | 'moderate' | 'weak' }[] = [
    // 進場訊號
    {
      condition: data.price > data.ma20 && data.ma5 > data.ma20 && data.rsi < 70,
      type: 'ENTRY',
      reason: '價格突破20日均線且5日均線向上',
      strength: 'strong'
    },
    {
      condition: data.price > data.prevPrice && data.volume > data.avgVolume * 1.5,
      type: 'ENTRY',
      reason: '價格上漲且成交量明顯放大',
      strength: 'strong'
    },
    {
      condition: data.rsi < 30 && data.price > data.ma5,
      type: 'ENTRY',
      reason: 'RSI超賣且價格站上5日均線',
      strength: 'moderate'
    },

    // 出場訊號
    {
      condition: data.price < data.ma20 && data.ma5 < data.ma20,
      type: 'EXIT',
      reason: '價格跌破20日均線且5日均線向下',
      strength: 'strong'
    },
    {
      condition: data.rsi > 70 && data.price < data.prevPrice,
      type: 'EXIT',
      reason: 'RSI超買且價格開始回落',
      strength: 'strong'
    },
    {
      condition: data.price < data.ma5 && data.volume > data.avgVolume * 1.3,
      type: 'EXIT',
      reason: '價格跌破5日均線且成交量放大',
      strength: 'moderate'
    }
  ];

  // 尋找最強的訊號
  const matchedSignals = signals.filter(signal => signal.condition);
  
  if (matchedSignals.length === 0) {
    return {
      type: 'HOLD',
      reason: '無明確進出場訊號',
      strength: 'moderate',
      timestamp: new Date().toLocaleString('zh-TW')
    };
  }

  // 優先選擇強度為 'strong' 的訊號
  const strongSignal = matchedSignals.find(signal => signal.strength === 'strong');
  const selectedSignal = strongSignal || matchedSignals[0];

  return {
    type: selectedSignal.type,
    reason: selectedSignal.reason,
    strength: selectedSignal.strength,
    timestamp: new Date().toLocaleString('zh-TW')
  };
}

// 計算技術指標
export function calculateIndicators(prices: number[], volumes: number[]): PriceData {
  const currentPrice = prices[prices.length - 1];
  const prevPrice = prices[prices.length - 2];

  // 計算移動平均線
  const ma5 = calculateMA(prices.slice(-5));
  const ma20 = calculateMA(prices.slice(-20));

  // 計算RSI
  const rsi = calculateRSI(prices.slice(-15));

  // 計算平均成交量
  const avgVolume = calculateMA(volumes.slice(-5));

  return {
    price: currentPrice,
    prevPrice,
    ma5,
    ma20,
    rsi,
    volume: volumes[volumes.length - 1],
    avgVolume
  };
}

// 計算移動平均線
function calculateMA(prices: number[]): number {
  const sum = prices.reduce((acc, price) => acc + price, 0);
  return sum / prices.length;
}

// 計算RSI
function calculateRSI(prices: number[]): number {
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < prices.length; i++) {
    const difference = prices[i] - prices[i - 1];
    if (difference > 0) {
      gains += difference;
    } else {
      losses -= difference;
    }
  }

  if (losses === 0) return 100;
  
  const relativeStrength = gains / losses;
  return 100 - (100 / (1 + relativeStrength));
} 