'use client';

import { useGlobalSocket } from '@/hooks/useGlobalSocket';

export function GlobalSocketProvider() {
  useGlobalSocket();
  return null;
}
