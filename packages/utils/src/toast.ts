export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration: number;
}

type ToastListener = (toasts: Toast[]) => void;

class ToastManager {
  private toasts: Toast[] = [];
  private listeners: ToastListener[] = [];

  subscribe(listener: ToastListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notify(toast: Omit<Toast, 'id'>): number {
    const id = Date.now() + Math.random();
    const newToast: Toast = { ...toast, id };
    this.toasts = [...this.toasts, newToast];
    this.listeners.forEach((listener) => listener(this.toasts));

    if (toast.duration !== 0) {
      setTimeout(() => {
        this.remove(id);
      }, toast.duration || 5000);
    }

    return id;
  }

  remove(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.listeners.forEach((listener) => listener(this.toasts));
  }

  success(message: string, duration = 5000): number {
    return this.notify({ type: 'success', message, duration });
  }

  error(message: string, duration = 5000): number {
    return this.notify({ type: 'error', message, duration });
  }

  info(message: string, duration = 5000): number {
    return this.notify({ type: 'info', message, duration });
  }

  warning(message: string, duration = 5000): number {
    return this.notify({ type: 'warning', message, duration });
  }
}

export const toast = new ToastManager();