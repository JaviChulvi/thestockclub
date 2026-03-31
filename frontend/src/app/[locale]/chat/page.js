'use client';

import ChatContent from '@/components/ChatContent';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function Chat() {
  return (
    <ProtectedRoute>
      <ChatContent conversationId={null} />
    </ProtectedRoute>
  );
}
