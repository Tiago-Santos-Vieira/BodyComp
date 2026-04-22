import { ArrowLeft, Edit2, Calendar, FileText, Settings, User, X, Camera, Save } from 'lucide-react';
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Patient, ViewType } from '../../types';
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

interface Props {
  activePatient: Patient | null;
  setCurrentView: (view: ViewType | 'patient_detail') => void;
  showToast?: (message: string, type?: ToastType) => void;
}

export default function PatientDetailView({ activePatient, setCurrentView, showToast }: Props) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [patientImage, setPatientImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!activePatient) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh]">
        <User size={64} className="text-on-surface-variant/30 mb-4" />
        <h2 className="text-2xl font-bold font-headline mb-2 text-on-surface">Nenhum Paciente Selecionado</h2>
        <p className="text-on-surface-variant mb-6">Por favor, selecione um paciente na lista para ver seus detalhes.</p>
        <button 
          onClick={() => setCurrentView('patients')}
          className="px-6 py-3 bg-primary text-white rounded-full font-bold hover:opacity-90 transition-opacity"
        >
          Voltar para Lista
        </button>
      </div>
    );
  }

  const patientAvatar = patientImage || activePatient.avatar || `https://picsum.photos/seed/${activePatient.name}/200`;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPatientImage(URL.createObjectURL(file));
      showToast?.('Foto do paciente atualizada temporariamente!', 'success');
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditModalOpen(false);
    showToast?.('Dados do paciente atualizados com sucesso!', 'success');
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-5xl mx-auto space-y-8 pb-12 relative"
    >
      <motion.div variants={item} className="flex items-center gap-4 mb-6 md:mb-8">
        <button 
          onClick={() => setCurrentView('patients')}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high transition-colors shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface font-headline tracking-tight">Detalhes do Paciente</h1>
      </motion.div>

      <motion.div variants={item} className="bg-surface-container-low rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8 shadow-sm">
        <div className="relative group">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-surface shadow-md flex-shrink-0">
            <img src={patientAvatar} alt={activePatient.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 md:bottom-2 md:right-2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer opacity-0 group-hover:opacity-100"
          >
            <Camera size={14} />
          </button>
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-black font-headline text-on-surface mb-2">{activePatient.name}</h2>
          <div className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4 text-sm md:text-base text-on-surface-variant">
            <span className="font-medium">ID: #{activePatient.id || 'N/A'}</span>
            <span className="hidden md:inline">•</span>
            <span className="font-medium">Objetivo: {activePatient.objective}</span>
            <span className="hidden md:inline">•</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activePatient.status === 'Ativo' || activePatient.status === 'Em progresso' 
                ? 'bg-primary-container text-on-primary-container' 
                : activePatient.status === 'Novo' 
                  ? 'bg-tertiary-container text-on-tertiary-container'
                  : 'bg-surface-container-high text-on-surface-variant'
            }`}>
              {activePatient.status}
            </span>
          </div>
        </div>
        <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-surface-container-high text-on-surface rounded-full font-bold hover:bg-surface-container-highest transition-colors"
          >
            <Edit2 size={18} />
            <span>Editar</span>
          </button>
          <button 
            onClick={() => setCurrentView('anamnesis')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 primary-gradient text-white rounded-full font-bold shadow-md hover:scale-105 transition-transform"
          >
            <FileText size={18} />
            <span>Ver Anamnese</span>
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-on-surface-variant/5 hover:-translate-y-1 transition-transform cursor-pointer group" onClick={() => setCurrentView('assessments')}>
          <div className="w-12 h-12 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Settings size={24} />
          </div>
          <h3 className="text-lg font-bold font-headline mb-2">Avaliações Físicas</h3>
          <p className="text-sm text-on-surface-variant">Veja o histórico de medidas e percentual de gordura.</p>
        </motion.div>
        
        <motion.div variants={item} className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-on-surface-variant/5 hover:-translate-y-1 transition-transform cursor-pointer group" onClick={() => setCurrentView('diets')}>
          <div className="w-12 h-12 bg-tertiary-container text-on-tertiary-container rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <FileText size={24} />
          </div>
          <h3 className="text-lg font-bold font-headline mb-2">Planos Alimentares</h3>
          <p className="text-sm text-on-surface-variant">Acesse, edite e crie dietas para o paciente.</p>
        </motion.div>
        
        <motion.div variants={item} className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-on-surface-variant/5 hover:-translate-y-1 transition-transform cursor-pointer group" onClick={() => setCurrentView('agenda')}>
          <div className="w-12 h-12 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Calendar size={24} />
          </div>
          <h3 className="text-lg font-bold font-headline mb-2">Próximas Consultas</h3>
          <p className="text-sm text-on-surface-variant">Verifique e agende retornos (Última: {activePatient.lastConsultation}).</p>
        </motion.div>
      </div>
      
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsEditModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-surface-container-lowest rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 md:p-8 flex justify-between items-center border-b border-on-surface-variant/10">
                <h2 className="text-2xl font-bold font-headline">Editar Paciente</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="w-10 h-10 flex items-center justify-center hover:bg-surface-container-low rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 md:p-8 overflow-y-auto">
                <form id="edit-patient-form" onSubmit={handleSaveEdit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Nome Completo</label>
                      <input type="text" defaultValue={activePatient.name} required className="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm md:text-base text-on-surface font-medium focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Email</label>
                      <input type="email" placeholder="paciente@email.com" className="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm md:text-base text-on-surface font-medium focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">WhatsApp / Telefone</label>
                      <input type="tel" placeholder="(00) 00000-0000" className="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm md:text-base text-on-surface font-medium focus:ring-2 focus:ring-primary outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Objetivo Principal</label>
                      <select defaultValue={activePatient.objective} className="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm md:text-base text-on-surface font-medium focus:ring-2 focus:ring-primary outline-none">
                        <option>Emagrecimento</option>
                        <option>Hipertrofia</option>
                        <option>Reeducação Alimentar</option>
                        <option>Performance Esportiva</option>
                        <option>Saúde e Bem-estar</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Status Inicial</label>
                      <select defaultValue={activePatient.status} className="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm md:text-base text-on-surface font-medium focus:ring-2 focus:ring-primary outline-none">
                        <option>Novo</option>
                        <option>Ativo</option>
                        <option>Visto</option>
                      </select>
                    </div>
                  </div>
                </form>
              </div>
              <div className="p-6 md:p-8 bg-surface-container-low border-t border-on-surface-variant/10 flex justify-end gap-4">
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-2.5 rounded-full font-bold text-on-surface-variant hover:bg-surface-container-highest transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  form="edit-patient-form"
                  className="px-6 py-2.5 rounded-full font-bold bg-primary text-white hover:opacity-90 flex items-center gap-2 transition-opacity shadow-md text-sm"
                >
                  <Save size={16} />
                  Salvar Paciente
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
