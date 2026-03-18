import type { User } from '@/types';
import { generateId } from '@/lib/utils';

const STORAGE_KEY = 'cricketx_user';
const USERS_KEY = 'cricketx_users';

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function getAllUsers(): User[] {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as User[];
  } catch {
    return [];
  }
}

export function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function saveCurrentUser(user: User): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  saveUsers(users);
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function loginUser(email: string, password: string): User | null {
  const users = getAllUsers();
  // Check admin
  if (email === 'admin@cricketx.com' && password === 'Admin@123') {
    const admin: User = {
      id: 'admin-001',
      email: 'admin@cricketx.com',
      phone: '+1-000-000-0000',
      name: 'Admin',
      role: 'admin',
      pointsBalance: 0,
      currency: 'CAD',
      isVerified: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      totalDeposited: 0,
      totalWithdrawn: 0,
      kycStatus: 'verified',
    };
    saveCurrentUser(admin);
    return admin;
  }
  const user = users.find(u => u.email === email);
  if (!user) return null;
  // In real app: compare hashed password. Here: store plaintext for demo
  const storedPw = localStorage.getItem(`pw_${user.id}`);
  if (storedPw !== password) return null;
  if (!user.isActive) return null;
  saveCurrentUser(user);
  return user;
}

export function registerUser(data: {
  email: string;
  password: string;
  name: string;
  phone: string;
  currency: 'CAD' | 'USD' | 'INR';
}): User {
  const users = getAllUsers();
  const existing = users.find(u => u.email === data.email);
  if (existing) throw new Error('Email already registered');

  const user: User = {
    id: generateId(),
    email: data.email,
    phone: data.phone,
    name: data.name,
    role: 'user',
    pointsBalance: 1000, // welcome bonus
    currency: data.currency,
    isVerified: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    totalDeposited: 0,
    totalWithdrawn: 0,
    kycStatus: 'pending',
  };

  localStorage.setItem(`pw_${user.id}`, data.password);
  saveCurrentUser(user);
  return user;
}

export function updateUserBalance(userId: string, newBalance: number): User | null {
  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx < 0) return null;
  users[idx].pointsBalance = newBalance;
  saveUsers(users);
  const current = getCurrentUser();
  if (current && current.id === userId) {
    current.pointsBalance = newBalance;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    return current;
  }
  return users[idx];
}
