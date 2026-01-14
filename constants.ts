
import { Category, Account, TransactionType } from './types';

export const APP_VERSION = '4.1.0-DEFINITIVE'; 

export const INITIAL_INCOME_CATEGORIES: Category[] = [
  { id: 'inc-1', name: 'Aluguel de imóvel', type: TransactionType.INCOME, isActive: true },
  { id: 'inc-2', name: 'Cetap Tico', type: TransactionType.INCOME, isActive: true },
  { id: 'inc-3', name: 'Consultório Sandra', type: TransactionType.INCOME, isActive: true },
  { id: 'inc-4', name: 'Aulas Sandra', type: TransactionType.INCOME, isActive: true },
  { id: 'inc-5', name: 'Tico outras empresas', type: TransactionType.INCOME, isActive: true },
  { id: 'inc-6', name: 'Empréstimos', type: TransactionType.INCOME, isActive: true },
  { id: 'inc-7', name: 'Outras receitas', type: TransactionType.INCOME, isActive: true },
];

export const INITIAL_EXPENSE_CATEGORIES: Category[] = [
  { id: 'exp-card', name: 'Cartão de Crédito', type: TransactionType.EXPENSE, isActive: true },
  { id: 'exp-1', name: 'Gastos com Pessoal', type: TransactionType.EXPENSE, isActive: true },
  { id: 'exp-2', name: 'Gastos com PET', type: TransactionType.EXPENSE, isActive: true },
  { id: 'exp-3', name: 'Alimentação e Abastecimento', type: TransactionType.EXPENSE, isActive: true },
  { id: 'exp-4', name: 'Moradia e Manutenção', type: TransactionType.EXPENSE, isActive: true },
  { id: 'exp-5', name: 'Transporte e Mobilidade', type: TransactionType.EXPENSE, isActive: true },
  { id: 'exp-6', name: 'Educação e Filhos', type: TransactionType.EXPENSE, isActive: true },
  { id: 'exp-7', name: 'Lazer, Estilo de Vida e Compras', type: TransactionType.EXPENSE, isActive: true },
  { id: 'exp-8', name: 'Saúde e Cuidados Pessoais', type: TransactionType.EXPENSE, isActive: true },
  { id: 'exp-9', name: 'Financeiro (Dívidas e Impostos)', type: TransactionType.EXPENSE, isActive: true },
  { id: 'exp-10', name: 'Transferências entre contas', type: TransactionType.EXPENSE, isActive: true },
  { id: 'exp-11', name: 'Outros', type: TransactionType.EXPENSE, isActive: true },
];

export const INITIAL_ACCOUNTS: Account[] = [
  { id: 'acc-1', name: 'Banco do Brasil Tico', isActive: true, isCreditCard: false, initialBalance: 0 },
  { id: 'acc-2', name: 'Bradesco Tico', isActive: true, isCreditCard: false, initialBalance: 0 },
  { id: 'acc-3', name: 'Itaú Sandra', isActive: true, isCreditCard: false, initialBalance: 0 },
  { id: 'acc-4', name: 'Bradesco Sandra', isActive: true, isCreditCard: false, initialBalance: 0 },
  { id: 'acc-5', name: 'Dinheiro', isActive: true, isCreditCard: false, initialBalance: 0 },
  { id: 'card-1', name: 'American Express Tico', isActive: true, isCreditCard: true, initialBalance: 0 },
  { id: 'card-2', name: 'Visa Infinite Tico', isActive: true, isCreditCard: true, initialBalance: 0 },
  { id: 'card-3', name: 'Master Black Tico', isActive: true, isCreditCard: true, initialBalance: 0 },
  { id: 'card-4', name: 'Itau Sandra', isActive: true, isCreditCard: true, initialBalance: 0 },
  { id: 'card-5', name: 'Bradesco Sandra', isActive: true, isCreditCard: true, initialBalance: 0 },
];
