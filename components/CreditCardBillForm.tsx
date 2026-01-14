
import React, { useState, useEffect } from 'react';
// Import User type from types
import { TransactionType, Category, Account, Transaction, User } from '../types';
import Button from './Button';

interface BillItem {
  id: string;
  description: string;
  amount: number;
  categoryId: string;
}

interface CreditCardBillFormProps {
  categories: Category[];
  accounts: Account[];
  // Include currentUser to obtain the creator's name
  currentUser: User;
  // Fix: Omit 'createdAt' as it is required in Transaction but not provided here
  onSave: (transactions: Omit<Transaction, 'id' | 'createdAt'>[]) => void;
  onCancel: () => void;
}

const CreditCardBillForm: React.FC<CreditCardBillFormProps> = ({ 
  categories, 
  accounts, 
  currentUser,
  onSave, 
  onCancel
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cardId, setCardId] = useState('');
  const [fundingAccountId, setFundingAccountId] = useState('');
  const [items, setItems] = useState<BillItem[]>([
    { id: '1', description: '', amount: 0, categoryId: '' }
  ]);

  const activeExpenseCategories = categories.filter(c => c.isActive && c.type === TransactionType.EXPENSE);
  const activeCards = accounts.filter(a => a.isActive && a.isCreditCard);
  const activeBankAccounts = accounts.filter(a => a.isActive && !a.isCreditCard);

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(), description: '', amount: 0, categoryId: '' }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(i => i.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof BillItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const totalBill = items.reduce((sum, item) => sum + item.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardId || !fundingAccountId || items.some(i => !i.categoryId)) return;

    // Fix: Updated type to Omit<Transaction, 'id' | 'createdAt'>
    const newTransactions: Omit<Transaction, 'id' | 'createdAt'>[] = items.map(item => ({
      date,
      amount: item.amount,
      description: item.description || `Item fatura ${activeCards.find(c => c.id === cardId)?.name}`,
      categoryId: item.categoryId,
      accountId: fundingAccountId,
      cardId: cardId,
      type: TransactionType.EXPENSE,
      createdBy: currentUser.name
    }));

    onSave(newTransactions);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-[32px] shadow-xl max-h-[90vh] overflow-y-auto">
      <div className="text-center">
        <h3 className="text-xl font-bold text-slate-800">Lançar Fatura de Cartão</h3>
        <p className="text-sm text-slate-500">Desmembre os gastos do seu cartão para o grupo correto</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase ml-1">Data Pagamento</label>
          <input
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase ml-1">Cartão Utilizado</label>
          <select
            required
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Selecione o cartão...</option>
            {activeCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase ml-1">Conta que pagou</label>
          <select
            required
            value={fundingAccountId}
            onChange={(e) => setFundingAccountId(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Selecione o banco...</option>
            {activeBankAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-400 uppercase ml-1">Itens da Fatura</label>
          <span className="text-sm font-bold text-blue-600">Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBill)}</span>
        </div>
        
        {items.map((item, index) => (
          <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 relative group">
            <button 
              type="button" 
              onClick={() => removeItem(item.id)}
              className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                placeholder="Descrição (ex: Supermercado)"
                value={item.description}
                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Valor R$"
                value={item.amount || ''}
                onChange={(e) => updateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold"
              />
              <select
                required
                value={item.categoryId}
                onChange={(e) => updateItem(item.id, 'categoryId', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
              >
                <option value="">Grupo de Gasto...</option>
                {activeExpenseCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        ))}

        <button 
          type="button" 
          onClick={addItem}
          className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all flex items-center justify-center gap-2 text-sm font-bold"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          ADICIONAR ITEM À FATURA
        </button>
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="secondary" onClick={onCancel} className="flex-1">Cancelar</Button>
        <Button variant="primary" type="submit" className="flex-[2]">Salvar Toda Fatura</Button>
      </div>
    </form>
  );
};

export default CreditCardBillForm;
