import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, MoreVertical, Edit2, ChevronRight, ArrowLeft, ArrowRight, Dumbbell, Scale, Zap, Heart, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Patient } from '../../types';
import { ToastType } from '../../App';
import PatientModal from '../PatientModal';
import { supabase } from '../../lib/supabase';

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

interface PatientsProps {
  onSelectPatient: (patient: Patient) => void;
  onNewPatient?: () => void;
  showToast?: (message: string, type?: ToastType) => void;
}

export default function PatientsView({ onSelectPatient, onNewPatient, showToast }: PatientsProps) {
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [overviewStats, setOverviewStats] = useState({ totalPatients: 0, appointmentsThisMonth: 0 });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });
      
    // Fetch Overview Stats
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const dateStr = startOfMonth.toISOString().split('T')[0];
    
    const { count: totalPatients } = await supabase.from('patients').select('*', { count: 'exact', head: true });
    
    const { count: monthAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('date', dateStr);
      
    setOverviewStats({ totalPatients: totalPatients || 0, appointmentsThisMonth: monthAppointments || 0 });

    if (error) {
      showToast?.('Erro ao buscar pacientes', 'error');
    } else if (data) {
      const mapped = data.map(p => ({
        id: p.id,
        name: p.name,
        lastConsultation: p.last_consultation ? new Date(p.last_consultation).toLocaleDateString('pt-BR') : 'Nova',
        status: p.status,
        objective: p.objective || 'Saúde Geral',
        avatar: p.avatar_url || `https://picsum.photos/seed/${p.name}/100/100`,
      }));
      setPatients(mapped);
    }
    setIsLoading(false);
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const handleEditPatient = (patient: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPatient(patient as Patient);
    setIsEditModalOpen(true);
  };

  const handleDeletePatient = async (patient: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja excluir o paciente ${patient.name}?`)) {
      const { error } = await supabase.from('patients').delete().eq('id', patient.id);
      if (error) {
        showToast?.('Erro ao excluir paciente.', 'error');
      } else {
        setPatients(prev => prev.filter(p => p.id !== patient.id));
        setOverviewStats(prev => ({
          ...prev,
          totalPatients: Math.max(0, prev.totalPatients - 1)
        }));
        showToast?.('Paciente excluído com sucesso.', 'success');
      }
    }
  };

  const handleSavePatient = (updatedPatient: Patient) => {
    // Check if we just created a new patient or updated an existing one
    const exists = patients.find(p => p.id === updatedPatient.id);
    if (exists) {
       setPatients(patients.map(p => p.id === updatedPatient.id ? { ...p, ...updatedPatient } : p));
    } else {
       setPatients([updatedPatient, ...patients]);
    }
    showToast?.('Paciente salvo com sucesso!', 'success');
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary font-headline">Pacientes</h1>
        <button 
          onClick={onNewPatient}
          className="w-full md:w-auto primary-gradient text-white px-6 py-3 rounded-full font-bold flex items-center justify-center gap-2 shadow-lg hover:scale-105 transition-all active:scale-95"
        >
          <Plus size={20} />
          Adicionar Paciente
        </button>
      </motion.div>

      <motion.section variants={item} className="w-full">
        <div className="relative group w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-on-surface-variant group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Buscar paciente pelo nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-11 pr-4 py-3 md:py-4 bg-surface-container-low border-none rounded-2xl md:rounded-full text-base font-medium text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm"
          />
        </div>
      </motion.section>

      <motion.section variants={item} className="bg-surface-container-low rounded-xl p-4 md:p-8 shadow-sm">
        <div className="space-y-4 md:space-y-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 md:w-12 md:h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : (() => {
              const displayedPatients = patients.filter(patient => 
                patient.name.toLowerCase().includes(searchTerm.toLowerCase())
              );
              
              if (displayedPatients.length === 0) {
                return (
                  <div className="text-center py-12">
                    <p className="text-on-surface-variant font-medium">Nenhum paciente encontrado.</p>
                  </div>
                );
              }

              return displayedPatients.map((patient, idx) => {
            const Icon = patient.icon || Dumbbell;
            return (
              <div key={patient.id || idx} className="group bg-surface-container-lowest p-4 md:p-6 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 transition-all hover:translate-x-1 shadow-sm cursor-pointer" onClick={() => onSelectPatient(patient as Patient)}>
                <div className="flex items-center gap-4 md:gap-6 flex-1 w-full">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-surface flex-shrink-0">
                    <img src={patient.avatar} alt={patient.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-bold text-on-surface font-headline group-hover:text-primary transition-colors">{patient.name}</h3>
                    <p className="text-xs md:text-sm text-on-surface-variant">Última consulta: {patient.lastConsultation}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between w-full md:w-auto md:flex-1 gap-4">
                  <div className="flex-1 flex md:justify-center">
                    <span className={`px-3 py-1 md:px-4 md:py-1 text-[10px] md:text-xs font-bold rounded-full ${
                      patient.status === 'Ativo' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant'
                    }`}>
                      {patient.status}
                    </span>
                  </div>
                  <div className="flex-1 md:px-8">
                    <div className="flex items-center gap-2 md:gap-3">
                      <Icon size={16} className="text-primary md:w-5 md:h-5" />
                      <div>
                        <p className="text-[8px] md:text-[10px] text-on-surface-variant font-bold uppercase tracking-tight">Objetivo</p>
                        <p className="text-xs md:text-sm font-medium text-on-surface">{patient.objective}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => handleEditPatient(patient, e)}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-low text-on-surface-variant hover:bg-primary-container hover:text-white transition-colors"
                    title="Editar paciente"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={(e) => handleDeletePatient(patient, e)}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-low text-error/70 hover:bg-error hover:text-white transition-colors"
                    title="Excluir paciente"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onSelectPatient(patient as Patient); }}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-low text-on-surface-variant hover:bg-primary-container hover:text-white transition-colors"
                    title="Ver ficha"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            );
          });
        })()}
        </div>

        <div className="mt-8 md:mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs md:text-sm text-on-surface-variant">Mostrando resultados para <span className="font-bold text-on-surface">{patients.length}</span> pacientes totais.</p>
          <div className="flex items-center gap-1 md:gap-2">
            <button className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors">
              <ArrowLeft size={18} />
            </button>
            <button className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-primary text-white font-bold shadow-md">1</button>
            <button className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors font-bold">2</button>
            <button className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors font-bold">3</button>
            <span className="px-1 md:px-2">...</span>
            <button className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors font-bold">12</button>
            <button className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors">
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </motion.section>

      <motion.section variants={item} className="grid grid-cols-12 gap-4 md:gap-8">
        <div className="col-span-12 bg-primary-container/10 rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-12 overflow-hidden relative border border-primary/10">
          <div className="relative z-10 w-full">
            <h2 className="text-2xl md:text-3xl font-black text-primary mb-2 font-headline">Visão Geral da Clínica</h2>
            <p className="text-on-surface-variant opacity-80 max-w-sm mb-6 text-sm md:text-base">Mantenha o acompanhamento da sua base de pacientes em dia. Acompanhe seus resultados neste mês.</p>
            <div className="flex gap-8 md:gap-12">
              <div>
                <p className="text-3xl md:text-4xl font-black text-primary">{overviewStats.appointmentsThisMonth}</p>
                <p className="text-[8px] md:text-[10px] font-bold uppercase text-on-surface-variant/60">Atendimentos no Mês</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-black text-primary">{overviewStats.totalPatients}</p>
                <p className="text-[8px] md:text-[10px] font-bold uppercase text-on-surface-variant/60">Total de Pacientes</p>
              </div>
            </div>
          </div>
          <div className="hidden md:block absolute right-0 top-0 h-full w-1/3 bg-primary-container/5 skew-x-12 translate-x-12"></div>
        </div>
      </motion.section>

      {/* Reused PatientModal mapped specifically for Edit here */}
      <PatientModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingPatient(null); }}
        onSave={handleSavePatient}
        initialPatient={editingPatient}
      />

    </motion.div>
  );
}
