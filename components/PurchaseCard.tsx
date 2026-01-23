import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';

interface PurchaseCardProps {
  purchase: Transaction;
  onPostponePurchase?: (purchase: Transaction) => void;
  onDeletePurchase?: (id: string) => void;
  onDescriptionChange: (val: string) => void;
  onAmountChange: (val: string) => void;
}

const PurchaseCard: React.FC<PurchaseCardProps> = ({ 
  purchase, 
  onPostponePurchase,
  onDeletePurchase,
  onDescriptionChange,
  onAmountChange
}) => {
  const [isConfirmingPostpone, setIsConfirmingPostpone] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Auto-reset das confirmações após 4 segundos
  useEffect(() => {
    let timer: number;
    if (isConfirmingPostpone || isConfirmingDelete) {
      timer = window.setTimeout(() => {
        setIsConfirmingPostpone(false);
        setIsConfirmingDelete(false);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [isConfirmingPostpone, isConfirmingDelete]);
  
  const formatValueForInput = (val: number) => {
    if (isNaN(val)) return "0,00";
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    const formatted = absVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return isNeg ? `-${formatted}` : formatted;
  };

  const handlePostponeAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isConfirmingPostpone) {
      setIsConfirmingPostpone(true);
      setIsConfirmingDelete(false);
    } else {
      if (onPostponePurchase) {
        onPostponePurchase(purchase);
      }
      setIsConfirmingPostpone(false);
    }
  };

  const handleDeleteAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      setIsConfirmingPostpone(false);
    } else {
      if (onDeletePurchase) {
        onDeletePurchase(purchase.id);
      }
      setIsConfirmingDelete(false);
    }
  };

  return (
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3 relative group pointer-events-auto">
      {/* Botões de Ação - Topo Direito */}
      <div className="absolute -top-3 -right-3 z-[110] flex items-center gap-1">
        
        {/* Botão EXCLUIR (V) */}
        <button 
          type="button" 
          onClick={handleDeleteAction}
          style={{ touchAction: 'manipulation' }}
          className={`h-10 flex items-center justify-center rounded-xl shadow-lg transition-all duration-300 border-2 border-white select-none ${
            isConfirmingDelete 
            ? 'bg-rose-600 text-white w-12 scale-110' 
            : 'bg-white text-rose-500 w-10 active:scale-95'
          }`}
        >
          {isConfirmingDelete ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          )}
        </button>

        {/* Botão ADIAR */}
        <button 
          type="button" 
          onClick={handlePostponeAction}
          style={{ touchAction: 'manipulation' }}
          className={`h-12 flex items-center gap-2 px-4 rounded-2xl shadow-xl transition-all duration-300 border-2 border-white select-none ${
            isConfirmingPostpone 
            ? 'bg-orange-500 text-white min-w-[140px] scale-105 animate-pulse' 
            : 'bg-indigo-600 text-white w-12 active:scale-95'
          }`}
        >
          {isConfirmingPostpone ? (
            <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap mx-auto">Confirmar?</span>
          ) : (
            <svg className="mx-auto" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
              <polyline points="13 17 18 12 13 7"/>
              <polyline points="6 17 11 12 6 7"/>
            </svg>
          )}
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 sm:mt-0">
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase ml-1">
            Descrição {purchase.installmentNumber ? `(Parc ${purchase.installmentNumber}/${purchase.totalInstallments})` : ''}
          </label>
          <input 
            value={purchase.description} 
            onChange={e => onDescriptionChange(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[8px] font-black text-emerald-500 uppercase ml-1">Valor R$</label>
          <input 
            type="text"
            value={formatValueForInput(purchase.amount)} 
            onChange={e => onAmountChange(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black outline-none text-emerald-600"
          />
        </div>
      </div>
    </div>
  );
};

export default PurchaseCard;