import { wsService } from './websocketService';

export interface FuturesData {
  price: string;
  change: string;
  changePercent: string;
  volume: string;
  updateTime: string;
  isMarketOpen: boolean;
  chartData?: ChartData[];
}

export interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

let lastData: FuturesData | null = null;

export async function getFuturesData(): Promise<FuturesData> {
  try {
    const response = await fetch('/api/proxy');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // 計算漲跌百分比
    const changeValue = parseFloat(data.change);
    const currentPrice = parseFloat(data.price);
    const changePercent = ((changeValue / (currentPrice - changeValue)) * 100).toFixed(2);

    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour * 100 + minute;

    // 判斷是否為交易時間（週一至週五 8:45-13:45）
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    const isTradingHours = currentTime >= 845 && currentTime <= 1345;
    const isMarketOpen = isWeekday && isTradingHours;

    lastData = {
      price: data.price || '---',
      change: data.change || '0',
      changePercent: changePercent || '0',
      volume: data.volume || '0',
      updateTime: now.toLocaleTimeString('zh-TW'),
      isMarketOpen
    };

    return lastData;
  } catch (error) {
    console.error('獲取期貨數據失敗:', error);
    
    // 如果有上次的數據，返回上次的數據
    if (lastData) {
      return {
        ...lastData,
        updateTime: new Date().toLocaleTimeString('zh-TW')
      };
    }
    
    // 如果沒有任何數據，返回預設值
    return {
      price: '---',
      change: '0',
      changePercent: '0',
      volume: '0',
      updateTime: new Date().toLocaleTimeString('zh-TW'),
      isMarketOpen: false
    };
  }
} 