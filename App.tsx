import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Transaction, Category, Account, TransactionType, DashboardStats, User, BillItem 
} from './types';
import { 
  getCloudStatus, fetchTransactions, fetchCategories, fetchAccounts, insertTransaction, updateTransaction, deleteTransaction, insertCategory, insertAccount, deleteAccount, deleteCategory, updateAccount, updateCategory, supabase, signOut, onAuthStateChange 
} from './services/storage';
import { APP_VERSION } from './constants';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import Settings from './components/Settings';
import Button from './components/Button';
import TransactionList from './components/TransactionList';
import BillDetailModal from './components/BillDetailModal';
import Login from './components/Login';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dash' | 'list' | 'settings'>('dash');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  const [filterPeriod, setFilterPeriod] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingDestinationAccountId, setEditingDestinationAccountId] = useState<string>('');
  const [billToDetail, setBillToDetail] = useState<Transaction | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [cloudMessage, setCloudMessage] = useState<{ok: boolean, msg: string}>({ok: true, msg: 'Conectando...'});
  const [notification, setNotification] = useState<{type: 'success' | 'error', msg: string} | null>(null);

  const showNotify = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg: String(msg), type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const handleLogout = useCallback(async () => {
    try { 
      await signOut(); 
      showNotify("Sessão encerrada por inatividade"); 
    } catch (error) { 
      showNotify("Erro ao sair", "error"); 
    }
  }, [showNotify]);

  useEffect(() => {
    if (!currentUser) return;

    let inactivityTimer: number;

    const resetTimer = () => {
      if (inactivityTimer) window.clearTimeout(inactivityTimer);
      inactivityTimer = window.setTimeout(() => {
        handleLogout();
      }, 300000); 
    };

    const interactionEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    interactionEvents.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      if (inactivityTimer) window.clearTimeout(inactivityTimer);
      interactionEvents.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [currentUser, handleLogout]);

  const runOrphanMigration = useCallback(async (allT: Transaction[], allC: Category[]) => {
    const cardBillCat = allC.find(c => c.name.toLowerCase().trim() === 'cartão de crédito') || 
                        allC.find(c => c.name.toLowerCase().includes('cartão de crédito'));
    const cardBillId = cardBillCat?.id;
    if (!cardBillId) return;

    const creditAccountIds = accounts.filter(a => a.isCreditCard).map(a => a.id);
    const orphans = allT.filter(t => (!t.date || t.date.trim() === '') && creditAccountIds.includes(t.accountId));
    
    if (orphans.length > 0) {
      for (const orphan of orphans) {
        const payment = allT.find(p => 
          p.categoryId === cardBillId && 
          p.cardId === orphan.accountId && 
          p.date.substring(0, 7) === (orphan.date || orphan.createdAt).substring(0, 7)
        );
        if (payment) await updateTransaction(orphan.id, { date: payment.date });
        else await updateTransaction(orphan.id, { date: orphan.createdAt.split('T')[0] });
      }
      const updatedT = await fetchTransactions();
      setTransactions(updatedT);
    }
  }, [accounts]);

  const loadInitialData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const status = await getCloudStatus();
      setCloudMessage({ ok: status.ok, msg: status.message });
      const [dbC, dbA, dbT] = await Promise.all([fetchCategories(), fetchAccounts(), fetchTransactions()]);
      setCategories(dbC);
      setAccounts(dbA);
      setTransactions(dbT);
      await runOrphanMigration(dbT, dbC);
      setLastSync(new Date().toLocaleTimeString('pt-BR'));
    } catch (e: any) {
      showNotify("Erro ao carregar dados", "error");
      setCloudMessage({ ok: false, msg: 'Erro Conexão' });
    } finally {
      setIsSyncing(false);
    }
  }, [runOrphanMigration, showNotify]);

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((session, event) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovering(true);
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.email?.split('@')[0].toUpperCase() || 'USUÁRIO'
        });
      } else {
        setCurrentUser(null);
        setIsRecovering(false);
      }
      setIsAuthChecking(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser && !isRecovering) loadInitialData();
  }, [currentUser, isRecovering, loadInitialData]);

  const handleManualLogout = async () => {
    try { await signOut(); showNotify("Até logo!"); } catch (error) { showNotify("Erro ao sair", "error"); }
  };

  const handleSaveTransaction = async (t: Omit<Transaction, 'id' | 'createdBy' | 'createdAt'> & { destinationAccountId?: string }) => {
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, {
          ...t,
          description: t.cardId ? `[CARD:${t.cardId}] ${t.description}` : (t.destinationAccountId ? `[TRANSFERÊNCIA] ${t.description}` : t.description)
        });
        await loadInitialData();
        setEditingTransaction(null);
        setEditingDestinationAccountId('');
        setShowForm(false);
        showNotify("Lançamento atualizado!");
        return;
      }
      
      const payload = { ...t, createdBy: currentUser.name };
      await insertTransaction(payload);
      await loadInitialData();
      setShowForm(false);
      showNotify("Lançamento registrado!");
    } catch (e: any) {
      showNotify(e.message || "Erro ao salvar", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteTransaction = useCallback(async (id: string) => {
    setIsSyncing(true);
    try {
      await deleteTransaction(id);
      await loadInitialData();
      showNotify("Lançamento excluído com sucesso!", "success");
    } catch (e: any) {
      showNotify("Erro ao excluir lançamento.", "error");
    } finally {
      setIsSyncing(false);
    }
  }, [loadInitialData, showNotify]);

  const handlePostponePurchase = useCallback(async (purchase: Transaction) => {
    console.log('--- LOCKDOWN DE INTEGRIDADE: ADIANDO PARCELA ---', purchase.id);
    if (!currentUser) return;
    setIsSyncing(true);
    try {
      const d = new Date(purchase.date + 'T12:00:00');
      d.setMonth(d.getMonth() + 1);
      const formattedDate = d.toISOString().split('T')[0];
      const { error } = await supabase
        .from('transacoes')
        .update({ date: formattedDate }) 
        .eq('id', purchase.id);
      if (error) throw new Error(`Erro Supabase: ${error.message}`);
      if (purchase.installmentGroupId) {
        const { data: related, error: fetchErr } = await supabase
          .from('transacoes')
          .select('id, date, amount, description')
          .eq('installment_group_id', purchase.installmentGroupId)
          .gt('installment_number', purchase.installmentNumber || 0);
        if (!fetchErr && related && related.length > 0) {
          await Promise.all(related.map(item => {
            const rd = new Date(item.date + 'T12:00:00');
            rd.setMonth(rd.getMonth() + 1);
            return supabase.from('transacoes')
              .update({ date: rd.toISOString().split('T')[0] })
              .eq('id', item.id);
          }));
        }
      }
      showNotify("Lançamento e parcelas postergados com sucesso!", "success");
      await loadInitialData();
    } catch (err: any) {
      console.error('ERRO CRÍTICO NO ADIAMENTO:', err);
      showNotify(`Falha no adiamento: ${err.message}`, "error");
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser, loadInitialData, showNotify]);

  const handleSaveBillDetail = async (cardId: string, manualItems: BillItem[], updatedPurchases: Transaction[]) => {
    if (!billToDetail || !currentUser) return;
    setIsSyncing(true);
    try {
      const syncDate = billToDetail.date;
      await supabase.from('transacoes').update({ bill_items: manualItems }).eq('id', billToDetail.id);
      await Promise.all(updatedPurchases.map(p => {
        return updateTransaction(p.id, { 
          description: p.description, 
          date: syncDate 
        });
      }));
      await loadInitialData();
      setBillToDetail(null);
      showNotify("Fatura e itens sincronizados!");
    } catch (e: any) { 
      showNotify("Erro ao sincronizar", "error"); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const handleAddCategory = async (name: string, type: TransactionType) => {
    try {
      await insertCategory({ name, type, isActive: true });
      await loadInitialData();
      showNotify("Grupo adicionado com sucesso!");
    } catch (e: any) { showNotify("Erro ao adicionar grupo", "error"); }
  };

  const handleAddAccount = async (name: string, isCreditCard: boolean, initialBalance: number, closingDay?: number, initialBalanceDate?: string) => {
    try {
      await insertAccount({ name, isCreditCard, initialBalance, closingDay, initialBalanceDate, isActive: true });
      await loadInitialData();
      showNotify("Instituição adicionada!");
    } catch (e: any) { showNotify("Erro ao adicionar instituição", "error"); }
  };

  const handleUpdateAccount = async (id: string, updates: Partial<Account>) => {
    try {
      await updateAccount(id, updates);
      await loadInitialData();
      showNotify("Alterações salvas com sucesso!");
    } catch (e: any) { showNotify("Erro ao salvar alterações", "error"); }
  };

  const handleToggleCategory = async (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    try {
      await updateCategory(id, { isActive: !cat.isActive });
      await loadInitialData();
    } catch (e: any) { showNotify("Erro ao atualizar status", "error"); }
  };

  const handleToggleAccount = async (id: string) => {
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    try {
      await updateAccount(id, { isActive: !acc.isActive });
      await loadInitialData();
    } catch (e: any) { showNotify("Erro ao atualizar status", "error"); }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Excluir este grupo permanentemente?")) return;
    try {
      await deleteCategory(id);
      await loadInitialData();
      showNotify("Grupo removido");
    } catch (e: any) { showNotify("Erro ao remover grupo", "error"); }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Excluir esta instituição permanentemente?")) return;
    try {
      await deleteAccount(id);
      await loadInitialData();
      showNotify("Instituição removida");
    } catch (e: any) { showNotify("Erro ao remover instituição", "error"); }
  };

  const handleChangeDefaultAccount = async (accountId: string) => {
    showNotify("Conta padrão atualizada localmente");
  };

  const stats: DashboardStats = useMemo(() => {
    const period = filterPeriod;
    const isShortcut = ['15', '30', '60'].includes(period);
    const cardBillCat = categories.find(c => c.name.toLowerCase().trim() === 'cartão de crédito') || 
                        categories.find(c => c.name.toLowerCase().includes('cartão de crédito'));
    const transferCat = categories.find(c => c.name.toLowerCase().includes('transferências entre contas'));
    const transferCatId = transferCat?.id;
    const cardBillId = cardBillCat?.id;
    const creditAccountIds = accounts.filter(a => a.isCreditCard).map(a => a.id);
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const historicalExpenses = transactions.filter(t => 
      t.type === TransactionType.EXPENSE && 
      t.categoryId !== transferCatId && 
      !creditAccountIds.includes(t.accountId) &&
      t.date.substring(0, 7) < currentMonthStr
    );
    const monthTotals = new Map<string, number>();
    historicalExpenses.forEach(t => {
      const m = t.date.substring(0, 7);
      monthTotals.set(m, (monthTotals.get(m) || 0) + t.amount);
    });
    const avgMonthlyExpense = monthTotals.size > 0 
      ? Array.from(monthTotals.values()).reduce((a, b) => a + b, 0) / monthTotals.size 
      : 0;
    const filterByPeriod = (t: Transaction) => {
      if (!period) return true;
      if (isShortcut) {
        const days = parseInt(period);
        const limit = new Date();
        limit.setDate(limit.getDate() - days);
        return new Date(t.date + 'T12:00:00') >= limit;
      }
      return t.date.startsWith(period);
    };
    const validT = transactions.filter(filterByPeriod);
    const catMap = new Map<string, number>();
    const realOutflows = validT.filter(t => 
      t.type === TransactionType.EXPENSE && 
      !creditAccountIds.includes(t.accountId) &&
      t.categoryId !== transferCatId
    );
    realOutflows.forEach(t => {
      catMap.set(t.categoryId, (catMap.get(t.categoryId) || 0) + t.amount);
      if (t.billItems && t.billItems.length > 0) {
        t.billItems.forEach(item => {
          if (item.categoryId !== transferCatId) {
            catMap.set(item.categoryId, (catMap.get(item.categoryId) || 0) + item.amount);
            if (cardBillId) {
              const current = catMap.get(cardBillId) || 0;
              catMap.set(cardBillId, current - item.amount);
            }
          }
        });
      }
    });
    const creditPurchases = validT.filter(t => 
      t.type === TransactionType.EXPENSE && 
      creditAccountIds.includes(t.accountId) &&
      t.categoryId !== transferCatId
    );
    creditPurchases.forEach(t => {
      catMap.set(t.categoryId, (catMap.get(t.categoryId) || 0) + t.amount);
      if (cardBillId) {
        const current = catMap.get(cardBillId) || 0;
        catMap.set(cardBillId, current - t.amount);
      }
    });
    if (cardBillId) {
      const finalVal = catMap.get(cardBillId) || 0;
      if (finalVal < 0.01) catMap.set(cardBillId, 0);
    }
    const totalIncome = validT.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
    const totalExpense = realOutflows.reduce((s, t) => s + t.amount, 0);
    const expenseByCategory = categories
      .filter(c => c.type === TransactionType.EXPENSE && c.id !== transferCatId)
      .map(c => ({ name: c.name, value: catMap.get(c.id) || 0 }))
      .filter(i => i.value > 0.01)
      .sort((a, b) => b.value - a.value);
    return { 
      totalIncome, 
      totalExpense, 
      balance: totalIncome - totalExpense, 
      incomeByCategory: [], 
      expenseByCategory, 
      dailyTrend: [], 
      previousPeriodIncome: 0, 
      previousPeriodExpense: 0, 
      monthlyHistory: Array.from(monthTotals.entries()).map(([month, val]) => ({ month, income: 0, expense: val })),
      averageMonthlyExpense: avgMonthlyExpense,
    };
  }, [transactions, categories, accounts, filterPeriod]);

  if (isAuthChecking) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black text-[10px] text-slate-400 uppercase tracking-widest animate-pulse">Carregando...</div>;
  if (!currentUser) return <Login onNotify={showNotify} />;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-40 font-['Outfit'] relative">
      {notification && <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-2xl shadow-2xl font-black text-[10px] uppercase text-white ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>{notification.msg}</div>}
      <header className="bg-white/90 backdrop-blur-2xl sticky top-0 z-50 border-b border-slate-100 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-xl shadow-md relative flex items-center justify-center overflow-hidden">
                <img src="https://i.imgur.com/BaBxqwh.jpg" alt="BO FINANCE" style={{ height: '32px', width: 'auto' }} />
              <div 
                title={cloudMessage.msg}
                className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm transition-colors duration-500 ${cloudMessage.ok ? 'bg-emerald-500' : 'bg-rose-500'}`}
              ></div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase leading-none">BO FINANCE</h1>
              <span className={`text-[7px] font-black uppercase tracking-widest mt-0.5 ${cloudMessage.ok ? 'text-emerald-500' : 'text-rose-500'}`}>
                {cloudMessage.msg} • v{APP_VERSION}
              </span>
            </div>
          </div>
          <button onClick={handleManualLogout} className="p-2.5 bg-slate-100 text-slate-400 rounded-xl border border-slate-200">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 pt-6">
        {activeTab === 'dash' && (
          <Dashboard 
            stats={stats} 
            transactions={transactions} 
            categories={categories} 
            accounts={accounts} 
            filterPeriod={filterPeriod}
          />
        )}
        {activeTab === 'list' && (
          <TransactionList 
            transactions={transactions} 
            categories={categories} 
            accounts={accounts} 
            filterPeriod={filterPeriod}
            setFilterPeriod={setFilterPeriod}
            onDetailBill={setBillToDetail} 
            onEditTransaction={(t) => { setEditingTransaction(t); setShowForm(true); }} 
            onDeleteTransaction={handleDeleteTransaction} 
          />
        )}
        {activeTab === 'settings' && (
          <Settings 
            categories={categories} 
            accounts={accounts} 
            transactions={transactions} 
            currentUser={currentUser} 
            currentHint="" 
            onAddCategory={handleAddCategory} 
            onAddAccount={handleAddAccount} 
            onUpdateAccount={handleUpdateAccount} 
            onToggleCategory={handleToggleCategory} 
            onToggleAccount={handleToggleAccount} 
            onDeleteCategory={handleDeleteCategory} 
            onDeleteAccount={handleDeleteAccount} 
            onImportData={()=>{}} 
            onChangePassword={()=>{}} 
            onChangeDefaultAccount={handleChangeDefaultAccount} 
            onLogout={handleManualLogout} 
          />
        )}
      </main>
      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[95%] max-w-md bg-[#0f172a] rounded-[32px] p-4 flex justify-around items-center shadow-2xl z-50 border border-white/5">
        <button onClick={() => setActiveTab('dash')} className={`flex-1 flex flex-col items-center gap-1 ${activeTab === 'dash' ? 'text-blue-400' : 'text-slate-500'}`}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg><span className="text-[8px] font-black uppercase">Dash</span></button>
        <button onClick={() => setActiveTab('list')} className={`flex-1 flex flex-col items-center gap-1 ${activeTab === 'list' ? 'text-blue-400' : 'text-slate-500'}`}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="3.01" y2="6"/></svg><span className="text-[8px] font-black uppercase">Extrato</span></button>
        <button onClick={() => { setEditingTransaction(null); setShowForm(true); }} className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white -mt-14 border-4 border-[#0f172a] shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
        <button onClick={() => setActiveTab('settings')} className={`flex-1 flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-blue-400' : 'text-slate-500'}`}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82"/></svg><span className="text-[8px] font-black uppercase">Ajustes</span></button>
      </nav>
      {showForm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-6">
          <TransactionForm categories={categories} accounts={accounts} currentUser={currentUser} onCancel={() => setShowForm(false)} onSave={handleSaveTransaction} initialData={editingTransaction || undefined} />
        </div>
      )}
      {billToDetail && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6">
          <BillDetailModal transaction={billToDetail} categories={categories} accounts={accounts} allTransactions={transactions} onCancel={() => setBillToDetail(null)} onSave={handleSaveBillDetail} onPostponePurchase={handlePostponePurchase} onDeletePurchase={handleDeleteTransaction} />
        </div>
      )}
    </div>
  );
};

export default App;