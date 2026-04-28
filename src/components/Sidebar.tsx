import { LayoutDashboard, Activity, ClipboardList, Utensils, Users, User, Plus, X, CalendarDays } from 'lucide-react';
import { ViewType, Patient } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onNewConsultation: () => void;
  activePatient: Patient | null;
  onClearPatient: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ currentView, onViewChange, onNewConsultation, activePatient, onClearPatient, isOpen, onClose }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda', icon: CalendarDays },
    { id: 'patients', label: 'Pacientes', icon: Users },
    ...(activePatient ? [
      { id: 'anamnesis', label: 'Anamnese', icon: ClipboardList },
      { id: 'assessments', label: 'Avaliações', icon: Activity },
      { id: 'diets', label: 'Dietas', icon: Utensils },
    ] : []),
  ] as const;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside className={`h-screen w-72 fixed left-0 top-0 bg-surface-container-low flex flex-col z-50 transition-transform duration-300 print:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="px-8 py-12">
          <h1 className="text-2xl font-extrabold text-primary font-headline tracking-tight">BodyComp</h1>
          <p className="text-xs text-on-surface-variant opacity-70 font-medium uppercase tracking-widest mt-1">Nutrição Inteligente</p>
        </div>

        {activePatient && (
          <div className="mx-6 mb-6 p-4 bg-primary-container/20 rounded-xl border border-primary/10 relative group transition-all">
            <button
              onClick={() => { onClearPatient(); onClose(); }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-surface-container-lowest flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
              title="Fechar prontuário"
            >
              <X size={14} />
            </button>
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">Paciente Ativo</p>
            <div className="flex items-center gap-3">
              <img src={activePatient.avatar} alt={activePatient.name} className="w-10 h-10 rounded-full object-cover border-2 border-primary/20" referrerPolicy="no-referrer" />
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-bold text-on-surface truncate">{activePatient.name}</p>
                <p className="text-xs text-on-surface-variant truncate">{activePatient.objective}</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 flex flex-col space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onViewChange(item.id as ViewType); onClose(); }}
                className={`flex items-center gap-4 py-4 px-8 transition-all relative group ${
                  isActive
                    ? 'text-primary font-bold bg-surface-container-lowest border-r-4 border-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-lowest/50 hover:text-primary'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary'} />
                <span className="font-headline">{item.label}</span>
              </button>
            );
          })}
          
          <button
            onClick={() => { onViewChange('profile'); onClose(); }}
            className={`flex items-center gap-4 py-4 px-8 transition-all mt-auto ${
              currentView === 'profile'
                ? 'text-primary font-bold bg-surface-container-lowest border-r-4 border-primary'
                : 'text-on-surface-variant hover:bg-surface-container-lowest/50 hover:text-primary'
            }`}
          >
            <User size={20} />
            <span className="font-headline">Perfil</span>
          </button>
        </nav>

        <div className="px-6 py-8">
          <button onClick={() => { onNewConsultation(); onClose(); }} className="w-full py-4 px-6 rounded-full primary-gradient text-white font-bold shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform active:scale-95">
            <Plus size={20} />
            <span>Novo Atendimento</span>
          </button>
        </div>
      </aside>
    </>
  );
}
