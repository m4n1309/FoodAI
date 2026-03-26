import { useContext } from 'react';
import { SocketContext } from '../state/SocketContext.jsx';

export const useSocket = () => {
  return useContext(SocketContext);
};
