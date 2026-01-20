// Toast notification system
class ToastManager {
  constructor() {
    this.toasts = [];
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(toast) {
    const id = Date.now() + Math.random();
    const newToast = { ...toast, id };
    this.toasts = [...this.toasts, newToast];
    this.listeners.forEach(listener => listener(this.toasts));

    // Auto remove after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        this.remove(id);
      }, toast.duration || 5000);
    }

    return id;
  }

  remove(id) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.listeners.forEach(listener => listener(this.toasts));
  }

  success(message, duration = 5000) {
    return this.notify({ type: 'success', message, duration });
  }

  error(message, duration = 5000) {
    return this.notify({ type: 'error', message, duration });
  }

  info(message, duration = 5000) {
    return this.notify({ type: 'info', message, duration });
  }

  warning(message, duration = 5000) {
    return this.notify({ type: 'warning', message, duration });
  }
}

export const toast = new ToastManager();

