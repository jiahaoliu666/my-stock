import type { NextApiRequest } from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import { NextApiResponseServerIO } from '@/types/next';
import { IncomingMessage } from 'http';
import { Socket } from 'net';

interface QuoteItem {
  SymbolID: string;
  CLastPrice: string;
  COpenPrice: string;
  CHighPrice: string;
  CLowPrice: string;
  CTotalVolume: string;
  CDiff: string;
}

// 擴展 WebSocket 類型
interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
}

// 保存 WebSocket 服務器實例和活動連接
let wsServer: WebSocketServer;
const activeConnections = new Set<ExtendedWebSocket>();

// 安全地發送數據
function safeSend(ws: ExtendedWebSocket, data: any) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
    } catch (error) {
      console.error('發送數據失敗:', error);
      ws.terminate();
      activeConnections.delete(ws);
    }
  }
}

// 廣播數據給所有活動連接
async function broadcastData() {
  try {
    const data = await fetchFuturesData();
    activeConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        safeSend(ws, data);
      } else if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        activeConnections.delete(ws);
      }
    });
  } catch (error) {
    console.error('獲取或廣播數據失敗:', error);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  if (!res.socket.server.ws) {
    // 初始化 WebSocket 服務器
    wsServer = new WebSocketServer({ 
      noServer: true,
      clientTracking: false,
      perMessageDeflate: false,
    });
    res.socket.server.ws = wsServer;

    // 處理 WebSocket 升級
    res.socket.server.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
      try {
        wsServer.handleUpgrade(request, socket, head, (ws) => {
          wsServer.emit('connection', ws, request);
        });
      } catch (error) {
        console.error('WebSocket 升級失敗:', error);
        socket.destroy();
      }
    });

    let broadcastInterval: NodeJS.Timeout;

    // WebSocket 連接處理
    wsServer.on('connection', (ws: ExtendedWebSocket) => {
      console.log('新的 WebSocket 連接');
      ws.isAlive = true;
      activeConnections.add(ws);

      // 立即發送一次數據
      fetchFuturesData()
        .then(data => safeSend(ws, data))
        .catch(error => console.error('初始數據發送失敗:', error));

      // 如果是第一個連接，開始廣播
      if (activeConnections.size === 1) {
        broadcastInterval = setInterval(broadcastData, 1000);
      }

      // 處理連接關閉
      ws.on('close', () => {
        activeConnections.delete(ws);
        ws.isAlive = false;
        console.log('WebSocket 連接關閉, 剩餘連接數:', activeConnections.size);
        
        // 如果沒有活動連接了，停止廣播
        if (activeConnections.size === 0 && broadcastInterval) {
          clearInterval(broadcastInterval);
        }
      });

      // 處理錯誤
      ws.on('error', (error) => {
        console.error('WebSocket 錯誤:', error);
        ws.isAlive = false;
        activeConnections.delete(ws);
        ws.terminate();
      });

      // 處理 ping 消息
      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'ping' && ws.readyState === WebSocket.OPEN) {
            safeSend(ws, { type: 'pong' });
          }
        } catch (error) {
          console.error('處理消息失敗:', error);
        }
      });

      // 設置 ping/pong
      ws.on('pong', () => {
        ws.isAlive = true;
      });
    });

    // 定期檢查連接狀態
    const pingInterval = setInterval(() => {
      activeConnections.forEach(ws => {
        if (ws.isAlive === false) {
          activeConnections.delete(ws);
          return ws.terminate();
        }
        ws.isAlive = false;
        try {
          ws.ping();
        } catch (error) {
          console.error('ping 失敗:', error);
          ws.terminate();
          activeConnections.delete(ws);
        }
      });
    }, 30000);

    wsServer.on('close', () => {
      clearInterval(pingInterval);
    });
  }

  // 處理 HTTP 請求
  if (req.method === 'GET') {
    try {
      const data = await fetchFuturesData();
      res.status(200).json(data);
    } catch (error) {
      console.error('獲取期貨數據失敗:', error);
      res.status(500).json({ message: '無法獲取數據' });
    }
  } else {
    res.status(405).json({ message: '只允許 GET 請求' });
  }
}

// 獲取期貨數據的函數
async function fetchFuturesData() {
  const response = await fetch('https://mis.taifex.com.tw/futures/api/getQuoteList', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-Language': 'zh-TW',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Origin': 'https://mis.taifex.com.tw',
      'Referer': 'https://mis.taifex.com.tw/futures/RegularSession/EquityIndices/FuturesDomestic/',
    },
    body: JSON.stringify({
      MarketType: "0",
      SymbolType: "F",
      Symbol: "TXF",
      Interval: "0",
      Row: "1",
      Column: "2",
      Date: new Date().toISOString().split('T')[0].replace(/-/g, '')
    })
  });

  if (!response.ok) {
    throw new Error(`無法獲取期貨數據: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  const quoteData = result?.RtData?.QuoteList?.find((item: QuoteItem) => item.SymbolID === 'TXFB5-F') || null;

  return {
    price: quoteData?.CLastPrice || '---',
    change: quoteData?.CDiff || '0',
    volume: quoteData?.CTotalVolume || '0',
    timestamp: new Date().toISOString()
  };
} 