
import React, { useState, useMemo } from 'react';
import { Transaction, Category, Account, TransactionType } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  filterPeriod: string;
  setFilterPeriod: (val: string) => void;
  onDetailBill?: (transaction: Transaction) => void;
  onEditTransaction?: (transaction: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ 
  transactions, 
  categories, 
  accounts, 
  filterPeriod, 
  setFilterPeriod, 
  onDetailBill, 
  onEditTransaction, 
  onDeleteTransaction 
}) => {
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [filterAccount, setFilterAccount] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  
  // Estado para controle de confirmação interna de exclusão
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (dateStr: string) => new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR');
  const getCategory = (id: string) => categories.find(c => c.id === id);
  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'Sem Conta';

  // Função para limpar descrições técnicas apenas na exibição
  const formatDisplayDescription = (desc: string, catId: string) => {
    const rawText = desc || getCategory(catId)?.name || '';
    // Remove padrões [CARD:...] e [TRANSFERÊNCIA] da visualização
    return rawText.replace(/\[CARD:.*?\]\s*/g, '').replace(/\[TRANSFERÊNCIA\]\s*/g, '');
  };

  const { processedTransactions, selectionStats } = useMemo(() => {
    let list = [...transactions];
    if (filterPeriod) {
      if (['15', '30', '60'].includes(filterPeriod)) {
        const days = parseInt(filterPeriod);
        const limit = new Date();
        limit.setDate(limit.getDate() - days);
        list = list.filter(t => new Date(t.date + 'T12:00:00') >= limit);
      } else {
        list = list.filter(t => t.date.startsWith(filterPeriod));
      }
    }
    if (filterAccount) list = list.filter(t => t.accountId === filterAccount);
    if (filterCategory) list = list.filter(t => t.categoryId === filterCategory);

    const stats = list.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    }, { income: 0, expense: 0 });

    list.sort((a, b) => sortBy === 'date' ? new Date(b.date).getTime() - new Date(a.date).getTime() : b.amount - a.amount);
    return { processedTransactions: list, selectionStats: { ...stats, balance: stats.income - stats.expense } };
  }, [transactions, filterAccount, filterCategory, filterPeriod, sortBy]);

  const availableMonths = useMemo(() => {
    const finalSet = new Set<string>();
    transactions.forEach(t => finalSet.add(t.date.substring(0, 7)));
    return Array.from(finalSet).sort().reverse();
  }, [transactions]);

  return (
    <div className="space-y-6 pb-20 font-['Outfit']">
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-5">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Filtros e Ordenação</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 text-[10px] font-black uppercase outline-none">
            <option value="">Todas as Contas</option>
            {accounts.filter(a => a.isActive).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 text-[10px] font-black uppercase outline-none">
            <option value="">Todos os Grupos</option>
            {categories.filter(c => c.isActive).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
          <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 text-[10px] font-black uppercase outline-none">
            <option value="15">Últimos 15 Dias</option>
            <option value="30">Últimos 30 Dias</option>
            {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm text-center">
          <span className="text-[8px] font-black text-slate-300 uppercase block">Saídas</span>
          <span className="text-[11px] font-black text-rose-500">{formatCurrency(selectionStats.expense)}</span>
        </div>
        <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm text-center">
          <span className="text-[8px] font-black text-slate-300 uppercase block">Entradas</span>
          <span className="text-[11px] font-black text-emerald-500">{formatCurrency(selectionStats.income)}</span>
        </div>
        <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm text-center">
          <span className="text-[8px] font-black text-slate-300 uppercase block">Saldo</span>
          <span className={`text-[11px] font-black ${selectionStats.balance >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>{formatCurrency(selectionStats.balance)}</span>
        </div>
      </div>

      <div className="space-y-3">
        {processedTransactions.map(t => (
          <div key={t.id} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between group hover:border-blue-100 transition-colors">
            <div className="flex flex-col flex-1 min-w-0 pr-4">
              <span className="text-[10px] font-black uppercase text-slate-800 truncate">
                {formatDisplayDescription(t.description, t.categoryId)}
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(t.date)} • {getAccountName(t.accountId)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-black mr-2 whitespace-nowrap ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-slate-900'}`}>{formatCurrency(t.amount)}</span>
              
              <div className="flex items-center gap-1.5">
                {/* Botão de Detalhes da Fatura (Apenas para cartões) */}
                {getCategory(t.categoryId)?.name.toLowerCase().includes('cartão') && onDetailBill && (
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDetailBill(t); }} 
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                    title="Detalhes da Fatura"
                  >
                    <svg className="pointer-events-none" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </button>
                )}

                {/* Botão de Editar (Sempre visível - TRAVA DE INTERFACE) */}
                {onEditTransaction && (
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEditTransaction(t); }} 
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    title="Editar"
                  >
                    <svg className="pointer-events-none" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                )}

                {/* Botão de Excluir (Otimizado para Mobile com confirmação 2-etapas) */}
                {onDeleteTransaction && (
                  <button 
                    type="button"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (confirmDeleteId === t.id) {
                        onDeleteTransaction(t.id);
                        setConfirmDeleteId(null);
                      } else {
                        setConfirmDeleteId(t.id);
                        // Limpa estado se não confirmar em 3 segundos
                        setTimeout(() => setConfirmDeleteId(curr => curr === t.id ? null : curr), 3000);
                      }
                    }} 
                    className={`p-2.5 rounded-lg transition-all duration-200 relative z-10 flex items-center justify-center ${
                      confirmDeleteId === t.id 
                      ? 'bg-rose-600 text-white scale-110 shadow-lg' 
                      : 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                    }`}
                    title={confirmDeleteId === t.id ? "Toque para Confirmar" : "Excluir"}
                  >
                    {confirmDeleteId === t.id ? (
                      <svg className="pointer-events-none" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <svg className="pointer-events-none" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionList;
