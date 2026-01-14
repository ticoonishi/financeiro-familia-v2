
import React, { useState, useMemo } from 'react';
import { Transaction, Category, Account, TransactionType } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  onDetailBill?: (transaction: Transaction) => void;
  onEditTransaction?: (transaction: Transaction) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, categories, accounts, onDetailBill, onEditTransaction }) => {
  // Estados de Filtro e Ordenação
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [filterAccount, setFilterAccount] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  
  // Define o período padrão como o mês corrente (formato YYYY-MM) ou atalhos (15, 30, 60)
  const [filterPeriod, setFilterPeriod] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR');
  };

  const getCategory = (id: string) => categories.find(c => c.id === id);
  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'Sem Conta';

  const getCleanDescription = (t: Transaction, category?: Category) => {
    if (!t.description) return category?.name || 'Sem Grupo';
    return t.description.replace(/\[CARD:.*?\]\s*/, '').trim() || category?.name || 'Sem Grupo';
  };

  // Lógica de Processamento da Lista e Resumo
  const { processedTransactions, selectionStats } = useMemo(() => {
    let list = [...transactions];

    // Aplicar Filtros de Período
    if (filterPeriod) {
      if (['15', '30', '60'].includes(filterPeriod)) {
        const days = parseInt(filterPeriod);
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - days);
        limitDate.setHours(0, 0, 0, 0);
        list = list.filter(t => new Date(t.date + 'T12:00:00') >= limitDate);
      } else {
        // Filtro por Mês (YYYY-MM)
        list = list.filter(t => t.date.startsWith(filterPeriod));
      }
    }

    // Aplicar Filtros de Conta e Categoria
    if (filterAccount) {
      list = list.filter(t => t.accountId === filterAccount);
    }
    if (filterCategory) {
      list = list.filter(t => t.categoryId === filterCategory);
    }

    // Calcular Estatísticas do Filtro
    const stats = list.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    }, { income: 0, expense: 0 });

    // Aplicar Ordenação
    list.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        return b.amount - a.amount;
      }
    });

    return { 
      processedTransactions: list, 
      selectionStats: { ...stats, balance: stats.income - stats.expense } 
    };
  }, [transactions, filterAccount, filterCategory, filterPeriod, sortBy]);

  // Lista única de meses presentes nos dados para o filtro (limitado a 24 meses e data min 2026)
  const availableMonths = useMemo(() => {
    const monthsWithData = new Set<string>();
    transactions.forEach(t => monthsWithData.add(t.date.substring(0, 7)));
    
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 24);
    const cutoffStr = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`;
    
    const finalSet = new Set<string>();
    finalSet.add(currentMonth); // Sempre incluir mês atual
    
    monthsWithData.forEach(m => {
      // Incluir se tiver dados, estiver no intervalo de 24 meses e for >= Jan/2026
      if (m >= cutoffStr && m >= '2026-01') {
        finalSet.add(m);
      }
    });

    return Array.from(finalSet).sort().reverse();
  }, [transactions]);

  return (
    <div className="space-y-6 pb-20 font-['Outfit']">
      {/* Barra de Filtros e Ordenação */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Filtros e Ordenação</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setSortBy('date')}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === 'date' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
            >
              Data
            </button>
            <button 
              onClick={() => setSortBy('amount')}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === 'amount' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
            >
              Valor
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select 
            value={filterAccount} 
            onChange={e => setFilterAccount(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase text-slate-600 outline-none"
          >
            <option value="">Todas as Contas</option>
            {accounts.filter(a => a.isActive).map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>

          <select 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase text-slate-600 outline-none"
          >
            <option value="">Todos os Grupos</option>
            {categories.filter(c => c.isActive).map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select 
            value={filterPeriod} 
            onChange={e => setFilterPeriod(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase text-slate-600 outline-none"
          >
            <optgroup label="Atalhos">
              <option value="15">Últimos 15 Dias</option>
              <option value="30">Últimos 30 Dias</option>
              <option value="60">Últimos 60 Dias</option>
            </optgroup>
            <optgroup label="Meses">
              <option value="">Qualquer Período</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{new Date(m + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Resumo Financeiro da Filtragem */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm">
          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest block mb-1">Entradas</span>
          <span className="text-[11px] font-black text-emerald-500">{formatCurrency(selectionStats.income)}</span>
        </div>
        <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm">
          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest block mb-1">Saídas</span>
          <span className="text-[11px] font-black text-rose-500">{formatCurrency(selectionStats.expense)}</span>
        </div>
        <div className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm">
          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest block mb-1">Saldo</span>
          <span className={`text-[11px] font-black ${selectionStats.balance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
            {formatCurrency(selectionStats.balance)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lançamentos</h2>
        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{processedTransactions.length} encontrados</span>
      </div>

      {processedTransactions.length === 0 ? (
        <div className="bg-white p-20 rounded-[40px] border border-slate-100 text-center">
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Nenhum lançamento corresponde aos filtros</p>
          <button 
            onClick={() => { 
              setFilterAccount(''); 
              setFilterCategory(''); 
              const now = new Date();
              setFilterPeriod(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`); 
            }}
            className="mt-4 text-blue-500 font-black text-[9px] uppercase tracking-widest underline"
          >
            Resetar Filtros
          </button>
        </div>
      ) : (
        processedTransactions.map((t) => {
          const category = getCategory(t.categoryId);
          const isCreditCardPayment = category?.name.toLowerCase().includes('cartão de crédito');
          const displayDescription = getCleanDescription(t, category);

          return (
            <div key={t.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${t.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                  {t.type === TransactionType.INCOME ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18 15 12 9 6 15"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-none max-w-[150px] truncate">
                      {displayDescription}
                    </p>
                    <div className="flex items-center gap-1">
                      {isCreditCardPayment && onDetailBill && (
                        <button 
                          onClick={() => onDetailBill(t)}
                          className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                          title="Detalhar Fatura"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        </button>
                      )}
                      {onEditTransaction && (
                        <button 
                          onClick={() => onEditTransaction(t)}
                          className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 hover:text-blue-500 transition-colors"
                          title="Editar Lançamento"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center mt-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[80px]">{getAccountName(t.accountId)}</span>
                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(t.date)}</span>
                  </div>
                </div>
              </div>
              <div className="text-right min-w-[100px]">
                <p className={`text-sm font-black tracking-tight ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-800'}`}>
                  {t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}
                </p>
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{t.createdBy}</p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default TransactionList;
