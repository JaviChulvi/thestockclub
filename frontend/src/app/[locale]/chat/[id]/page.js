'use client';

import { useParams } from 'next/navigation';
import ChatContent from '@/components/ChatContent';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function Chat() {
  const params = useParams();
  const conversationId = params.id;

  return (
    <ProtectedRoute>
      <ChatContent conversationId={conversationId} />
    </ProtectedRoute>
  );
}
