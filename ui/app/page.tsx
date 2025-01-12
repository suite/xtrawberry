'use client';

import { useEffect, useState } from 'react';

type Message = {
  channel: string;
  type: string;
  message: string;
  timestamp?: string;
};

const CHANNEL = 'xtrawberry';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');
    
    ws.onopen = () => {
      setStatus('connected');
    };

    ws.onclose = () => {
      setStatus('disconnected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(data);
      setMessages(prev => [...prev, data]);
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h2>xtrawberry</h2>
      <div className="text-sm">
        Status: <span className={`font-bold ${
          status === 'connected' ? 'text-green-500' : 
          status === 'disconnected' ? 'text-red-500' : 
          'text-yellow-500'
        }`}>{status}</span>
      </div>
      <div className="max-w-md w-full mt-4">
        <h3 className="text-lg mb-2">Messages:</h3>
        <div className="border rounded p-4 h-96 overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className="mb-3 p-2 bg-gray-50 rounded">
              <div className="text-sm font-bold text-gray-700">{msg.type}</div>
              <div className="text-gray-800">{msg.message}</div>
              {msg.timestamp && (
                <div className="text-xs text-gray-500 mt-1">{msg.timestamp}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
