import { Server } from "bun";

export class WSServer {
  private static server: Server | null = null;
  private static readonly CHANNEL = 'xtrawberry';
  private static readonly PORT = 8080;

  public static start() {
    if (this.server) return;

    this.server = Bun.serve({
      port: this.PORT,
      fetch(req, server) {
        const success = server.upgrade(req);
        if (success) return undefined;
        return new Response("xtrawberry websocket server");
      },
      websocket: {
        open(ws) {
          ws.subscribe(WSServer.CHANNEL);
          ws.send(JSON.stringify({
            type: 'connection',
            message: 'Connected to xtrawberry agent'
          }));
        },
        close(ws) {
          ws.unsubscribe(WSServer.CHANNEL);
        },
        // required for ws server
        message(ws, message) {}
      }
    });

    // TODO: clean up logs throughout project, WS might not need to console log
    WSServer.log(`WebSocket server started on ${this.server.hostname}:${this.PORT}`);
  }

  private static broadcast(message: any): void {
    if (!this.server) return;

    const payload = JSON.stringify({
      type: message.type || 'broadcast',
      message: message.message || message,
      timestamp: new Date().toISOString()
    });

    this.server.publish(this.CHANNEL, payload);
  }

  public static log(message: string, type: string = 'log'): void {
    console.log(`[${type}] ${message}`);
    this.broadcast({ type, message });
  }

  public static warn(message: string): void {
    console.warn(message);
    this.broadcast({ type: 'warning', message });
  }

  public static error(message: string, err?: any): void {
    console.error(message, err);
    this.broadcast({ type: 'error', message: err ? `${message}: ${err}` : message });
  }

  public static stop(): void {
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
  }
} 