export interface User {
  id: string;
  name: string;
  balance: number;
}

export interface QuickAction {
  id: string;
  icon: string;
  label: string;
  action: () => void;
}

export interface Transaction {
  id: string;
  type: 'send' | 'receive';
  amount: number;
  date: Date;
  recipient?: string;
  sender?: string;
  avatarUrl?: string;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
}
