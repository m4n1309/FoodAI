import { createContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../hooks/useAuth.js';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const newSocket = io(apiUrl, {
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      if (user?.restaurantId) {
        newSocket.emit('join_restaurant', { restaurantId: user.restaurantId });
        newSocket.emit('join_role_room', { restaurantId: user.restaurantId, role: user.role });
      }
    });

    setSocket(newSocket);

    return () => {
      if (user?.restaurantId) {
        newSocket.emit('leave_restaurant', { restaurantId: user.restaurantId });
        newSocket.emit('leave_role_room', { restaurantId: user.restaurantId, role: user.role });
      }
      newSocket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
