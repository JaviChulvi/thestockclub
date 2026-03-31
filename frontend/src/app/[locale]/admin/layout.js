'use client';

import AdminRoute from '@/components/AdminRoute';
import AdminHeader from '@/components/AdminHeader';
import { useAuth } from '@/contexts/AuthContext';
import { Toaster } from "@/components/ui/sonner";

export default function AdminLayout({ children }) {
  const { loading } = useAuth();

  // Don't show anything while loading auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff1e0] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminRoute>
      <div className="min-h-screen bg-[#fff1e0] flex flex-col">
        <AdminHeader />
        <main className="flex-1">
          {children}
        </main>
        <Toaster position="bottom-right" />
      </div>
    </AdminRoute>
  );
}

