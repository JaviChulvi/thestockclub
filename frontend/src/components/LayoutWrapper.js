'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider } from '../contexts/AuthContext';
import { ChatSidebarProvider } from '../contexts/ChatSidebarContext';
import Header from './header';
import Footer from './footer';
import ErrorBoundary from './ErrorBoundary';

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  // Check if pathname includes /chat or /admin (accounting for locale prefix like /en/chat or /es/admin)
  const isChatPage = pathname?.includes('/chat');
  const isAdminPage = pathname?.includes('/admin');

  // For admin pages, don't render any wrapper (admin layout handles it)
  if (isAdminPage) {
    return (
      <AuthProvider>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </AuthProvider>
    );
  }

  if (isChatPage) {
    // For chat pages, show only header with full height layout
    return (
      <AuthProvider>
        <ChatSidebarProvider>
          <div className="flex flex-col h-screen">
            <Header />
            <main className="flex-1 overflow-hidden">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </main>
          </div>
        </ChatSidebarProvider>
      </AuthProvider>
    );
  }

  // For all other pages, show header and footer with normal layout
  return (
    <AuthProvider>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
