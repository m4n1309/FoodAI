import { createContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../hooks/useAuth.js';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (user?.restaurantId) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const newSocket = io(apiUrl, {
        withCredentials: true,
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        newSocket.emit('join_restaurant', user.restaurantId);
      });

      setSocket(newSocket);

      return () => {
        newSocket.emit('leave_restaurant', user.restaurantId);
        newSocket.disconnect();
      };
    }
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
