
import React, { useMemo, useState } from 'react';
import { 
  Tooltip, ResponsiveContainer, 
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Line 
} from 'recharts';
import { Transaction, Category, DashboardStats, Account, TransactionType } from '../types';

interface DashboardProps {
  stats: DashboardStats;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  filterPeriod: string;
}

const COLORS_PARETO = '#6366f1';

const Dashboard: React.FC<DashboardProps> = ({ 
  stats, 
  transactions, 
  accounts, 
  categories, 
  filterPeriod
}) => {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const cleanDescription = (desc: string) => {
    return desc.replace(/\[CARD:.*?\]\s*/g, '').replace(/\[TRANSFERÊNCIA\]\s*/g, '') || 'Sem descrição';
  };

  const { dailyAverage, healthStatus } = useMemo(() => {
    const isShortcut = ['15', '30', '60'].includes(filterPeriod);
    let days = 30;

    if (isShortcut) {
      days = parseInt(filterPeriod);
    } else if (filterPeriod && filterPeriod.includes('-')) {
      const [year, month] = filterPeriod.split('-').map(Number);
      const now = new Date();
      if (year === now.getFullYear() && (month - 1) === now.getMonth()) {
        days = now.getDate();
      } else {
        days = new Date(year, month, 0).getDate();
      }
    }

    const avg = stats.totalExpense / (days || 1);
    
    let health = 'Estável';
    if (stats.averageMonthlyExpense > 0) {
      const ratio = stats.totalExpense / stats.averageMonthlyExpense;
      if (ratio > 1.1) health = 'Acima da Média';
      else if (ratio < 0.9) health = 'Abaixo da Média';
    }

    return { dailyAverage: avg, healthStatus: health };
  }, [stats.totalExpense, stats.averageMonthlyExpense, filterPeriod]);

  const accountBalances = useMemo(() => {
    return accounts
      .filter(acc => acc.isActive && !acc.isCreditCard)
      .map(acc => {
        const accountTransactions = transactions.filter(t => t.accountId === acc.id);
        const income = accountTransactions
          .filter(t => t.type === TransactionType.INCOME)
          .reduce((sum, t) => sum + t.amount, 0);
        const expense = accountTransactions
          .filter(t => t.type === TransactionType.EXPENSE)
          .reduce((sum, t) => sum + t.amount, 0);
        
        return {
          name: acc.name,
          balance: (acc.initialBalance || 0) + income - expense
        };
      })
      .sort((a, b) => b.balance - a.balance);
  }, [accounts, transactions]);

  const paretoData = useMemo(() => {
    const sorted = [...stats.expenseByCategory].sort((a, b) => b.value - a.value);
    const total = sorted.reduce((s, v) => s + v.value, 0);
    let runningSum = 0;
    
    return sorted.map(item => {
      runningSum += item.value;
      return {
        ...item,
        cumulative: total > 0 ? (runningSum / total) * 100 : 0
      };
    });
  }, [stats.expenseByCategory]);

  const getCategoryDetails = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    if (!category) return [];

    const isShortcut = ['15', '30', '60'].includes(filterPeriod);
    const filterByPeriod = (t: Transaction) => {
      if (!filterPeriod) return true;
      if (isShortcut) {
        const days = parseInt(filterPeriod);
        const limit = new Date();
        limit.setDate(limit.getDate() - days);
        return new Date(t.date + 'T12:00:00') >= limit;
      }
      return t.date.startsWith(filterPeriod);
    };

    const validT = transactions.filter(filterByPeriod);
    const creditAccountIds = accounts.filter(a => a.isCreditCard).map(a => a.id);
    const cardBillCat = categories.find(c => c.name.toLowerCase().includes('cartão de crédito'));

    const directExpenses = validT.filter(t => 
      t.type === TransactionType.EXPENSE && 
      !creditAccountIds.includes(t.accountId) && 
      t.categoryId === category.id
    );

    const creditPurchases = validT.filter(t => 
      t.type === TransactionType.EXPENSE && 
      creditAccountIds.includes(t.accountId) && 
      t.categoryId === category.id
    );

    const billSubItems: any[] = [];
    validT.forEach(t => {
      if (t.billItems && t.billItems.length > 0) {
        t.billItems.forEach(item => {
          if (item.categoryId === category.id) {
            billSubItems.push({
              id: `${t.id}-sub-${item.id}`,
              date: t.date,
              description: `[FATURA] ${item.description}`,
              amount: item.amount,
              isSubItem: true
            });
          }
        });
      }
    });

    let results = [...directExpenses, ...creditPurchases, ...billSubItems];
    if (category.id === cardBillCat?.id) {
      return results.map(r => ({...r, description: r.description || 'Pagamento Fatura'}));
    }

    return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  return (
    <div className="space-y-8">
      {/* Saldos Disponíveis */}
      <div className="space-y-4">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Saldos Disponíveis</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {accountBalances.map((acc, idx) => (
            <div key={idx} className="min-w-[160px] bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{acc.name}</span>
              <p className={`text-lg font-black mt-2 tracking-tight ${acc.balance >= 0 ? 'text-slate-800' : 'text-rose-500'}`}>
                {formatCurrency(acc.balance)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Resumo Financeiro e Inteligência */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="gradient-income p-6 rounded-[32px] text-white shadow-lg relative overflow-hidden">
          <span className="text-white/70 text-[8px] font-black uppercase tracking-widest">Entradas</span>
          <h3 className="text-xl font-black mt-1 tracking-tight">{formatCurrency(stats.totalIncome)}</h3>
        </div>
        <div className="gradient-expense p-6 rounded-[32px] text-white shadow-lg relative overflow-hidden">
          <span className="text-white/70 text-[8px] font-black uppercase tracking-widest">Saídas</span>
          <h3 className="text-xl font-black mt-1 tracking-tight">{formatCurrency(stats.totalExpense)}</h3>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <span className="text-slate-400 text-[8px] font-black uppercase tracking-widest">Média Diária</span>
          <h3 className="text-xl font-black mt-1 text-slate-800 tracking-tight">{formatCurrency(dailyAverage)}</h3>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <span className="text-slate-400 text-[8px] font-black uppercase tracking-widest">Saúde Pacing</span>
          <h3 className={`text-xl font-black mt-1 tracking-tight ${healthStatus.includes('Acima') ? 'text-rose-500' : 'text-emerald-500'}`}>{healthStatus}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pareto de Despesas */}
        <div className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-100 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 text-center">Peso das Categorias (Pareto)</h4>
          <div className="h-72">
            {paretoData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={paretoData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" hide />
                  <YAxis yAxisId="left" hide />
                  <YAxis yAxisId="right" orientation="right" hide domain={[0, 100]} />
                  <Tooltip 
                    formatter={(v: any, name: string) => name === 'value' ? formatCurrency(v) : `${Number(v).toFixed(1)}%`}
                    contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '16px'}}
                    itemStyle={{fontWeight: 900, color: '#1e293b', fontSize: '10px'}}
                  />
                  <Bar yAxisId="left" dataKey="value" fill={COLORS_PARETO} radius={[8, 8, 0, 0]} barSize={35} />
                  <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, fill: '#a855f7' }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 font-black text-[9px] uppercase tracking-widest">Sem dados de gastos</div>
            )}
          </div>
        </div>

        {/* Accordion de Gastos Detalhados com Percentuais */}
        <div className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-100 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 text-center">Explorador de Inteligência</h4>
          <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-hide pr-1">
            {stats.expenseByCategory.length > 0 ? (
              stats.expenseByCategory.map((cat, idx) => {
                const isExpanded = expandedCategoryId === cat.name;
                const details = isExpanded ? getCategoryDetails(cat.name) : [];
                const catPercentage = stats.totalExpense > 0 ? (cat.value / stats.totalExpense) * 100 : 0;
                
                return (
                  <div key={idx} className="border border-slate-50 rounded-[24px] overflow-hidden transition-all duration-300">
                    <button 
                      onClick={() => setExpandedCategoryId(isExpanded ? null : cat.name)}
                      className={`w-full flex items-center justify-between p-5 text-left transition-colors ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isExpanded ? 'bg-indigo-500 scale-125' : 'bg-slate-200'}`}></div>
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest truncate">{cat.name}</span>
                           <span className="text-[8px] font-bold text-slate-400 uppercase">{catPercentage.toFixed(1)}% do total</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black text-slate-900">{formatCurrency(cat.value)}</span>
                        <svg 
                          className={`w-4 h-4 text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-indigo-400' : ''}`} 
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="p-4 pt-0 bg-slate-50 space-y-2 animate-in slide-in-from-top-2 duration-300">
                        {details.length === 0 ? (
                          <div className="py-4 text-center text-[9px] font-bold text-slate-300 uppercase italic tracking-widest">Nenhum lançamento direto</div>
                        ) : (
                          details.map((t: any) => {
                            const itemPercentage = cat.value > 0 ? (t.amount / cat.value) * 100 : 0;
                            return (
                              <div key={t.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100/50 shadow-sm">
                                <div className="flex flex-col min-w-0 pr-2">
                                  <span className="text-[9px] font-black text-slate-800 uppercase truncate">
                                    {cleanDescription(t.description)}
                                  </span>
                                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">
                                    {formatDate(t.date)} • {itemPercentage.toFixed(1)}% do grupo
                                  </span>
                                </div>
                                <span className="text-[10px] font-black text-slate-900 whitespace-nowrap">{formatCurrency(t.amount)}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-slate-300 font-black text-[9px] uppercase tracking-[0.2em] gap-4">
                 <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                 Sem gastos para o período
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
