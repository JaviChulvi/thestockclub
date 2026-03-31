'use client';

import { createContext, useContext, useState } from 'react';

const ChatSidebarContext = createContext({});

export function ChatSidebarProvider({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const openSidebar = () => {
    setIsSidebarOpen(true);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <ChatSidebarContext.Provider 
      value={{ 
        isSidebarOpen, 
        setIsSidebarOpen,
        toggleSidebar,
        openSidebar,
        closeSidebar
      }}
    >
      {children}
    </ChatSidebarContext.Provider>
  );
}

export function useChatSidebar() {
  const context = useContext(ChatSidebarContext);
  if (!context) {
    throw new Error('useChatSidebar must be used within a ChatSidebarProvider');
  }
  return context;
}

