
import React, { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Transaction, Category, DashboardStats, Account, TransactionType } from '../types';

interface DashboardProps {
  stats: DashboardStats;
  onCategoryClick: (categoryId: string) => void;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
}

const COLORS_INCOME = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#d1fae5'];
const COLORS_EXPENSE = ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#e0e7ff'];

const Dashboard: React.FC<DashboardProps> = ({ stats, transactions, accounts }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Cálculo de saldos individuais por conta
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

  return (
    <div className="space-y-8">
      {/* Seção de Saldos por Conta */}
      <div className="space-y-4">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Saldos Disponíveis</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {accountBalances.map((acc, idx) => (
            <div key={idx} className="min-w-[160px] bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{acc.name}</span>
              <p className={`text-lg font-black mt-2 tracking-tight ${acc.balance >= 0 ? 'text-slate-800' : 'text-rose-500'}`}>
                {formatCurrency(acc.balance)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Resumo Financeiro Geral */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="gradient-income p-10 rounded-[48px] text-white shadow-2xl shadow-emerald-200/40 relative overflow-hidden group">
          <div className="relative z-10">
            <span className="text-white/70 text-[10px] font-black uppercase tracking-[0.3em]">Total de Entradas</span>
            <h3 className="text-4xl font-black mt-3 tracking-tight">{formatCurrency(stats.totalIncome)}</h3>
            <div className="mt-6 inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-md">
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
               <span className="text-[10px] font-black uppercase">Receitas</span>
            </div>
          </div>
        </div>

        <div className="gradient-expense p-10 rounded-[48px] text-white shadow-2xl shadow-indigo-200/40 relative overflow-hidden group">
          <div className="relative z-10">
            <span className="text-white/70 text-[10px] font-black uppercase tracking-[0.3em]">Total de Saídas</span>
            <h3 className="text-4xl font-black mt-3 tracking-tight">{formatCurrency(stats.totalExpense)}</h3>
            <div className="mt-6 inline-flex items-center gap-2 bg-black/10 px-4 py-2 rounded-full backdrop-blur-md">
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
               <span className="text-[10px] font-black uppercase">Gastos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Saldo Líquido */}
      <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Balanço Mensal Líquido</span>
          <h3 className={`text-5xl font-black mt-2 tracking-tighter ${stats.balance >= 0 ? 'text-slate-800' : 'text-rose-500'}`}>
            {formatCurrency(stats.balance)}
          </h3>
        </div>
        <div className={`px-8 py-4 rounded-[24px] text-xs font-black uppercase tracking-widest shadow-inner ${stats.balance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {stats.balance >= 0 ? 'Disponível' : 'Déficit'} {Math.abs((stats.balance / (stats.totalIncome || 1)) * 100).toFixed(0)}%
        </div>
      </div>

      {/* Gráficos de Categorias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 text-center">Grupos de Gastos</h4>
          <div className="h-72">
            {stats.expenseByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.expenseByCategory} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={8} dataKey="value">
                    {stats.expenseByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_EXPENSE[index % COLORS_EXPENSE.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(v: number) => formatCurrency(v)} 
                    contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '16px'}}
                    itemStyle={{fontWeight: 900, color: '#1e293b'}}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 font-black text-[9px] uppercase tracking-widest">Sem dados de gastos</div>
            )}
          </div>
        </div>

        <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 text-center">Fontes de Receita</h4>
          <div className="h-72">
            {stats.incomeByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.incomeByCategory} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={8} dataKey="value">
                    {stats.incomeByCategory.map((_, index) => (
                      <Cell key={`cell-inc-${index}`} fill={COLORS_INCOME[index % COLORS_INCOME.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(v: number) => formatCurrency(v)} 
                    contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '16px'}}
                    itemStyle={{fontWeight: 900, color: '#1e293b'}}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 font-black text-[9px] uppercase tracking-widest">Sem dados de receita</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
