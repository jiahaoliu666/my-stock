import { NextApiResponse } from 'next';
import { Socket } from 'net';
import { Server as HttpServer } from 'http';
import { WebSocketServer } from 'ws';

export interface NextApiResponseServerIO extends NextApiResponse {
  socket: Socket & {
    server: HttpServer & {
      ws: WebSocketServer;
    };
  };
} 