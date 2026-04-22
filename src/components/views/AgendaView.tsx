import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, FileText, Plus, X, Trash2 } from 'lucide-react';
import { Appointment } from '../../types';
import { ToastType } from '../../App';

import { supabase } from '../../lib/supabase';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

interface Props {
  showToast?: (message: string, type?: ToastType) => void;
}

export default function AgendaView({ showToast }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const notifiedAppointments = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('appointments').select('*');
    if (data && !error) {
       const mapped = data.map(app => ({
          id: app.id,
          patientName: app.patient_name,
          date: app.date,
          time: app.time,
          type: app.type,
          notes: app.notes || ''
       }));
       setAppointments(mapped);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // Solicita permissão para Push Notifications Nativas
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    const checkReminders = () => {
      const now = new Date();
      appointments.forEach(app => {
        // Extrai data e hora
        const [year, month, day] = app.date.split('-').map(Number);
        const [hours, minutes] = app.time.split(':').map(Number);
        const appDateTime = new Date(year, month - 1, day, hours, minutes);

        // Calcula a diferença em minutos
        const diffMs = appDateTime.getTime() - now.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);

        // Notifica se o atendimento acontecerá em até 60 minutos
        if (diffMinutes > 0 && diffMinutes <= 60 && !notifiedAppointments.current.has(app.id)) {
          // Notificação In-App
          showToast?.(`Lembrete: Atendimento com ${app.patientName} às ${app.time} (em ${diffMinutes} min)`, 'info');
          
          // Notificação Push de Navegador (se concedida permissão)
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Alerta de Consulta ⏰', {
              body: `O atendimento com ${app.patientName} começa às ${app.time}.`
            });
          }

          // Salva para não notificar de novo
          notifiedAppointments.current.add(app.id);
        }
      });
    };

    checkReminders(); // Checa na montagem do componente
    const interval = setInterval(checkReminders, 60000); // E a cada 1 minuto depois

    return () => clearInterval(interval);
  }, [appointments, showToast]);

  // Form states
  const [formPatient, setFormPatient] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formType, setFormType] = useState<'Consulta' | 'Retorno' | 'Avaliação'>('Consulta');
  const [formNotes, setFormNotes] = useState('');

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const handleDayClick = (day: number) => {
    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
  };

  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const selectedDayAppointments = appointments
    .filter(app => app.date === selectedDateStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPatient || !formTime) {
      showToast?.('Preencha os campos obrigatórios.', 'error');
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
        showToast?.('Usuário não autenticado.', 'error');
        return;
    }

    const newApp = {
      nutri_id: userData.user.id,
      patient_name: formPatient,
      date: selectedDateStr,
      time: formTime,
      type: formType,
      notes: formNotes
    };

    const { data, error } = await supabase.from('appointments').insert([newApp]).select().single();

    if (error) {
        showToast?.('Erro ao salvar agendamento.', 'error');
        return;
    }

    const savedApp: Appointment = {
      id: data.id,
      patientName: data.patient_name,
      date: data.date,
      time: data.time,
      type: data.type,
      notes: data.notes || ''
    };

    setAppointments(prev => [...prev, savedApp]);
    setIsModalOpen(false);
    
    // Reset Form
    setFormPatient('');
    setFormTime('');
    setFormNotes('');
    setFormType('Consulta');
    
    showToast?.('Agendamento salvo com sucesso!', 'success');
  };

  const deleteAppointment = async (id: string) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) {
        showToast?.('Erro ao remover agendamento.', 'error');
        return;
    }
    setAppointments(prev => prev.filter(app => app.id !== id));
    showToast?.('Agendamento removido.', 'info');
  };

  const formatMonthYear = (date: Date) => {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const renderCalendarDays = () => {
    const days = [];
    const todayStr = new Date().toISOString().split('T')[0];

    // Espaços vazios no início do mês
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 md:h-14 lg:h-16"></div>);
    }

    // Dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      const dateStr = date.toISOString().split('T')[0];
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedDateStr;
      const hasEvents = appointments.some(app => app.date === dateStr);

      days.push(
        <button
          key={i}
          onClick={() => handleDayClick(i)}
          className={`h-10 md:h-14 lg:h-16 relative flex items-center justify-center rounded-xl md:rounded-2xl text-sm md:text-base font-bold transition-all ${
            isSelected ? 'bg-primary text-white shadow-md' 
            : isToday ? 'border-2 border-primary text-primary' 
            : 'hover:bg-surface-container-high text-on-surface'
          }`}
        >
          {i}
          {hasEvents && !isSelected && (
            <div className="absolute bottom-1 md:bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-secondary"></div>
          )}
          {hasEvents && isSelected && (
            <div className="absolute bottom-1 md:bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white"></div>
          )}
        </button>
      );
    }
    return days;
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12">
      <motion.header variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-1 md:mb-2 font-headline">Agenda</h1>
          <p className="text-sm md:text-base text-on-surface-variant font-medium">Controle de consultas e horários.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto primary-gradient text-white px-6 py-3 rounded-full font-bold flex items-center justify-center gap-2 shadow-lg hover:scale-105 transition-transform"
        >
          <Plus size={20} />
          <span>Lançar Agendamento</span>
        </button>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Calendário */}
        <motion.div variants={item} className="lg:col-span-2 bg-surface-container-low p-6 md:p-8 rounded-2xl shadow-sm border border-on-surface-variant/5">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold font-headline select-none">{formatMonthYear(currentDate)}</h2>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="w-10 h-10 flex flex-col items-center justify-center rounded-full bg-surface-container-lowest border border-on-surface-variant/10 text-on-surface-variant hover:text-primary hover:border-primary/50 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <button onClick={nextMonth} className="w-10 h-10 flex flex-col items-center justify-center rounded-full bg-surface-container-lowest border border-on-surface-variant/10 text-on-surface-variant hover:text-primary hover:border-primary/50 transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="text-center text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {renderCalendarDays()}
          </div>
        </motion.div>

        {/* Lista de Eventos do Dia */}
        <motion.div variants={item} className="bg-surface-container-low p-6 md:p-8 rounded-2xl shadow-sm border border-on-surface-variant/5 flex flex-col h-[500px] lg:h-auto">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-on-surface-variant/10">
            <div className="bg-primary-container/20 p-3 rounded-full text-primary">
              <CalendarIcon size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold font-headline">Compromissos</h3>
              <p className="text-sm font-medium text-on-surface-variant">
                {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : selectedDayAppointments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-on-surface-variant/50">
                <CalendarIcon size={48} className="mb-4 opacity-20" />
                <p className="font-bold font-headline text-lg">Dia Livre</p>
                <p className="text-sm">Parabéns! Sem consultas no momento.</p>
              </div>
            ) : (
              selectedDayAppointments.map((app) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={app.id} 
                  className="bg-surface-container-lowest p-4 rounded-xl border border-on-surface-variant/10 group relative overflow-hidden"
                >
                  {/* Etiqueta de cor baseada no tipo */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    app.type === 'Consulta' ? 'bg-primary' : 
                    app.type === 'Retorno' ? 'bg-secondary' : 'bg-tertiary'
                  }`} />
                  
                  <div className="flex justify-between items-start mb-2 pl-2">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-on-surface-variant" />
                      <span className="text-sm font-extrabold text-on-surface">{app.time}</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                      app.type === 'Consulta' ? 'bg-primary-container/30 text-primary' : 
                      app.type === 'Retorno' ? 'bg-secondary-container/30 text-secondary' : 'bg-tertiary-container/30 text-tertiary'
                    }`}>
                      {app.type}
                    </span>
                  </div>
                  
                  <div className="pl-2 mb-2">
                    <p className="font-bold text-on-surface flex items-center gap-1.5"><User size={14} className="text-on-surface-variant/50" /> {app.patientName}</p>
                  </div>
                  
                  {app.notes && (
                    <div className="pl-2 mt-3 pt-3 border-t border-on-surface-variant/10">
                      <p className="text-xs text-on-surface-variant font-medium flex items-start gap-1">
                        <FileText size={12} className="shrink-0 mt-0.5" /> 
                        {app.notes}
                      </p>
                    </div>
                  )}

                  <button 
                    onClick={() => deleteAppointment(app.id)}
                    className="absolute right-3 bottom-3 text-error/30 hover:text-error transition-colors md:opacity-0 md:group-hover:opacity-100"
                    title="Excluir Agendamento"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))
            )}
          </div>
          
        </motion.div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-surface-container-lowest rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden z-10 flex flex-col"
            >
              <div className="p-6 border-b border-on-surface-variant/10 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold font-headline">Novo Agendamento</h2>
                  <p className="text-xs font-medium text-primary mt-1">Para {selectedDate.toLocaleDateString('pt-BR')}</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center hover:bg-surface-container-low rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <form id="agenda-form" onSubmit={handleAddAppointment} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Nome do Paciente *</label>
                    <input 
                      type="text" 
                      required
                      value={formPatient}
                      onChange={(e) => setFormPatient(e.target.value)}
                      placeholder="Ex: João da Silva" 
                      className="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm text-on-surface font-medium focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Horário *</label>
                      <input 
                        type="time" 
                        required
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        className="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm text-on-surface font-medium focus:ring-2 focus:ring-primary outline-none" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Tipo de Atend.</label>
                      <select 
                        value={formType}
                        onChange={(e) => setFormType(e.target.value as any)}
                        className="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm text-on-surface font-medium focus:ring-2 focus:ring-primary outline-none"
                      >
                        <option value="Consulta">Consulta</option>
                        <option value="Retorno">Retorno</option>
                        <option value="Avaliação">Avaliação</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Anotações / Notas</label>
                    <textarea 
                      rows={3} 
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Observações importantes..." 
                      className="w-full bg-surface-container-low border-none rounded-xl p-3 text-sm text-on-surface font-medium focus:ring-2 focus:ring-primary outline-none resize-none" 
                    />
                  </div>
                </form>
              </div>
              <div className="p-6 bg-surface-container-low border-t border-on-surface-variant/10 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-full font-bold text-on-surface-variant hover:bg-surface-container-highest transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  form="agenda-form"
                  className="px-5 py-2.5 rounded-full font-bold bg-primary text-white hover:opacity-90 flex items-center gap-2 transition-opacity shadow-md text-sm"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
