import EventEmitter from 'events';

export interface MarketData {
  symbol: string;
  price: string;
  change: string;
  volume: string;
  timestamp: string;
}

class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly initialReconnectDelay = 1000;
  private wsUrl: string = '';

  constructor() {
    super();
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.wsUrl = `${protocol}//${window.location.host}/api/proxy`;
    }
  }

  connect() {
    if (this.ws?.readyState === WebSocket.CONNECTING || 
        this.ws?.readyState === WebSocket.OPEN || 
        typeof window === 'undefined' || 
        !this.wsUrl) {
      return;
    }

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startPing();
        console.log('WebSocket 連接成功');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') {
            return;
          }
          this.emit('marketData', data);
        } catch (error) {
          console.error('解析 WebSocket 數據失敗:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`WebSocket 連接關閉: ${event.code} ${event.reason}`);
        this.cleanup();
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket 錯誤:', error);
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.close(1000, '正常關閉');
        }
      };

    } catch (error) {
      console.error('建立 WebSocket 連接失敗:', error);
      this.cleanup();
      this.scheduleReconnect();
    }
  }

  private cleanup() {
    this.isConnected = false;
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    this.ws = null;
  }

  private startPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('發送 ping 失敗:', error);
          this.ws.close(1000, '發送 ping 失敗');
        }
      }
    }, 30000);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('達到最大重連次數，停止重連');
      return;
    }

    const delay = Math.min(
      this.initialReconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      console.log(`嘗試重新連接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, delay);
  }

  disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts; // 防止重連
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, '正常關閉');
      this.ws = null;
    }

    this.isConnected = false;
  }
}

export const wsService = new WebSocketService(); 