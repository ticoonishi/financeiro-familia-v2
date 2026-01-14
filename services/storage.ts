
import { createClient } from '@supabase/supabase-js';
import { Transaction, Category, Account, TransactionType } from '../types';

const SUPABASE_URL = 'https://tayggbukcvojcudaulhb.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRheWdnYnVrY3ZvamN1ZGF1bGhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMjQyODcsImV4cCI6MjA4MzkwMDI4N30.zPLQN5TFynJiSZD1DgD9P7QIchxhcMezTxiKG2sBjf8'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const normalizeType = (type: any): TransactionType => {
  const t = String(type || '').toUpperCase().trim();
  if (t === 'INCOME' || t === 'RECEITA' || t === 'ENTRADA') return TransactionType.INCOME;
  return TransactionType.EXPENSE;
};

const mapTransaction = (t: any): Transaction => ({
  id: String(t.id),
  date: t.date || t.created_at || new Date().toISOString(),
  createdAt: t.created_at || new Date().toISOString(),
  amount: Number(t.amount || 0),
  description: t.description || '',
  categoryId: String(t.category_id || ''),
  accountId: String(t.account_id || ''),
  // Removido cardId da coluna física pois ela não existe no banco do usuário
  type: normalizeType(t.type),
  createdBy: t.created_by || 'Sistema',
  billItems: t.bill_items || [],
  installmentNumber: t.installment_number,
  totalInstallments: t.total_installments,
  installmentGroupId: t.installment_group_id
});

const mapCategory = (c: any): Category => ({
  id: String(c.id),
  name: String(c.name || ''),
  type: normalizeType(c.type),
  isActive: Boolean(c.is_active ?? true)
});

const mapAccount = (a: any): Account => ({
  id: String(a.id),
  name: String(a.name || ''),
  isActive: Boolean(a.is_active ?? true),
  isCreditCard: Boolean(a.is_credit_card ?? false),
  initialBalance: Number(a.initial_balance || 0),
  initialBalanceDate: a.initial_balance_date || '2026-01-01',
  closingDay: Number(a.closing_day || 0)
});

export const getCloudStatus = async () => {
  try {
    const { error } = await supabase.from('contas').select('id').limit(1);
    if (error) throw error;
    return { ok: true, message: 'Nuvem Ativa' };
  } catch (e: any) {
    return { ok: false, message: 'Nuvem Offline' };
  }
};

export const fetchTransactions = async (): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabase.from('transacoes').select('*').order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapTransaction);
  } catch (e: any) {
    return [];
  }
};

export const fetchCategories = async (): Promise<Category[]> => {
  try {
    const { data, error } = await supabase.from('categorias').select('*').order('name');
    if (error) throw error;
    return (data || []).map(mapCategory);
  } catch (e: any) {
    return [];
  }
};

export const fetchAccounts = async (): Promise<Account[]> => {
  try {
    const { data, error } = await supabase.from('contas').select('*').order('name');
    if (error) throw error;
    return (data || []).map(mapAccount);
  } catch (e: any) {
    return [];
  }
};

export const insertTransaction = async (t: Omit<Transaction, 'id' | 'createdAt'>) => {
  const { data, error } = await supabase.from('transacoes').insert([{
    amount: t.amount,
    description: t.description,
    category_id: t.categoryId,
    account_id: t.accountId,
    // card_id removido para evitar erro de coluna inexistente no Supabase
    type: t.type,
    created_by: t.createdBy,
    date: t.date,
    bill_items: t.billItems || [],
    installment_number: t.installmentNumber,
    total_installments: t.totalInstallments,
    installment_group_id: t.installmentGroupId
  }]).select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Falha ao inserir transação");
  return mapTransaction(data[0]);
};

export const insertCategory = async (c: Omit<Category, 'id'>) => {
  const { data, error } = await supabase.from('categorias').insert([{
    name: c.name,
    type: c.type,
    is_active: c.isActive
  }]).select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Falha ao inserir categoria");
  return mapCategory(data[0]);
};

export const insertAccount = async (a: Omit<Account, 'id'>) => {
  const { data, error } = await supabase.from('contas').insert([{
    name: a.name,
    is_active: a.isActive,
    is_credit_card: a.isCreditCard,
    initial_balance: a.initialBalance,
    initial_balance_date: a.initialBalanceDate || '2026-01-01',
    closing_day: a.closingDay
  }]).select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Falha ao inserir conta");
  return mapAccount(data[0]);
};

export const updateAccount = async (id: string, updates: Partial<Account>) => {
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;
  if (updates.initialBalance !== undefined) payload.initial_balance = Number(updates.initialBalance);
  if (updates.initialBalanceDate !== undefined) payload.initial_balance_date = updates.initialBalanceDate;
  if (updates.closingDay !== undefined) payload.closing_day = Number(updates.closingDay);
  
  const { data, error } = await supabase.from('contas').update(payload).eq('id', id).select();
  if (error) throw new Error(error.message || "Erro ao atualizar banco");
  if (!data || data.length === 0) throw new Error("Conta não encontrada");
  return mapAccount(data[0]);
};

export const updateCategory = async (id: string, updates: Partial<Category>) => {
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.type !== undefined) payload.type = updates.type;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;
  
  const { data, error } = await supabase.from('categorias').update(payload).eq('id', id).select();
  if (error) throw new Error(error.message || "Erro ao atualizar categoria");
  if (!data || data.length === 0) throw new Error("Categoria não encontrada");
  return mapCategory(data[0]);
};

export const deleteAccount = async (id: string) => {
  const { error } = await supabase.from('contas').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

export const deleteCategory = async (id: string) => {
  const { error } = await supabase.from('categorias').delete().eq('id', id);
  if (error) throw new Error(error.message);
};
