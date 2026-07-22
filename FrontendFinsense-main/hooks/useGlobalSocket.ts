'use client';

import { useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { playNotificationSound } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/constants';

export function useGlobalSocket() {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socketUrl = API_BASE_URL.replace('/api', '') + '/chat';
    const socket = io(socketUrl, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Join personal room for global notifications
      socket.emit('joinUserRoom', user.id);
    });

    socket.on('globalNotification', (data: any) => {
      playNotificationSound();
      
      if (data.type === 'group_message') {
        addToast({
          message: `Nuevo mensaje de ${data.message.senderName} en ${data.message.groupName}`,
          type: 'success'
        });
      } else if (data.type === 'debt_settled') {
        addToast({
          message: `${data.message.payerName} ha pagado $${data.message.amount} en ${data.message.groupName}`,
          type: 'success'
        });
      } else {
        addToast({
          message: data.message?.body || 'Nueva notificación',
          type: 'success'
        });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, addToast]);
}
