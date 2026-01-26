'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'loading';
}

interface ToastContainerProps {
  messages: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ messages, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white max-w-sm ${
            msg.type === 'success'
              ? 'bg-green-500'
              : msg.type === 'error'
                ? 'bg-red-500'
                : 'bg-blue-500'
          }`}
        >
          {msg.type === 'success' && <CheckCircle size={20} />}
          {msg.type === 'error' && <AlertCircle size={20} />}
          {msg.type === 'loading' && <Loader size={20} className="animate-spin" />}
          <span>{msg.message}</span>
          <button
            onClick={() => onRemove(msg.id)}
            className="ml-auto text-lg font-bold hover:opacity-70"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'loading' = 'success') => {
    const id = Date.now().toString();
    const newMsg: ToastMessage = { id, message, type };
    setMessages((prev) => [...prev, newMsg]);

    if (type !== 'loading') {
      setTimeout(() => removeToast(id), 3000);
    }

    return id;
  };

  const removeToast = (id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  const updateToast = (id: string, message: string, type: 'success' | 'error' | 'loading') => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, message, type } : msg))
    );
  };

  return { messages, addToast, removeToast, updateToast };
}
