'use client';

import { useEffect, useState } from 'react';

type Message = {
  type: string;
  message: string;
  taskId?: string;
  timestamp?: string;
};

type TaskGroup = {
  taskId: string;
  messages: Message[];
  timestamp: string;
  isSystemMessage: boolean;
};

const RETRY_INTERVAL = 5000;

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retryTimeout: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket('ws://localhost:8080');
      
      ws.onopen = () => {
        setStatus('connected');
      };

      ws.onclose = () => {
        setStatus('disconnected');
        retryTimeout = setTimeout(connect, RETRY_INTERVAL);
      };

      ws.onmessage = (event) => {
        const data: Message = JSON.parse(event.data);
        console.log(data);
        setMessages(prev => [...prev, data]);
      };
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      clearTimeout(retryTimeout);
    };
  }, []);

  // Convert messages to cards while preserving order
  const cards = messages.map((msg, index) => {
    const taskId = msg.taskId || '-1';
    const isSystemMessage = taskId === '-1';

    return {
      taskId,
      messages: [msg],
      timestamp: msg.timestamp || new Date().toISOString(),
      isSystemMessage,
      originalIndex: index // Keep track of original order
    };
  });

  // Group task messages while preserving system message positions
  const groupedCards = cards.reduce((acc, card) => {
    if (card.isSystemMessage) {
      // Keep system messages as individual cards
      acc.push(card);
    } else {
      // Find the last card for this task ID
      const lastTaskCard = [...acc].reverse().find(c => c.taskId === card.taskId && !c.isSystemMessage);
      
      if (lastTaskCard) {
        // Add message to existing task card
        lastTaskCard.messages.push(card.messages[0]);
        lastTaskCard.timestamp = card.timestamp;
      } else {
        // Create new task card
        acc.push(card);
      }
    }
    return acc;
  }, [] as (TaskGroup & { originalIndex: number })[]);

  // Sort to maintain original message order
  const sortedCards = groupedCards.sort((a, b) => a.originalIndex - b.originalIndex);

  return (
    <div className="min-h-screen flex flex-col items-center p-8 bg-gray-900 text-gray-100">
      <h2 className="text-2xl font-bold mb-4">xtrawberry</h2>
      <div className="text-sm mb-4">
        Status: <span className={`font-bold ${
          status === 'connected' ? 'text-green-400' : 
          status === 'disconnected' ? 'text-red-400' : 
          'text-yellow-400'
        }`}>{status}</span>
      </div>
      
      <div className="w-full max-w-4xl space-y-4">
        {sortedCards.map((card, index) => (
          <div 
            key={`${card.taskId}-${card.originalIndex}`}
            className={`rounded-lg p-4 shadow-lg border border-gray-700 ${
              card.isSystemMessage ? 'bg-gray-800/50' : 'bg-gray-800'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-200">
                {card.isSystemMessage ? 'System Message' : `Task ${card.taskId}`}
              </h3>
              {card.timestamp && (
                <span className="text-xs text-gray-400">
                  {new Date(card.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="space-y-1.5 bg-black/50 p-3 rounded font-mono text-sm">
              {card.messages.map((msg, i) => (
                <div key={i} className="flex items-start hover:bg-black/30 px-2 py-1 rounded">
                  <span className={`font-medium shrink-0 ${
                    msg.type === 'error' ? 'text-red-400' :
                    msg.type === 'warning' ? 'text-yellow-400' :
                    msg.type === 'success' ? 'text-green-400' :
                    'text-blue-400'
                  }`}>
                    [{msg.type}]
                  </span>
                  <span className="text-gray-100 ml-2 break-words flex-1 font-mono">{msg.message}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
