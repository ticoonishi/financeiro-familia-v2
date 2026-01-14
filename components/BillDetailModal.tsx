
import React, { useState, useMemo } from 'react';
import { Transaction, Category, BillItem, TransactionType, Account } from '../types';
import Button from './Button';

interface BillDetailModalProps {
  transaction: Transaction;
  categories: Category[];
  accounts: Account[];
  allTransactions: Transaction[];
  onSave: (cardId: string, items: BillItem[]) => void;
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
  // Extraímos o cardId de dentro da descrição ou do campo cardId
  const cardId = useMemo(() => {
    const match = transaction.description.match(/\[CARD:([\w-]+)\]/i);
    return match ? match[1] : (transaction.cardId || '');
  }, [transaction.description, transaction.cardId]);

  const cardAccount = useMemo(() => {
    return accounts.find(a => a.id === cardId);
  }, [cardId, accounts]);

  const cardName = cardAccount?.name || 'Cartão não identificado';
  
  const [items, setItems] = useState<BillItem[]>(transaction.billItems || []);
  
  const activeExpenseCategories = categories.filter(c => c.isActive && c.type === TransactionType.EXPENSE);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Nova lógica de máscara para evitar erros com valores altos e separadores de milhar
  const formatValueForInput = (val: number) => {
    if (val === 0) return '';
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleAmountChange = (id: string, rawValue: string) => {
    // Remove tudo que não é dígito
    const digits = rawValue.replace(/\D/g, '');
    // Trata como centavos
    const numericValue = Number(digits) / 100;
    updateItem(id, 'amount', numericValue);
  };

  const detectedTransactions = useMemo(() => {
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

  const totalDetected = detectedTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalManual = items.reduce((sum, item) => sum + item.amount, 0);
  const totalComposed = totalDetected + totalManual;
  const difference = transaction.amount - totalComposed;

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(), description: '', amount: 0, categoryId: '' }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof BillItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  return (
    <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto font-['Outfit'] space-y-6">
      <div className="text-center">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Detalhamento de Fatura</h3>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{cardName}</h2>
        <p className="text-[10px] font-black text-indigo-500 uppercase mt-1">Valor Total Pago: {formatCurrency(transaction.amount)}</p>
      </div>

      {/* Seção de Lançamentos Detectados */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compras Identificadas</h4>
           <span className="text-[10px] font-black text-emerald-600">{formatCurrency(totalDetected)}</span>
        </div>
        
        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
          {detectedTransactions.length === 0 ? (
            <p className="text-[9px] font-bold text-slate-300 uppercase text-center py-4 italic tracking-widest">Nenhuma compra individual encontrada para este cartão no mês</p>
          ) : (
            detectedTransactions.map(t => (
              <div key={t.id} className="flex justify-between items-center text-[10px] font-bold text-slate-600 py-2 border-b border-slate-50 last:border-0">
                <span className="uppercase">{t.description || 'Compra sem descrição'}</span>
                <span className="font-black">{formatCurrency(t.amount)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Seção de Itens Manuais */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ajustes Manuais (Anuidades, Taxas, Etc)</h4>
           <span className="text-[10px] font-black text-blue-600">{formatCurrency(totalManual)}</span>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="p-5 bg-slate-50 rounded-[24px] border border-slate-100 space-y-3 relative group animate-in fade-in zoom-in-95 duration-200">
               <button type="button" onClick={() => removeItem(item.id)} className="absolute top-3 right-3 text-slate-300 hover:text-rose-500 transition-colors p-1">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
               </button>
               
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Descrição</label>
                    <input 
                      placeholder="Descrição do ajuste" 
                      value={item.description} 
                      onChange={e => updateItem(item.id, 'description', e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1 text-blue-500">Valor R$</label>
                    <input 
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00" 
                      value={formatValueForInput(item.amount)} 
                      onChange={e => handleAmountChange(item.id, e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[11px] font-black outline-none focus:ring-2 focus:ring-blue-500/10 transition-all text-blue-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Grupo de Gasto</label>
                    <select 
                      value={item.categoryId} 
                      onChange={e => updateItem(item.id, 'categoryId', e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                    >
                      <option value="">SELECIONE...</option>
                      {activeExpenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
               </div>
            </div>
          ))}
          
          <button type="button" onClick={addItem} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-[24px] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/10 transition-all">
            + Adicionar Ajuste Manual
          </button>
        </div>
      </div>

      {/* Resumo da Conciliação */}
      <div className={`p-8 rounded-[32px] text-center border transition-all duration-500 ${Math.abs(difference) < 0.01 ? 'bg-emerald-50 border-emerald-100 text-emerald-700 shadow-lg shadow-emerald-100/50' : 'bg-rose-50 border-rose-100 text-rose-700 shadow-lg shadow-rose-100/50'}`}>
        <p className="text-[9px] font-black uppercase tracking-[0.2em]">Diferença para Conciliação</p>
        <p className="text-3xl font-black mt-1 tracking-tighter">{formatCurrency(difference)}</p>
        {Math.abs(difference) < 0.01 ? (
          <div className="flex items-center justify-center gap-2 mt-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
            <p className="text-[8px] font-black uppercase tracking-widest">Fatura 100% detalhada e pronta</p>
          </div>
        ) : (
          <p className="text-[8px] font-black uppercase mt-2 opacity-60 tracking-widest">Os gastos acima precisam somar o valor total pago</p>
        )}
      </div>

      <div className="flex gap-4 pt-4">
        <Button variant="secondary" onClick={onCancel} className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest rounded-2xl">Cancelar</Button>
        <Button 
          variant="primary" 
          onClick={() => onSave(cardId, items)} 
          className="flex-[2] py-5 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 rounded-2xl"
        >
          Salvar Detalhamento
        </Button>
      </div>
    </div>
  );
};

export default BillDetailModal;
