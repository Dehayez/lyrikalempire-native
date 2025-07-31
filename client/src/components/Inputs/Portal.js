import { createPortal } from 'react-dom';

export default function Portal({ children }) {
  const rootElement = document.getElementById('root');
  return createPortal(children, rootElement);
} 