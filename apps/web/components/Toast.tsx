import type { ReactNode } from 'react';

export type ToastProps = {
  message: ReactNode;
  type?: 'success' | 'error' | 'info';
  visible: boolean;
};

export function Toast({ message, type = 'info', visible }: ToastProps) {
  return (
    <div className={`toast ${type} ${visible ? 'show' : ''}`}>
      {message}
    </div>
  );
}
