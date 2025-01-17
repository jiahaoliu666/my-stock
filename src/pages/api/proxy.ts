import type { NextApiRequest } from 'next';
import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
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

// 保存 WebSocket 服務器實例
let wsServer: WebSocketServer;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  if (!res.socket.server.ws) {
    // 初始化 WebSocket 服務器
    wsServer = new WebSocketServer({ noServer: true });
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

    // WebSocket 連接處理
    wsServer.on('connection', (ws: WebSocket) => {
      console.log('新的 WebSocket 連接');

      // 立即發送一次數據
      fetchFuturesData()
        .then(data => {
          ws.send(JSON.stringify(data));
        })
        .catch(error => {
          console.error('初始數據發送失敗:', error);
        });

      // 設置定時獲取數據
      const interval = setInterval(async () => {
        if (ws.readyState === ws.OPEN) {
          try {
            const data = await fetchFuturesData();
            ws.send(JSON.stringify(data));
          } catch (error) {
            console.error('發送數據失敗:', error);
          }
        }
      }, 1000);

      // 處理連接關閉
      ws.on('close', () => {
        clearInterval(interval);
        console.log('WebSocket 連接關閉');
      });

      // 處理錯誤
      ws.on('error', (error) => {
        console.error('WebSocket 錯誤:', error);
        clearInterval(interval);
      });

      // 處理 ping 消息
      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'ping') {
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({ type: 'pong' }));
            }
          }
        } catch (error) {
          console.error('處理消息失敗:', error);
        }
      });
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