import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function ChatPage() {
  const { ready } = useRequireAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready) {
      router.replace('/messages');
    }
  }, [ready, router]);

  return null;
}
