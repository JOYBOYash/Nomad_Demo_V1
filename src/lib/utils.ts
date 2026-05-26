import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Simple ID generator
export function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

// Dev users for testing
export const DEV_USERS = [
  { id: 'usr_1', name: 'Alex (Dev)', email: 'alex@nomad.dev', avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Alex' },
  { id: 'usr_2', name: 'Bob (Dev)', email: 'bob@nomad.dev', avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Bob' },
  { id: 'usr_3', name: 'Taylor (Dev)', email: 'taylor@nomad.dev', avatarUrl: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Taylor' }
];

export function formatDate(isoString: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(isoString));
}
