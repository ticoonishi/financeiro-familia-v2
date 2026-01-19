
import React, { useState, useMemo } from 'react';
import { Transaction, Category, BillItem, TransactionType, Account } from '../types';
import Button from './Button';

interface BillDetailModalProps {
  transaction: Transaction;
  categories: Category[];
  accounts: Account[];
  allTransactions: Transaction[];
  onSave: (cardId: string, items: BillItem[], updatedPurchases: Transaction[]) => void;
  onCancel: () => void;
}

const BillDetailModal: React.FC<BillDetailModalProps> = ({ 
  transaction, 
  categories, 
  accounts,
  allTransactions,
  onSave, 
  onCancel 
}) => {
  const cardId = useMemo(() => {
    const match = transaction.description.match(/\[CARD:([\w-]+)\]/i);
    return match ? match[1] : (transaction.cardId || '');
  }, [transaction.description, transaction.cardId]);

  const cardAccount = useMemo(() => {
    return accounts.find(a => a.id === cardId);
  }, [cardId, accounts]);

  const cardName = cardAccount?.name || 'Cartão não identificado';
  
  // Itens manuais (anuidades, taxas)
  const [manualItems, setManualItems] = useState<BillItem[]>(transaction.billItems || []);

  // Transações reais detectadas no período
  const initialPurchases = useMemo(() => {
    if (!cardId) return [];
    const billDate = new Date(transaction.date + 'T12:00:00');
    const billMonth = billDate.getMonth();
    const billYear = billDate.getFullYear();

    return allTransactions.filter(t => {
      if (t.accountId !== cardId) return false;
      if (t.id === transaction.id) return false;
      const tDate = new Date(t.date + 'T12:00:00');
      return tDate.getMonth() === billMonth && tDate.getFullYear() === billYear;
    });
  }, [cardId, transaction.id, transaction.date, allTransactions]);

  // Estado para permitir editar as transações reais diretamente aqui
  const [editablePurchases, setEditablePurchases] = useState<Transaction[]>(initialPurchases);

  const activeExpenseCategories = categories.filter(c => c.isActive && c.type === TransactionType.EXPENSE);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatValueForInput = (val: number) => {
    if (isNaN(val)) return "0,00";
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    const formatted = absVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return isNeg ? `-${formatted}` : formatted;
  };

  const handlePurchaseChange = (id: string, field: 'description' | 'amount', value: string) => {
    setEditablePurchases(prev => prev.map(p => {
      if (p.id !== id) return p;
      if (field === 'amount') {
        // CIRÚRGICO: Permite o caractere '-' para estornos
        const isNegative = value.includes('-');
        const digits = value.replace(/\D/g, '');
        if (!digits && isNegative) return { ...p, amount: -0 }; // Estado intermediário enquanto digita o sinal
        const amount = (Number(digits) / 100) * (isNegative ? -1 : 1);
        return { ...p, amount };
      }
      return { ...p, [field]: value.toUpperCase() };
    }));
  };

  const handleManualItemChange = (id: string, field: keyof BillItem, value: any) => {
    setManualItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (field === 'amount' && typeof value === 'string') {
        // CIRÚRGICO: Permite o caractere '-' para estornos manuais
        const isNegative = value.includes('-');
        const digits = value.replace(/\D/g, '');
        if (!digits && isNegative) return { ...item, amount: -0 };
        const amount = (Number(digits) / 100) * (isNegative ? -1 : 1);
        return { ...item, amount };
      }
      return { ...item, [field]: value };
    }));
  };

  const totalDetected = editablePurchases.reduce((sum, t) => sum + t.amount, 0);
  const totalManual = manualItems.reduce((sum, item) => sum + item.amount, 0);
  const totalComposed = totalDetected + totalManual;
  const difference = transaction.amount - totalComposed;

  const addManualItem = () => {
    setManualItems([...manualItems, { id: Math.random().toString(), description: '', amount: 0, categoryId: '' }]);
  };

  const removeManualItem = (id: string) => {
    setManualItems(manualItems.filter(i => i.id !== id));
  };

  return (
    <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto font-['Outfit'] space-y-6">
      <div className="text-center">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Detalhamento de Fatura</h3>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{cardName}</h2>
        <p className="text-[10px] font-black text-indigo-500 uppercase mt-1">Total da Fatura: {formatCurrency(transaction.amount)}</p>
      </div>

      {/* Seção de Lançamentos Reais (Compras) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gastos no Cartão (Editar Compras)</h4>
           <span className="text-[10px] font-black text-emerald-600">{formatCurrency(totalDetected)}</span>
        </div>
        
        <div className="space-y-3">
          {editablePurchases.length === 0 ? (
            <p className="text-[9px] font-bold text-slate-300 uppercase text-center py-4 italic tracking-widest">Nenhuma compra individual encontrada</p>
          ) : (
            editablePurchases.map(p => (
              <div key={p.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Descrição do Lançamento</label>
                  <input 
                    value={p.description} 
                    onChange={e => handlePurchaseChange(p.id, 'description', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-emerald-500 uppercase ml-1">Valor R$</label>
                  <input 
                    type="text"
                    value={formatValueForInput(p.amount)} 
                    onChange={e => handlePurchaseChange(p.id, 'amount', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black outline-none text-emerald-600"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Seção de Itens Manuais */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ajustes da Fatura (Anuidade/Taxas)</h4>
           <span className="text-[10px] font-black text-blue-600">{formatCurrency(totalManual)}</span>
        </div>

        <div className="space-y-3">
          {manualItems.map((item) => (
            <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 relative group">
               <button type="button" onClick={() => removeManualItem(item.id)} className="absolute top-2 right-2 text-slate-300 hover:text-rose-500 p-1">
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
               </button>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Descrição</label>
                    <input 
                      placeholder="Anuidade, IOF..." 
                      value={item.description} 
                      onChange={e => handleManualItemChange(item.id, 'description', e.target.value.toUpperCase())}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-blue-500 uppercase ml-1">Valor R$</label>
                    <input 
                      type="text"
                      value={formatValueForInput(item.amount)} 
                      onChange={e => handleManualItemChange(item.id, 'amount', e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black outline-none text-blue-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Grupo</label>
                    <select 
                      value={item.categoryId} 
                      onChange={e => handleManualItemChange(item.id, 'categoryId', e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase outline-none"
                    >
                      <option value="">SELECIONE...</option>
                      {activeExpenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
               </div>
            </div>
          ))}
          <button type="button" onClick={addManualItem} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:bg-blue-50/10">
            + Adicionar Ajuste Manual
          </button>
        </div>
      </div>

      {/* Resumo da Conciliação */}
      <div className={`p-6 rounded-[32px] text-center border transition-all ${Math.abs(difference) < 0.01 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
        <p className="text-[9px] font-black uppercase tracking-widest">Diferença Restante</p>
        <p className="text-3xl font-black mt-1 tracking-tighter">{formatCurrency(difference)}</p>
      </div>

      <div className="flex gap-4 pt-4">
        <Button variant="secondary" onClick={onCancel} className="flex-1 py-4 text-[10px] font-black uppercase">Cancelar</Button>
        <Button 
          variant="primary" 
          onClick={() => onSave(cardId, manualItems, editablePurchases)} 
          className="flex-[2] py-4 text-[10px] font-black uppercase"
        >
          Salvar Tudo
        </Button>
      </div>
    </div>
  );
};

export default BillDetailModal;
