
import React, { useState, useEffect } from 'react';
import { signIn, resetPasswordForEmail, updatePassword } from '../services/storage';
import Button from './Button';

interface LoginProps {
  onNotify: (msg: string, type: 'success' | 'error') => void;
  initialMode?: 'login' | 'reset';
}

const Login: React.FC<LoginProps> = ({ onNotify, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      onNotify("Bem-vindo de volta!", "success");
    } catch (error: any) {
      onNotify(error.message || "Erro ao acessar conta", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await resetPasswordForEmail(email);
      onNotify("E-mail de recuperação enviado!", "success");
      setMode('login');
    } catch (error: any) {
      onNotify(error.message || "Erro ao enviar e-mail", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      onNotify("As senhas não conferem", "error");
      return;
    }
    setIsLoading(true);
    try {
      await updatePassword(password);
      onNotify("Senha atualizada com sucesso!", "success");
      setMode('login');
    } catch (error: any) {
      onNotify(error.message || "Erro ao atualizar senha", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 font-['Outfit']">
      <div className="w-full max-sm:max-w-xs animate-in fade-in zoom-in duration-500">
        <div className="mb-10 text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-[24px] mx-auto flex items-center justify-center shadow-xl shadow-blue-200 mb-6">
             <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="m17 5-5-3-5 3"/><path d="m17 19-5 3-5-3"/><path d="M2 12h20"/></svg>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">BO Finance</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">
            {mode === 'login' ? 'Gestão Familiar' : mode === 'forgot' ? 'Recuperação de Acesso' : 'Definir Nova Senha'}
          </p>
        </div>

        <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100">
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <input 
                required 
                type="email"
                className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 text-center focus:ring-2 focus:ring-blue-500/10 transition-all" 
                placeholder="E-mail" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
              />
              <input 
                required 
                className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 text-center focus:ring-2 focus:ring-blue-500/10 transition-all" 
                type="password" 
                placeholder="Sua Chave" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
              <Button fullWidth type="submit" disabled={isLoading} className="py-5 font-black uppercase tracking-widest text-[10px]">
                {isLoading ? 'Acessando...' : 'Acessar'}
              </Button>
              <button 
                type="button" 
                onClick={() => setMode('forgot')}
                className="w-full text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-500 transition-colors"
              >
                Esqueci minha senha
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest px-4 mb-2">
                Informe seu e-mail para receber o link de recuperação.
              </p>
              <input 
                required 
                type="email"
                className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 text-center focus:ring-2 focus:ring-blue-500/10 transition-all" 
                placeholder="E-mail cadastrado" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
              />
              <Button fullWidth type="submit" disabled={isLoading} className="py-5 font-black uppercase tracking-widest text-[10px]">
                {isLoading ? 'Enviando...' : 'Enviar Link'}
              </Button>
              <button 
                type="button" 
                onClick={() => setMode('login')}
                className="w-full text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                Voltar para Login
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleReset} className="space-y-4">
              <input 
                required 
                className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 text-center focus:ring-2 focus:ring-blue-500/10 transition-all" 
                type="password" 
                placeholder="Nova Senha" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
              <input 
                required 
                className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 text-center focus:ring-2 focus:ring-blue-500/10 transition-all" 
                type="password" 
                placeholder="Confirme a Senha" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
              />
              <Button fullWidth type="submit" disabled={isLoading} className="py-5 font-black uppercase tracking-widest text-[10px]">
                {isLoading ? 'Salvando...' : 'Definir Senha'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
