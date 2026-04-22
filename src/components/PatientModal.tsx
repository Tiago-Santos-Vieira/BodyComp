import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, Calendar, Activity, Tag, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Patient } from '../types';
import { supabase } from '../lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: Patient) => void;
  initialPatient?: Patient | null;
}

export default function PatientModal({ isOpen, onClose, onSave, initialPatient }: Props) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<Patient['status']>('Ativo');
  const [objective, setObjective] = useState('Não definido');
  const [gender, setGender] = useState('Masculino');

  const MALE_AVATAR = "https://cdn-icons-png.flaticon.com/512/4140/4140048.png";
  const FEMALE_AVATAR = "https://cdn-icons-png.flaticon.com/512/4140/4140047.png";

  useEffect(() => {
    if (isOpen) {
      if (initialPatient) {
        setName(initialPatient.name);
        setStatus(initialPatient.status);
        setObjective(initialPatient.objective);
        setGender(initialPatient.avatar === FEMALE_AVATAR ? 'Feminino' : 'Masculino');
      } else {
        setName('');
        setStatus('Novo');
        setObjective('Saúde Geral');
        setGender('Masculino');
      }
    }
  }, [isOpen, initialPatient]);

  const handleSave = async () => {
    // Pegar quem é o nutricionista logado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const avatarToUse = gender === 'Feminino' ? FEMALE_AVATAR : MALE_AVATAR;

    const patientData = {
      name: name || 'Novo Paciente',
      status: status,
      objective: objective,
      avatar_url: avatarToUse,
      nutri_id: user.id
    };

    let savedPatient;

    if (initialPatient?.id && initialPatient.id.length > 20) { // Check if it's a real UUID, our fake ones were 'p4'
      // UPDATE Mode
      const { data, error } = await supabase
        .from('patients')
        .update(patientData)
        .eq('id', initialPatient.id)
        .select()
        .single();
      
      if (!error && data) {
        savedPatient = { ...initialPatient, ...data, avatar: data.avatar_url, lastConsultation: new Date(data.last_consultation).toLocaleDateString('pt-BR') };
      }
    } else {
      // INSERT Mode
      const { data, error } = await supabase
        .from('patients')
        .insert([patientData])
        .select()
        .single();
        
      if (!error && data) {
        savedPatient = {
          id: data.id,
          name: data.name,
          status: data.status as Patient['status'],
          objective: data.objective,
          avatar: data.avatar_url,
          lastConsultation: new Date(data.last_consultation).toLocaleDateString('pt-BR')
        };
      }
    }

    if (savedPatient) {
      onSave(savedPatient);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-scrim/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-surface rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] border border-on-surface-variant/10"
        >
          <div className="p-6 border-b border-on-surface-variant/10 flex justify-between items-center bg-surface-container-lowest sticky top-0 z-10">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-on-surface font-headline">
                {initialPatient ? 'Editar Paciente' : 'Adicionar Novo Paciente'}
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">Preencha os dados básicos do paciente</p>
            </div>
            <button onClick={onClose} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 md:p-8 overflow-y-auto bg-surface space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Nome completo</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors">
                    <User size={18} />
                  </div>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full bg-surface-container border border-on-surface-variant/10 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-on-surface font-semibold placeholder:font-normal" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Avatar de Perfil</label>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setGender('Masculino')}
                    className={`flex-1 py-4 rounded-2xl text-sm font-bold transition-colors ${gender === 'Masculino' ? 'bg-primary text-white shadow-md' : 'bg-surface-container border border-on-surface-variant/10 text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container'}`}
                    title="Avatar Masculino"
                  >
                    👨‍⚕️ Homem
                  </button>
                  <button 
                    type="button"
                    onClick={() => setGender('Feminino')}
                    className={`flex-1 py-4 rounded-2xl text-sm font-bold transition-colors ${gender === 'Feminino' ? 'bg-primary text-white shadow-md' : 'bg-surface-container border border-on-surface-variant/10 text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container'}`}
                    title="Avatar Feminino"
                  >
                    👩‍⚕️ Mulher
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Status</label>
                <select 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value as Patient['status'])}
                  className="w-full bg-surface-container border border-on-surface-variant/10 rounded-2xl p-4 focus:ring-2 focus:ring-primary outline-none transition-all text-on-surface font-semibold appearance-none"
                >
                  <option value="Novo">Novo</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Em progresso">Em progresso</option>
                  <option value="Ajuste de Dieta">Ajuste de Dieta</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Objetivo Foco</label>
                <input 
                    type="text" 
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="Ex: Emagrecimento, Hipertrofia..."
                    className="w-full bg-surface-container border border-on-surface-variant/10 rounded-2xl p-4 focus:ring-2 focus:ring-primary outline-none transition-all text-on-surface font-semibold" 
                  />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Celular Preferencial</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors">
                    <Phone size={18} />
                  </div>
                  <input type="text" placeholder="(11) 90000-0000" className="w-full bg-surface-container border border-on-surface-variant/10 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-primary outline-none transition-all text-on-surface font-medium" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">E-mail</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 group-focus-within:text-primary transition-colors">
                    <Mail size={18} />
                  </div>
                  <input type="email" placeholder="paciente@email.com" className="w-full bg-surface-container border border-on-surface-variant/10 rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-primary outline-none transition-all text-on-surface font-medium" />
                </div>
              </div>
            </div>

          </div>

          <div className="p-6 border-t border-on-surface-variant/10 bg-surface-container-lowest sticky bottom-0 flex justify-end gap-3 z-10">
            <button onClick={onClose} className="px-6 py-3 font-bold text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} className="px-8 py-3 primary-gradient text-white rounded-full font-bold transition-transform shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2">
              <User size={18} />
              {initialPatient ? 'Atualizar Dados' : 'Cadastrar Paciente'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
