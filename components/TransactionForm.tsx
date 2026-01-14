
import React, { useState, useEffect } from 'react';
import { TransactionType, Category, Account, Transaction, User } from '../types';
import Button from './Button';

interface TransactionFormProps {
  categories: Category[];
  accounts: Account[];
  currentUser: User;
  onSave: (transaction: Omit<Transaction, 'id' | 'createdBy' | 'createdAt'> & { destinationAccountId?: string }) => void;
  onCancel: () => void;
  initialType?: TransactionType;
  initialData?: Transaction; // Adicionado para edição
  initialDestinationAccountId?: string; // Novo: Conta destino original
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  categories, 
  accounts, 
  currentUser,
  onSave, 
  onCancel,
  initialType = TransactionType.EXPENSE,
  initialData,
  initialDestinationAccountId
}) => {
  const isEditing = !!initialData;
  const [type, setType] = useState<TransactionType>(initialData?.type || initialType);
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<string>(
    initialData ? (initialData.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'
  );
  const [description, setDescription] = useState(initialData?.description.replace(/\[CARD:.*?\]\s*/, '').replace(/\[TRANSFERÊNCIA\]\s*/, '') || '');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
  const [accountId, setAccountId] = useState(initialData?.accountId || '');
  const [selectedCardId, setSelectedCardId] = useState(initialData?.cardId || ''); 
  const [destinationAccountId, setDestinationAccountId] = useState(initialDestinationAccountId || ''); 
  const [installments, setInstallments] = useState(initialData?.totalInstallments || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatAsCurrencyInput = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "0,00";
    const cents = parseInt(digits, 10);
    return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrencyToNumber = (str: string): number => {
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  };

  const activeCategories = categories
    .filter(c => c.isActive && c.type === type)
    .sort((a, b) => a.name.localeCompare(b.name));
    
  const availableAccounts = accounts.filter(a => a.isActive && (type === TransactionType.INCOME ? !a.isCreditCard : true));
  const creditCards = accounts.filter(a => a.isCreditCard && a.isActive);
  
  const selectedCategory = categories.find(c => c.id === categoryId);
  const isPayingCreditCard = selectedCategory?.name.toLowerCase().includes('cartão de crédito');
  const isTransfer = selectedCategory?.name.toLowerCase().includes('transferências entre contas');

  useEffect(() => {
    if (currentUser.defaultAccountId && !accountId && !isEditing) {
      setAccountId(currentUser.defaultAccountId);
    }
  }, [currentUser.defaultAccountId, accountId, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const parsedAmount = parseCurrencyToNumber(amount);
    if (parsedAmount <= 0) { alert("Informe um valor válido."); return; }
    if (!categoryId) { alert("Selecione o grupo."); return; }
    if (!accountId) { alert("Selecione a conta."); return; }
    if (isPayingCreditCard && !selectedCardId) { alert("Selecione qual cartão está pagando."); return; }
    if (isTransfer && !destinationAccountId) { alert("Selecione a conta de destino."); return; }

    setIsSubmitting(true);

    onSave({
      date,
      amount: parsedAmount,
      description: description || '',
      categoryId,
      accountId,
      cardId: isPayingCreditCard ? selectedCardId : undefined,
      type,
      totalInstallments: (accountId && accounts.find(a => a.id === accountId)?.isCreditCard) ? installments : 1,
      installmentNumber: initialData?.installmentNumber || 1,
      destinationAccountId: isTransfer ? destinationAccountId : undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto font-['Outfit']">
      <div className="text-center mb-2">
         <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">{isEditing ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
      </div>

      <div className="flex bg-slate-100 p-1.5 rounded-2xl">
        <button type="button" onClick={() => { setType(TransactionType.INCOME); setCategoryId(''); }}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${type === TransactionType.INCOME ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>
          Entrada
        </button>
        <button type="button" onClick={() => { setType(TransactionType.EXPENSE); setCategoryId(''); }}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${type === TransactionType.EXPENSE ? 'bg-white shadow-sm text-rose-600' : 'text-slate-400'}`}>
          Saída
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Valor R$</label>
          <input required type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(formatAsCurrencyInput(e.target.value))} 
            className="w-full px-5 py-5 rounded-2xl bg-slate-50 border border-slate-100 font-black text-3xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Data</label>
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full px-5 py-5 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-slate-700 h-full outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Grupo de Lançamento</label>
          <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-5 py-5 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-slate-700 outline-none">
            <option value="">Selecione...</option>
            {activeCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">
            {isTransfer ? 'Conta de Origem' : (isPayingCreditCard ? 'Conta de Pagamento' : 'Conta / Cartão')}
          </label>
          <select required value={accountId} onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-5 py-5 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-slate-700 outline-none">
            <option value="">Selecione...</option>
            {availableAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} {acc.isCreditCard ? '(CARTÃO)' : ''}</option>)}
          </select>
        </div>
      </div>

      {isTransfer && (
        <div className="p-6 bg-emerald-50/50 rounded-[32px] border border-emerald-100 space-y-3 animate-in slide-in-from-top-2 duration-300">
          <label className="text-[10px] font-black text-emerald-600 uppercase ml-1 tracking-widest flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m18 8 4 4-4 4"/><path d="M2 12h20"/><path d="m6 16-4-4 4-4"/></svg>
            Para qual conta vai o dinheiro?
          </label>
          <select required value={destinationAccountId} onChange={(e) => setDestinationAccountId(e.target.value)}
            className="w-full px-5 py-4 rounded-2xl bg-white border border-emerald-200 font-black text-emerald-700 outline-none focus:ring-4 focus:ring-emerald-500/10">
            <option value="">Selecione a Conta Destino...</option>
            {accounts.filter(a => a.isActive && !a.isCreditCard && a.id !== accountId).map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>
      )}

      {isPayingCreditCard && (
        <div className="p-6 bg-blue-50/50 rounded-[32px] border border-blue-100 space-y-3 animate-in slide-in-from-top-2 duration-300">
          <label className="text-[10px] font-black text-blue-600 uppercase ml-1 tracking-widest flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            Qual cartão está sendo pago?
          </label>
          <select required value={selectedCardId} onChange={(e) => setSelectedCardId(e.target.value)}
            className="w-full px-5 py-4 rounded-2xl bg-white border border-blue-200 font-black text-blue-700 outline-none focus:ring-4 focus:ring-blue-500/10">
            <option value="">Selecione o Cartão...</option>
            {creditCards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Descrição (Opcional)</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Mercado, Amazon..."
            className="w-full px-5 py-5 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-slate-700 outline-none" />
        </div>
        
        {accountId && accounts.find(a => a.id === accountId)?.isCreditCard && (
          <div className="space-y-1.5 animate-in slide-in-from-right duration-300">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Número de Parcelas</label>
            <select value={installments} onChange={(e) => setInstallments(Number(e.target.value))}
              className="w-full px-5 py-5 rounded-2xl bg-blue-50/50 border border-blue-100 font-bold text-blue-700 outline-none">
              {[...Array(24)].map((_, i) => <option key={i+1} value={i+1}>{i+1}x {i > 0 ? 'Parcelado' : 'À Vista'}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-4 pt-4">
        <Button variant="secondary" onClick={onCancel} className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest">Cancelar</Button>
        <Button variant="primary" type="submit" disabled={isSubmitting} className="flex-[2] py-5 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100">
          {isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Registrar Lançamento')}
        </Button>
      </div>
    </form>
  );
};

export default TransactionForm;
