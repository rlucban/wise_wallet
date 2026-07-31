export type TransactionType = "income" | "expense";
export type DueFrequency = "once" | "weekly" | "biweekly" | "monthly" | "yearly";
export type PaymentMethod = string;

export interface PaymentMethodInfo {
  id: string;
  name: string;
  type: string;
  icon?: string;
}

export interface TimestampedEntity {
  updatedAt: number;
}

export interface Category extends TimestampedEntity {
  id: string;
  name: string;
  type: TransactionType;
  isGlobal?: boolean;
}

export interface Transaction extends TimestampedEntity {
  id: string;
  title?: string;
  amount: number;
  category?: Category;
  date: string;
  note?: string;
  receiptUrl?: string;
  type: TransactionType;
  paymentMethod?: PaymentMethod;
  establishment?: string;
  splitInfo?: {
    people: number;
    amountPerPerson: number;
    notes?: string;
    participants?: { name: string; amount: number; paid: boolean }[];
  };
  dueId?: string;
}

export interface Due extends TimestampedEntity {
  id: string;
  title: string;
  amount: number;
  date: string;
  frequency?: DueFrequency;
  type: TransactionType;
  categoryId?: string;
  autoProcess?: boolean;
  completed?: boolean;
}

export interface SavingsItem extends TimestampedEntity {
  id: string;
  title: string;
  balance: number;
  icon?: string;
  color?: string;
}

export interface Agenda extends TimestampedEntity {
  id: string;
  title?: string;
  amount?: number;
  date?: string;
  frequency?: DueFrequency;
  type?: TransactionType;
  categoryId?: string;
  autoProcess?: boolean;
  completed?: boolean;
}

export interface Subscription extends TimestampedEntity {
  id: string;
}

export interface Budget extends TimestampedEntity {
  id: string;
}

export interface UserProfile {
  name: string;
  isFirstRun: boolean;
  initialBalance: number;
  isDarkMode: boolean;
  language: string;
  currency: string;
  decimalPoints: number;
  autoBackup: boolean;
}
