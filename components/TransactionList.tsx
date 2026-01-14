
import React from 'react';
import { Transaction, Category, Account, TransactionType } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  onDetailBill?: (transaction: Transaction) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, categories, accounts, onDetailBill }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR');
  };

  const getCategory = (id: string) => categories.find(c => c.id === id);
  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'Sem Conta';

  // Função para limpar a descrição removendo metadados internos
  const getCleanDescription = (t: Transaction, category?: Category) => {
    if (!t.description) return category?.name || 'Sem Grupo';
    // Remove o padrão [CARD:...] e espaços extras
    return t.description.replace(/\[CARD:.*?\]\s*/, '').trim() || category?.name || 'Sem Grupo';
  };

  return (
    <div className="space-y-4 pb-20 font-['Outfit']">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Últimos Lançamentos</h2>
        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{transactions.length} registros</span>
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white p-20 rounded-[40px] border border-slate-100 text-center">
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Nenhum lançamento encontrado</p>
        </div>
      ) : (
        transactions.map((t) => {
          const category = getCategory(t.categoryId);
          const isCreditCardPayment = category?.name.toLowerCase().includes('cartão de crédito');
          const displayDescription = getCleanDescription(t, category);

          return (
            <div key={t.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group">
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
                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-none">
                      {displayDescription}
                    </p>
                    {isCreditCardPayment && onDetailBill && (
                      <button 
                        onClick={() => onDetailBill(t)}
                        className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                        title="Detalhar Fatura"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 items-center mt-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{getAccountName(t.accountId)}</span>
                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(t.date)}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
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
