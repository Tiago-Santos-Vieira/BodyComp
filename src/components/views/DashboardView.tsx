import React, { useState, useEffect } from 'react';
import { Calendar, Clock, TrendingUp, Eye, Plus, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { Patient } from '../../types';
import { ToastType } from '../../App';
import { supabase } from '../../lib/supabase';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

interface DashboardProps {
  onNewConsultation: () => void;
  onSelectPatient: (patient: Patient) => void;
  showToast?: (message: string, type?: ToastType) => void;
  onViewAllPatients?: () => void;
  onViewAgenda?: () => void;
}

export default function DashboardView({ onNewConsultation, onSelectPatient, showToast, onViewAllPatients, onViewAgenda }: DashboardProps) {
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, new: 0, appointments: 0 });
  const [nutriName, setNutriName] = useState('Doutor(a)');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    
    // Fetch profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      if (profile && profile.full_name) {
        setNutriName(profile.full_name);
      }
    }
    
    // Fetch last 3 patients
    const { data: patientsData, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    // Fetch total patients
    const { count: totalPatientsCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });

    // Fetch appointments today
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: todayAppointments, error: apptError } = await supabase
      .from('appointments')
      .select('id')
      .eq('date', todayStr);

    let appointmentsCount = 0;
    if (!apptError && todayAppointments) {
      appointmentsCount = todayAppointments.length;
    }

    if (!error && patientsData) {
      const mapped = patientsData.map(p => ({
        id: p.id,
        name: p.name,
        lastConsultation: p.last_consultation ? new Date(p.last_consultation).toLocaleDateString('pt-BR') : 'Nova',
        status: p.status,
        objective: p.objective || 'Saúde Geral',
        avatar: p.avatar_url || `https://picsum.photos/seed/${p.name}/100/100`,
      }));
      setRecentPatients(mapped);
    }

    setStats({
      total: totalPatientsCount || 0,
      new: patientsData ? patientsData.filter(p => p.status === 'Novo').length : 0,
      appointments: appointmentsCount
    });

    setIsLoading(false);
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8 md:mb-12">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-2 font-headline">Bom dia, {nutriName}</h1>
          <p className="text-on-surface-variant font-medium">Você tem <span className="text-primary font-bold">{stats.appointments} {stats.appointments === 1 ? 'atendimento' : 'atendimentos'}</span> agendado{stats.appointments === 1 ? '' : 's'} para hoje.</p>
        </div>
        <button 
          onClick={onViewAgenda}
          className="w-full md:w-auto primary-gradient text-white px-8 py-4 rounded-full font-bold shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <Calendar size={20} />
          Ver Agenda Completa
        </button>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {[
          { label: 'Pacientes Ativos', value: stats.total.toString(), trend: 'Cadastrados no sistema', icon: TrendingUp, color: 'text-primary', bg: 'bg-primary-container/30' },
          { label: 'Consultas Hoje', value: stats.appointments.toString(), trend: 'Atendimentos para hoje', icon: Clock, color: 'text-secondary-container', bg: 'bg-secondary-container/20' },
          { label: 'Novos Pacientes', value: stats.new.toString(), trend: 'Adicionados recentemente', icon: UserPlus, color: 'text-tertiary-container', bg: 'bg-tertiary-container/20' },
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-surface-container-low p-6 md:p-8 rounded-2xl border border-on-surface-variant/5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-xl ${stat.bg} ${stat.color}`}>
                  <Icon size={24} />
                </div>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-black text-on-surface font-headline mb-2">{stat.value}</p>
                <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-xs text-on-surface-variant/70 font-medium">{stat.trend}</p>
              </div>
            </div>
          );
        })}
      </motion.div>

      <motion.div variants={item} className="mt-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-on-surface font-headline">Atendimentos Recentes</h2>
          <button onClick={onViewAllPatients} className="text-primary font-bold hover:underline text-sm">Ver todos os pacientes</button>
        </div>
        <div className="bg-surface-container-low rounded-2xl overflow-hidden shadow-sm border border-on-surface-variant/5">
          <div className="divide-y divide-on-surface-variant/10">
            {isLoading ? (
              <div className="p-8 flex justify-center">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : recentPatients.length === 0 ? (
               <div className="p-8 text-center text-on-surface-variant font-medium">Você ainda não tem nenhum paciente cadastrado.</div>
            ) : recentPatients.map((patient, idx) => (
              <div key={idx} className="p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-surface-container-lowest transition-colors group">
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-surface flex-shrink-0">
                    <img src={patient.avatar} alt={patient.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base md:text-lg text-on-surface font-headline group-hover:text-primary transition-colors">{patient.name}</h3>
                    <p className="text-xs md:text-sm text-on-surface-variant">Última consulta: {patient.lastConsultation}</p>
                  </div>
                </div>
                <div className="flex flex-row items-center justify-between w-full sm:w-auto gap-4 md:gap-8">
                  <span className={`px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold ${
                    patient.status === 'Novo' ? 'bg-tertiary-container/20 text-tertiary-container' :
                    patient.status === 'Em progresso' ? 'bg-primary-container/20 text-primary' :
                    'bg-secondary-container/20 text-secondary-container'
                  }`}>
                    {patient.status}
                  </span>
                  <div className="flex gap-3">
                    <button onClick={() => onSelectPatient(patient)} className="h-10 md:h-12 px-4 md:px-6 rounded-full border border-on-surface-variant/10 text-primary font-bold hover:bg-primary hover:text-white transition-all active:scale-95 flex items-center gap-2">
                      <Eye size={16} />
                      <span>Ver</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-40">
        <button onClick={onNewConsultation} className="w-14 h-14 md:w-16 md:h-16 rounded-full primary-gradient text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all group">
          <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300 md:w-8 md:h-8" />
        </button>
      </motion.div>
    </motion.div>
  );
}
