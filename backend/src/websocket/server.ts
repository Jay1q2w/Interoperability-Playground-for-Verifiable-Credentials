import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function initWebSocketServer(server: http.Server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    clients.add(ws);

    ws.send(JSON.stringify({
      type: 'CONNECTED',
      timestamp: new Date().toISOString(),
      message: 'Connected to Inji Interop Playground Live Stream'
    }));

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('WebSocket client error:', err);
      clients.delete(ws);
    });
  });

  return wss;
}

export function broadcastEvent(event: { type: string; payload: unknown }) {
  const msg = JSON.stringify({
    ...event,
    timestamp: new Date().toISOString()
  });

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(msg);
      } catch (err) {
        console.error('Failed to send WebSocket message:', err);
      }
    }
  }
}
