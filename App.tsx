
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Transaction, Category, Account, TransactionType, DashboardStats, User, BillItem 
} from './types';
import { 
  INITIAL_INCOME_CATEGORIES, INITIAL_EXPENSE_CATEGORIES, INITIAL_ACCOUNTS, APP_VERSION 
} from './constants';
import { 
  getCloudStatus, fetchTransactions, fetchCategories, fetchAccounts, insertTransaction, insertCategory, insertAccount, deleteAccount, deleteCategory, updateAccount, updateCategory, supabase 
} from './services/storage';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import Settings from './components/Settings';
import Button from './components/Button';
import TransactionList from './components/TransactionList';
import CreditCardBillForm from './components/CreditCardBillForm';
import BillDetailModal from './components/BillDetailModal';

const PRESET_USERS: User[] = [
  { id: 'u-tico', name: 'Tico', email: 'tico_onishi@hotmail.com', defaultAccountId: 'acc-1' },
  { id: 'u-sandra', name: 'Sandra', email: 'clinicasandrabarata@hotmail.com', defaultAccountId: 'acc-3' }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dash' | 'list' | 'settings'>('dash');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginInput, setLoginInput] = useState(''); 
  const [loginPassword, setLoginPassword] = useState('');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  const [showForm, setShowForm] = useState(false);
  const [billToDetail, setBillToDetail] = useState<Transaction | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [cloudMessage, setCloudMessage] = useState<{ok: boolean, msg: string}>({ok: true, msg: 'Conectando...'});
  const [notification, setNotification] = useState<{type: 'success' | 'error', msg: string} | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{show: boolean, title: string, onConfirm: () => void} | null>(null);

  const showNotify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg: String(msg), type });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadInitialData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const status = await getCloudStatus();
      setCloudMessage({ ok: status.ok, msg: status.message });
      const [dbC, dbA, dbT] = await Promise.all([fetchCategories(), fetchAccounts(), fetchTransactions()]);
      setTransactions(dbT);
      setCategories(dbC);
      setAccounts(dbA);
      setLastSync(new Date().toLocaleTimeString('pt-BR'));
    } catch (e: any) {
      showNotify("Erro ao carregar dados", "error");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) loadInitialData();
  }, [currentUser, loadInitialData]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const input = loginInput.toLowerCase().trim();
    const foundUser = PRESET_USERS.find(u => u.name.toLowerCase() === input || u.email.toLowerCase() === input);
    if (foundUser && loginPassword === '123') {
      setCurrentUser(foundUser);
    } else {
      showNotify("Credenciais inválidas", "error");
    }
  };

  const calculateEffectiveDate = (purchaseDateStr: string, accountId: string): string => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc || !acc.isCreditCard || !acc.closingDay) return purchaseDateStr;

    const purchaseDate = new Date(purchaseDateStr + 'T12:00:00');
    const day = purchaseDate.getDate();

    if (day >= acc.closingDay) {
      purchaseDate.setMonth(purchaseDate.getMonth() + 1);
    }
    
    purchaseDate.setDate(1); 
    return purchaseDate.toISOString().split('T')[0];
  };

  const handleSaveTransaction = async (t: Omit<Transaction, 'id' | 'createdBy' | 'createdAt'>) => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      const totalInstallments = t.totalInstallments || 1;
      const groupId = totalInstallments > 1 ? crypto.randomUUID() : undefined;
      const initialEffectiveDate = calculateEffectiveDate(t.date, t.accountId);
      
      const newTransactions: Transaction[] = [];

      for (let i = 1; i <= totalInstallments; i++) {
        const installmentDate = new Date(initialEffectiveDate + 'T12:00:00');
        installmentDate.setMonth(installmentDate.getMonth() + (i - 1));
        
        // Se for pagamento de cartão, embutimos o ID do cartão na descrição para o modal ler depois
        // Isso resolve o problema de não ter a coluna 'card_id' no Supabase
        let finalDescription = t.description;
        if (t.cardId) {
          finalDescription = `[CARD:${t.cardId}] ${t.description}`;
        }

        const installmentPayload = {
          ...t,
          date: installmentDate.toISOString().split('T')[0],
          description: totalInstallments > 1 ? `${finalDescription} (${i}/${totalInstallments})` : finalDescription,
          installmentNumber: i,
          totalInstallments,
          installmentGroupId: groupId,
          createdBy: currentUser.name
        };

        const savedT = await insertTransaction(installmentPayload);
        newTransactions.push(savedT);
      }

      setTransactions(prev => [...newTransactions, ...prev]);
      setShowForm(false);
      showNotify(totalInstallments > 1 ? `${totalInstallments} parcelas geradas!` : "Salvo!");
    } catch (e: any) {
      showNotify(e.message || "Erro ao salvar", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveBillDetail = async (cardId: string, items: BillItem[]) => {
    if (!billToDetail || !currentUser) return;
    setIsSyncing(true);
    try {
      // Atualizamos apenas a coluna bill_items, que já existe no seu banco.
      const { error } = await supabase
        .from('transacoes')
        .update({ 
          bill_items: items 
        })
        .eq('id', billToDetail.id);

      if (error) throw error;

      const updatedTransactions = transactions.map(t => 
        t.id === billToDetail.id ? { ...t, billItems: items } : t
      );
      setTransactions(updatedTransactions);
      setBillToDetail(null);
      showNotify("Fatura detalhada com sucesso!");
    } catch (e: any) {
      showNotify("Erro ao salvar detalhes", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveAccount = async (n: string, c: boolean, b: number, closing?: number, initialDate?: string) => {
    setIsSyncing(true);
    try {
      const newAcc = await insertAccount({ name: n, isActive: true, isCreditCard: c, initialBalance: b, initialBalanceDate: initialDate || '2026-01-01', closingDay: closing });
      setAccounts(prev => [...prev, newAcc]);
      showNotify("Instituição criada!");
    } catch (e: any) { showNotify(e.message || "Erro", "error"); }
    finally { setIsSyncing(false); }
  };

  const stats: DashboardStats = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
    const incomeByCategory = categories.filter(c => c.type === TransactionType.INCOME).map(c => ({ name: c.name, value: transactions.filter(t => t.categoryId === c.id).reduce((s, t) => s + t.amount, 0) })).filter(i => i.value > 0);
    const expenseByCategory = categories.filter(c => c.type === TransactionType.EXPENSE).map(c => ({ name: c.name, value: transactions.filter(t => t.categoryId === c.id).reduce((s, t) => s + t.amount, 0) })).filter(i => i.value > 0);
    return { totalIncome, totalExpense, balance: totalIncome - totalExpense, incomeByCategory, expenseByCategory, dailyTrend: [], previousPeriodIncome: 0, previousPeriodExpense: 0, monthlyHistory: [] };
  }, [transactions, categories]);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 font-['Outfit']">
        <div className="w-full max-sm:max-w-xs">
          <div className="mb-10 text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-[24px] mx-auto flex items-center justify-center shadow-xl shadow-blue-200 mb-6">
               <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="m17 5-5-3-5 3"/><path d="m17 19-5 3-5-3"/><path d="M2 12h20"/></svg>
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">BO Finance</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Gestão Familiar</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white p-10 rounded-[40px] shadow-2xl space-y-4 border border-slate-100">
            <input required className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 text-center" placeholder="Usuário" value={loginInput} onChange={e => setLoginInput(e.target.value)} />
            <input required className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 text-center" type="password" placeholder="Sua Chave" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
            <Button fullWidth type="submit" className="py-5 font-black uppercase tracking-widest text-[10px]">Acessar</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-40 font-['Outfit'] relative">
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm px-6 py-4 rounded-2xl shadow-2xl font-black text-[10px] uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-4 ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          {notification.msg}
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-xs shadow-2xl text-center font-['Outfit']">
            <p className="text-sm font-black text-slate-800 uppercase mb-6">{confirmDialog.title}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDialog(null)} className="flex-1 py-4 bg-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-500">Não</button>
              <button onClick={confirmDialog.onConfirm} className="flex-1 py-4 bg-rose-500 rounded-2xl text-[10px] font-black uppercase text-white">Sim</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white/90 backdrop-blur-2xl sticky top-0 z-50 border-b border-slate-100 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">BO Finance</h1>
            <div className="flex items-center gap-1.5">
               <div className={`w-1.5 h-1.5 rounded-full ${cloudMessage.ok ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
               <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">{cloudMessage.msg} {lastSync && `• ${lastSync}`}</span>
            </div>
          </div>
          <button onClick={() => setCurrentUser(null)} className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-black text-slate-700 uppercase">{currentUser.name}</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-6">
        {activeTab === 'dash' && <Dashboard stats={stats} transactions={transactions} categories={categories} onCategoryClick={() => setActiveTab('settings')} />}
        {activeTab === 'list' && <TransactionList transactions={transactions} categories={categories} accounts={accounts} onDetailBill={(t) => setBillToDetail(t)} />}
        {activeTab === 'settings' && (
          <Settings 
            categories={categories} accounts={accounts} transactions={transactions} currentUser={currentUser} currentHint="" 
            onAddCategory={async (n, t) => { 
              try {
                const nc = await insertCategory({ name: n, type: t, isActive: true }); 
                setCategories(p => [...p, nc]); 
                showNotify("Grupo criado!"); 
              } catch(e:any) { showNotify(e.message, "error"); }
            }}
            onAddAccount={handleSaveAccount}
            onUpdateAccount={async (id, up) => {
              try {
                const res = await updateAccount(id, up);
                setAccounts(p => p.map(a => a.id === id ? res : a));
                showNotify("Salvo!");
              } catch (e: any) { showNotify(e.message, "error"); }
            }}
            onToggleCategory={async (id) => {
               const cat = categories.find(c => c.id === id);
               if(cat) {
                 const res = await updateCategory(id, { isActive: !cat.isActive });
                 setCategories(p => p.map(c => c.id === id ? res : c));
               }
            }} 
            onToggleAccount={async (id) => {
               const acc = accounts.find(a => a.id === id);
               if(acc) {
                 const res = await updateAccount(id, { isActive: !acc.isActive });
                 setAccounts(p => p.map(a => a.id === id ? res : a));
               }
            }} 
            onDeleteCategory={async (id) => {
               setConfirmDialog({ title: "Excluir grupo?", onConfirm: async () => {
                 try { await deleteCategory(id); setCategories(p => p.filter(c => c.id !== id)); showNotify("Excluído"); }
                 catch(e:any) { showNotify(e.message, "error"); }
                 setConfirmDialog(null);
               }, show: true });
            }} 
            onDeleteAccount={async (id) => {
               setConfirmDialog({ title: "Excluir instituição?", onConfirm: async () => {
                 try { await deleteAccount(id); setAccounts(p => p.filter(a => a.id !== id)); showNotify("Excluída"); }
                 catch(e:any) { showNotify(e.message, "error"); }
                 setConfirmDialog(null);
               }, show: true });
            }} 
            onImportData={() => {}} 
            onChangePassword={() => {}} 
            onChangeDefaultAccount={(id) => { if(currentUser) setCurrentUser({...currentUser, defaultAccountId: id}) }} 
            onLogout={() => setCurrentUser(null)}
          />
        )}
      </main>

      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[95%] max-w-md bg-[#0f172a] rounded-[32px] p-4 flex justify-around items-center shadow-2xl z-50 border border-white/5">
        <button onClick={() => setActiveTab('dash')} className={`flex-1 flex flex-col items-center gap-1 transition-all ${activeTab === 'dash' ? 'text-blue-400' : 'text-slate-500'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
          <span className="text-[8px] font-black uppercase tracking-widest">Dash</span>
        </button>
        <button onClick={() => setActiveTab('list')} className={`flex-1 flex flex-col items-center gap-1 transition-all ${activeTab === 'list' ? 'text-blue-400' : 'text-slate-500'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          <span className="text-[8px] font-black uppercase tracking-widest">Extrato</span>
        </button>
        <button onClick={() => setShowForm(true)} className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 -mt-14 border-4 border-[#0f172a] hover:scale-105 active:scale-95 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex-1 flex flex-col items-center gap-1 transition-all ${activeTab === 'settings' ? 'text-blue-400' : 'text-slate-500'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2 2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span className="text-[8px] font-black uppercase tracking-widest">Ajustes</span>
        </button>
      </nav>

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-6">
          <div className="w-full max-w-xl animate-in slide-in-from-bottom-10 duration-500">
            <TransactionForm categories={categories} accounts={accounts} currentUser={currentUser} onCancel={() => setShowForm(false)} onSave={handleSaveTransaction} />
          </div>
        </div>
      )}

      {billToDetail && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6">
          <BillDetailModal 
            transaction={billToDetail} 
            categories={categories} 
            accounts={accounts} 
            allTransactions={transactions}
            onCancel={() => setBillToDetail(null)} 
            onSave={handleSaveBillDetail} 
          />
        </div>
      )}
    </div>
  );
};

export default App;
