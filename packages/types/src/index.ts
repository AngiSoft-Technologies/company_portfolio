export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  result?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  status: number;
  message: string;
  cause?: unknown;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Employee {
  id: string;
  name: string;
  email: string | null;
  role: Role;
  avatarUrl?: string | null;
  title?: string | null;
}

export type Role = 'ADMIN' | 'MARKETING' | 'DEVELOPER';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name?: string;
}

export interface BookingStatusEvent {
  bookingId: string;
  type: 'status' | 'payment' | 'message' | 'note';
  title: string;
  status: string;
  createdAt?: string;
}

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  createdAt: string;
}

export interface PaymentStatusPayload {
  bookingId: string;
  status: string;
  amount: number;
  currency: string;
  providerId: string;
}

export interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export interface BrandColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  accent: string;
  success: string;
  successDark: string;
  warning: string;
  error: string;
  navy: string;
  navyLight: string;
  offWhite: string;
  text: string;
  textSecondary: string;
}

export interface ProductInfo {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  icon: string;
  gradient?: string;
  features: string[];
}