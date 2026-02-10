'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { AlertCircle, CheckCircle, Loader, AlertTriangle } from 'lucide-react';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'loading' | 'warning';
}

interface ToastContextType {
  messages: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'error' | 'loading' | 'warning') => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, message: string, type: 'success' | 'error' | 'loading' | 'warning') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'loading' | 'warning' = 'success') => {
    const id = Date.now().toString();
    const newMsg: ToastMessage = { id, message, type };
    console.log('🔔 Toast Added:', { id, message, type });
    setMessages((prev) => [...prev, newMsg]);

    if (type !== 'loading') {
      setTimeout(() => removeToast(id), 3000);
    }

    return id;
  };

  const removeToast = (id: string) => {
    console.log('🔔 Toast Removed:', id);
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  const updateToast = (id: string, message: string, type: 'success' | 'error' | 'loading' | 'warning') => {
    console.log('🔔 Toast Updated:', { id, message, type });
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, message, type } : msg))
    );
  };

  return (
    <ToastContext.Provider value={{ messages, addToast, removeToast, updateToast }}>
      {children}
      <ToastContainer messages={messages} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

function ToastContainer({ messages, onRemove }: { messages: ToastMessage[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white max-w-sm pointer-events-auto ${
            msg.type === 'success'
              ? 'bg-green-500'
              : msg.type === 'error'
                ? 'bg-red-500'
                : msg.type === 'warning'
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
          }`}
        >
          {msg.type === 'success' && <CheckCircle size={20} />}
          {msg.type === 'error' && <AlertCircle size={20} />}
          {msg.type === 'warning' && <AlertTriangle size={20} />}
          {msg.type === 'loading' && <Loader size={20} className="animate-spin" />}
          <span>{msg.message}</span>
          <button
            onClick={() => onRemove(msg.id)}
            className="ml-auto text-lg font-bold hover:opacity-70 text-indigo-400 dark:text-indigo-200"
            aria-label="close-toast"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
