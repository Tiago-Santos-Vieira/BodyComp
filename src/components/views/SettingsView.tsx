import React, { useState, useEffect } from 'react';
import { Settings, Key, Bot, Shield, CheckCircle, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { ToastType } from '../../App';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

interface SettingsProps {
  showToast?: (message: string, type?: ToastType) => void;
}

export default function SettingsView({ showToast }: SettingsProps) {
  const [geminiKey, setGeminiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) {
      setGeminiKey(savedKey);
      setIsSaved(true);
    }
  }, []);

  const handleSaveKey = () => {
    if (geminiKey.trim().length < 20) {
      showToast?.('Chave de API parece inválida.', 'error');
      return;
    }
    localStorage.setItem('GEMINI_API_KEY', geminiKey.trim());
    setIsSaved(true);
    showToast?.('Chave API salva com segurança no seu navegador!', 'success');
  };

  const handleClearKey = () => {
    localStorage.removeItem('GEMINI_API_KEY');
    setGeminiKey('');
    setIsSaved(false);
    showToast?.('Chave removida do sistema.', 'info');
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 max-w-4xl"
    >
      <motion.div variants={item} className="flex items-center gap-4 mb-8">
        <div className="bg-primary/10 p-4 rounded-2xl text-primary">
          <Settings size={32} />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface font-headline">BodyComp IA Pro</h1>
          <p className="text-on-surface-variant font-medium mt-1">Gerencie sua chave de Inteligência Artificial e preferências avançadas.</p>
        </div>
      </motion.div>

      <motion.section variants={item} className="bg-surface-container-low rounded-2xl p-6 md:p-10 shadow-sm border border-on-surface-variant/5">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/3 space-y-4">
            <div className="flex items-center gap-2 text-tertiary">
              <Bot size={24} />
              <h2 className="text-xl font-bold font-headline">Inteligência Artificial (BYOK)</h2>
            </div>
            <p className="text-sm text-on-surface-variant">
              O BodyComp utiliza o modelo <strong className="text-on-surface">Google Gemini 1.5 Pro</strong> para gerar insights de dieta e análise clínica de forma automatizada.
            </p>
            <p className="text-sm text-on-surface-variant">
              Como o BodyComp é um software sem mensalidades (Lifetime), você utiliza a sua própria chave gratuita do Google (Bring Your Own Key). O limite gratuito atende até 15 consultas por minuto, ideal para qualquer clínica.
            </p>
          </div>
          
          <div className="w-full md:w-2/3 bg-surface-container-lowest p-6 rounded-2xl border border-on-surface-variant/10">
            <div className="flex items-center gap-2 mb-4 text-on-surface-variant">
              <Key size={18} />
              <h3 className="font-bold uppercase tracking-wider text-xs">Chave de API Gemini (Google AI Studio)</h3>
            </div>
            
            <div className="space-y-4">
              <input 
                type="password" 
                value={geminiKey}
                onChange={(e) => {
                  setGeminiKey(e.target.value);
                  setIsSaved(false);
                }}
                placeholder="Cole sua API Key aqui (AIzaSy...)"
                className="w-full bg-surface-container border border-on-surface-variant/20 rounded-xl px-4 py-4 text-on-surface font-mono focus:ring-2 focus:ring-tertiary focus:border-tertiary outline-none transition-all"
              />
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-on-surface-variant/70 bg-surface-container-low p-2 rounded-lg">
                  <Shield size={14} className="text-primary" />
                  Salva apenas no armazenamento local do seu navegador.
                </div>
                
                <div className="flex items-center gap-2">
                  {isSaved && (
                    <button
                      onClick={handleClearKey}
                      className="px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors border border-red-200 dark:border-red-500/20"
                    >
                      Remover
                    </button>
                  )}
                  <button
                    onClick={handleSaveKey}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all shadow-md active:scale-95 ${
                      isSaved
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-primary hover:bg-primary/90 text-white'
                    }`}
                  >
                    {isSaved ? <CheckCircle size={18} /> : <Save size={18} />}
                    {isSaved ? 'Chave Salva ✓' : 'Salvar Chave'}
                  </button>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-on-surface-variant/10">
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-tertiary text-sm font-bold hover:underline">
                  → Clique aqui para gerar sua chave gratuita no Google AI Studio
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
