import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { ToastType } from '../../App';
import { supabase } from '../../lib/supabase';

interface Props {
  onLogin: () => void;
  showToast: (message: string, type?: ToastType) => void;
}

export default function LoginView({ onLogin, showToast }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      showToast('Por favor, preencha o e-mail e a senha.', 'error');
      return;
    }

    setIsSubmitting(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    setIsSubmitting(false);

    if (error) {
      showToast('Credenciais inválidas. Verifique seu acesso.', 'error');
    } else {
      showToast('Acesso liberado! Bem-vindo de volta.', 'success');
      onLogin();
    }
  };

  return (
    <div className="w-full flex items-center justify-center relative overflow-hidden h-full">
        {/* Background Gradients Blur (Aesthetic Premium Effect) */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] -z-10 mix-blend-multiply opacity-70 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-secondary-container/30 rounded-full blur-[80px] -z-10 mix-blend-multiply opacity-60"></div>
        
        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-md"
        >
            <div className="bg-surface-container-lowest/70 backdrop-blur-xl border border-on-surface-variant/10 shadow-2xl rounded-3xl overflow-hidden relative">
                
                {/* Decorative Head */}
                <div className="h-2 w-full primary-gradient"></div>
                
                <div className="p-8 md:p-10">
                    <div className="flex justify-center mb-8">
                        <div className="bg-primary/10 p-4 rounded-2xl">
                            <Activity size={36} className="text-primary" />
                        </div>
                    </div>
                    
                    <h2 className="text-3xl font-extrabold text-center text-on-surface font-headline mb-2">BodyComp</h2>
                    <p className="text-center text-on-surface-variant text-sm mb-10 font-medium">Faça login para acessar o painel</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-on-surface-variant ml-2">E-mail de Acesso</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors">
                                    <User size={20} />
                                </div>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Digite seu e-mail" 
                                    className="w-full bg-surface-container border border-on-surface-variant/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-on-surface font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-on-surface-variant ml-2">Senha</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors">
                                    <Lock size={20} />
                                </div>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Sua senha segura" 
                                    className="w-full bg-surface-container border border-on-surface-variant/10 rounded-2xl py-4 pl-12 pr-12 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-on-surface font-medium"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-primary transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full mt-8 py-4 px-6 primary-gradient text-white rounded-full font-bold shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all outline-none flex items-center justify-center h-14 disabled:opacity-70 disabled:hover:scale-100"
                        >
                            {isSubmitting ? (
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                    className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                                />
                            ) : (
                                "Entrar"
                            )}
                        </button>
                    </form>
                </div>
            </div>
            <p className="text-center mt-6 text-sm text-on-surface-variant/70 font-medium">Desenvolvido por <a href="https://instagram.com/tiagovieira.films" target="_blank" rel="noopener noreferrer" className="font-bold hover:text-primary transition-colors">@tiagovieira.films</a></p>
        </motion.div>
    </div>
  );
}
