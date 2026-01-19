
import React, { useState } from 'react';
import { Category, Account, TransactionType, Transaction, User } from '../types';
import { APP_VERSION } from '../constants';
import Button from './Button';

interface SettingsProps {
  categories: Category[];
  accounts: Account[];
  transactions: Transaction[];
  currentUser: User;
  currentHint: string;
  onAddCategory: (name: string, type: TransactionType) => void;
  onAddAccount: (name: string, isCreditCard: boolean, initialBalance: number, closingDay?: number, initialBalanceDate?: string) => void;
  onUpdateAccount: (id: string, updates: Partial<Account>) => void;
  onToggleCategory: (id: string) => void;
  onToggleAccount: (id: string) => void;
  onDeleteCategory: (id: string) => void;
  onDeleteAccount: (id: string) => void;
  onImportData: (data: any) => void;
  onChangePassword: (newPw: string, newHint: string) => void;
  onChangeDefaultAccount: (accountId: string) => void;
  onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  categories, accounts, transactions, currentUser,
  onAddCategory, onAddAccount, onToggleCategory, onToggleAccount, onDeleteCategory, onDeleteAccount,
  onUpdateAccount, onChangeDefaultAccount, onLogout
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<TransactionType>(TransactionType.EXPENSE);
  
  const [newAccName, setNewAccName] = useState('');
  const [newAccInitialBalance, setNewAccInitialBalance] = useState<string>('0,00');
  const [newAccInitialDate, setNewAccInitialDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newAccIsCard, setNewAccIsCard] = useState(false);
  const [newAccClosingDay, setNewAccClosingDay] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para edição inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editClosingDay, setEditClosingDay] = useState<number>(5);

  const formatAsCurrencyInput = (value: string) => {
    const cleanValue = value.replace(/\D/g, "");
    if (!cleanValue) return "0,00";
    const cents = parseInt(cleanValue, 10);
    return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrencyToNumber = (str: string): number => {
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  };

  const formatCurrencyDisplay = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // --- FUNÇÕES DE EXPORTAÇÃO CSV ---
  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(fieldName => `"${String(row[fieldName] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportTransactions = () => {
    const dataToExport = transactions.map(t => ({
      "Data": t.date,
      "Valor": t.amount.toFixed(2),
      "Descricao": t.description,
      "Tipo": t.type === TransactionType.INCOME ? "RECEITA" : "DESPESA",
      "Grupo": categories.find(c => c.id === t.categoryId)?.name || "N/A",
      "Conta_Cartao": accounts.find(a => a.id === t.accountId)?.name || "N/A",
      "Criado_Por": t.createdBy,
      "Parcela": t.installmentNumber ? `${t.installmentNumber}/${t.totalInstallments}` : "1/1"
    }));
    downloadCSV(dataToExport, `bo_finance_lancamentos_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportCategories = () => {
    const dataToExport = categories.map(c => ({
      "Nome_Grupo": c.name,
      "Tipo": c.type === TransactionType.INCOME ? "RECEITA" : "DESPESA",
      "Status": c.isActive ? "ATIVO" : "INATIVO"
    }));
    downloadCSV(dataToExport, `bo_finance_grupos_${new Date().toISOString().split('T')[0]}.csv`);
  };
  // ---------------------------------

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim() || isSubmitting) return;
    if (newAccIsCard && (newAccClosingDay < 1 || newAccClosingDay > 30)) {
      alert("O dia de fechamento deve ser entre 1 e 30.");
      return;
    }
    setIsSubmitting(true);
    const balance = newAccIsCard ? 0 : parseCurrencyToNumber(newAccInitialBalance);
    const date = newAccIsCard ? undefined : newAccInitialDate;
    onAddAccount(newAccName.trim(), newAccIsCard, balance, newAccIsCard ? newAccClosingDay : undefined, date);
    setNewAccName('');
    setNewAccInitialBalance('0,00');
    setNewAccIsCard(false);
    setIsSubmitting(false);
  };

  const startEditing = (acc: Account) => {
    setEditingId(acc.id);
    setEditBalance((acc.initialBalance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setEditDate(acc.initialBalanceDate || new Date().toISOString().split('T')[0]);
    setEditClosingDay(acc.closingDay || 5);
  };

  const saveEdit = (id: string, isCard: boolean) => {
    if (isCard && (editClosingDay < 1 || editClosingDay > 30)) {
      alert("O dia de fechamento deve ser entre 1 e 30.");
      return;
    }
    const updates: Partial<Account> = { closingDay: isCard ? editClosingDay : undefined };
    if (!isCard) {
      updates.initialBalance = parseCurrencyToNumber(editBalance);
      updates.initialBalanceDate = editDate;
    }
    onUpdateAccount(id, updates);
    setEditingId(null);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCategory(newCatName.trim(), newCatType);
    setNewCatName('');
  };

  const incomeCategories = categories.filter(c => c.type === TransactionType.INCOME);
  const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE);
  const bankAccounts = accounts.filter(a => !a.isCreditCard);
  const creditCards = accounts.filter(a => a.isCreditCard);
  const activeBankAccounts = bankAccounts.filter(a => a.isActive);

  return (
    <div className="space-y-8 pb-40 font-['Outfit']">
      {/* SEÇÃO: PERFIL */}
      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Meu Perfil</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{currentUser.name}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentUser.email}</p>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sair
          </button>
        </div>
      </section>

      {/* SEÇÃO: PREFERÊNCIAS */}
      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Preferências</h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Conta Principal (Padrão)</label>
            <select value={currentUser.defaultAccountId || ''} onChange={(e) => onChangeDefaultAccount(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-slate-700 outline-none">
              <option value="">Nenhuma selecionada</option>
              {activeBankAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* SEÇÃO: CATEGORIAS */}
      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Grupos de Lançamento</h3>
        
        <form onSubmit={handleAddCategory} className="flex gap-2 mb-8 bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <input required type="text" placeholder="Nome do Grupo..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} 
            className="flex-[2] px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none" />
          <select value={newCatType} onChange={(e) => setNewCatType(e.target.value as TransactionType)}
            className="flex-1 px-3 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none">
            <option value={TransactionType.EXPENSE}>Saída</option>
            <option value={TransactionType.INCOME}>Entrada</option>
          </select>
          <Button type="submit" className="px-5 text-[9px] font-black uppercase">Add</Button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-4 ml-1">Receitas</h4>
            <div className="space-y-2">
              {incomeCategories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className={`text-[11px] font-bold uppercase ${cat.isActive ? 'text-slate-700' : 'text-slate-300'}`}>{cat.name}</span>
                  <div className="flex gap-1">
                    <button onClick={() => onToggleCategory(cat.id)} className={`p-2 rounded-lg ${cat.isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-400 bg-slate-100'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button onClick={() => onDeleteCategory(cat.id)} className="p-2 rounded-lg text-rose-500 bg-rose-50"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-4 ml-1">Despesas</h4>
            <div className="space-y-2">
              {expenseCategories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className={`text-[11px] font-bold uppercase ${cat.isActive ? 'text-slate-700' : 'text-slate-300'}`}>{cat.name}</span>
                  <div className="flex gap-1">
                    <button onClick={() => onToggleCategory(cat.id)} className={`p-2 rounded-lg ${cat.isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-400 bg-slate-100'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button onClick={() => onDeleteCategory(cat.id)} className="p-2 rounded-lg text-rose-500 bg-rose-50"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: ADICIONAR CONTA/CARTÃO */}
      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Novo Banco ou Cartão</h3>
        
        <form onSubmit={handleAddAccount} className="space-y-4 bg-slate-50 p-5 rounded-[24px] border border-slate-100">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nome da Instituição</label>
            <input required type="text" placeholder="Ex: Nubank, Itaú..." value={newAccName} onChange={(e) => setNewAccName(e.target.value)} 
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none" />
          </div>

          <div className="flex items-center gap-4 py-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${newAccIsCard ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}>
                {newAccIsCard && <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                <input type="checkbox" className="hidden" checked={newAccIsCard} onChange={(e) => setNewAccIsCard(e.target.checked)} />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">É um Cartão de Crédito?</span>
            </label>
          </div>

          {newAccIsCard ? (
            <div className="space-y-1.5 animate-in slide-in-from-top duration-300">
              <label className="text-[9px] font-black text-blue-400 uppercase ml-1">Dia de Fechamento da Fatura (01 a 30)</label>
              <input type="number" min="1" max="30" value={newAccClosingDay} onChange={(e) => setNewAccClosingDay(Number(e.target.value))}
                className="w-full px-4 py-3 bg-blue-50/30 border border-blue-100 rounded-xl text-sm font-bold text-blue-700 outline-none" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Saldo Inicial</label>
                <input type="text" inputMode="numeric" value={newAccInitialBalance} onChange={(e) => setNewAccInitialBalance(formatAsCurrencyInput(e.target.value))} 
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Data do Saldo</label>
                <input type="date" value={newAccInitialDate} onChange={(e) => setNewAccInitialDate(e.target.value)} 
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none" />
              </div>
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} fullWidth className="py-4 text-[10px] font-black uppercase tracking-widest">Salvar Instituição</Button>
        </form>
      </section>

      {/* LISTAGEM: CONTAS CORRENTES */}
      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-6">Contas Correntes</h3>
        <div className="space-y-3">
          {bankAccounts.length === 0 ? (
            <p className="text-center py-4 text-[10px] font-bold text-slate-300 uppercase">Nenhuma conta cadastrada</p>
          ) : bankAccounts.map(acc => (
            <div key={acc.id} className={`p-4 bg-slate-50 rounded-2xl border transition-all ${editingId === acc.id ? 'border-blue-400 ring-2 ring-blue-50' : 'border-slate-100'} flex flex-col gap-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${acc.isActive ? 'bg-emerald-400' : 'bg-slate-300'}`}></div>
                  <p className={`text-[12px] font-black uppercase ${acc.isActive ? 'text-slate-800' : 'text-slate-400'}`}>{acc.name}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEditing(acc)} className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={() => onToggleAccount(acc.id)} className={`p-2 rounded-lg ${acc.isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-400 bg-slate-100'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                  <button onClick={() => onDeleteAccount(acc.id)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>

              {editingId === acc.id ? (
                <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase">Novo Saldo</label>
                    <input type="text" value={editBalance} onChange={(e) => setEditBalance(formatAsCurrencyInput(e.target.value))} 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase">Nova Data</label>
                    <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none" />
                  </div>
                  <button onClick={() => saveEdit(acc.id, false)} className="col-span-2 py-2 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest mt-1">Salvar Alterações</button>
                </div>
              ) : (
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                  Inicial: {formatCurrencyDisplay(acc.initialBalance || 0)} em {acc.initialBalanceDate ? new Date(acc.initialBalanceDate).toLocaleDateString('pt-BR') : '---'}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* LISTAGEM: CARTÕES DE CRÉDITO */}
      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-6">Cartões de Crédito</h3>
        <div className="space-y-3">
          {creditCards.length === 0 ? (
            <p className="text-center py-4 text-[10px] font-bold text-slate-300 uppercase">Nenhum cartão cadastrado</p>
          ) : creditCards.map(acc => (
            <div key={acc.id} className={`p-4 bg-slate-50 rounded-2xl border transition-all ${editingId === acc.id ? 'border-indigo-400 ring-2 ring-indigo-50' : 'border-slate-100'} flex flex-col gap-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${acc.isActive ? 'bg-indigo-400' : 'bg-slate-300'}`}></div>
                  <p className={`text-[12px] font-black uppercase ${acc.isActive ? 'text-slate-800' : 'text-slate-400'}`}>{acc.name}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEditing(acc)} className="p-2 text-indigo-400 hover:bg-indigo-50 rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={() => onToggleAccount(acc.id)} className={`p-2 rounded-lg ${acc.isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-400 bg-slate-100'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                  <button onClick={() => onDeleteAccount(acc.id)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>

              {editingId === acc.id ? (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="space-y-1 mb-2">
                    <label className="text-[8px] font-black text-slate-400 uppercase">Novo Dia de Fechamento (01 a 30)</label>
                    <input type="number" min="1" max="30" value={editClosingDay} onChange={(e) => setEditClosingDay(Number(e.target.value))} 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none" />
                  </div>
                  <button onClick={() => saveEdit(acc.id, true)} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">Salvar Cartão</button>
                </div>
              ) : (
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                  Fechamento dia {acc.closingDay && acc.closingDay < 10 ? `0${acc.closingDay}` : acc.closingDay}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* SEÇÃO: BACKUP E EXPORTAÇÃO (NOVA) */}
      <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.2em] mb-6">Backup e Exportação</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Exporte seus dados em formato CSV para planilhas.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button variant="secondary" onClick={handleExportTransactions} className="py-4 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Exportar Lançamentos
          </Button>
          <Button variant="secondary" onClick={handleExportCategories} className="py-4 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Exportar Grupos
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <div className="text-center pt-10">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">BO Finance v{APP_VERSION}</p>
        <button onClick={onLogout} className="mt-4 px-6 py-2 text-[9px] font-black text-rose-400 border border-rose-100 rounded-full uppercase tracking-widest hover:bg-rose-50 transition-colors">Sair da Conta</button>
      </div>
    </div>
  );
};

export default Settings;
