export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export interface User {
  id: string;
  name: string;
  email: string;
  defaultAccountId?: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  isActive: boolean;
}

export interface Account {
  id: string;
  name: string;
  isActive: boolean;
  isCreditCard: boolean;
  initialBalance?: number; 
  initialBalanceDate?: string;
}

export interface BillItem {
  id: string;
  description: string;
  amount: number;
  categoryId: string;
}

export interface Transaction {
  id: string;
  date: string; 
  createdAt: string; 
  updatedAt?: string; 
  amount: number;
  description: string;
  categoryId: string;
  accountId: string; 
  cardId?: string;   
  type: TransactionType;
  billItems?: BillItem[]; 
  createdBy: string;    
  updatedBy?: string;   
}

export type TimeRange = 'monthly' | 'bi-monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'fortnight';

export interface DashboardStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeByCategory: { name: string; value: number }[];
  expenseByCategory: { name: string; value: number }[];
  dailyTrend: { date: string; income: number; expense: number }[];
  previousPeriodIncome: number;
  previousPeriodExpense: number;
  monthlyHistory: { month: string; income: number; expense: number }[];
}