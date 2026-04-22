import { useState, useEffect } from 'react';
import { CheckCircle, Info, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import DashboardView from './components/views/DashboardView';
import AnamnesisView from './components/views/AnamnesisView';
import AssessmentsView from './components/views/AssessmentsView';
import DietsView from './components/views/DietsView';
import PatientsView from './components/views/PatientsView';
import ProfileView from './components/views/ProfileView';
import PatientDetailView from './components/views/PatientDetailView';
import AgendaView from './components/views/AgendaView';
import LoginView from './components/views/LoginView';
import PatientModal from './components/PatientModal';
import { ViewType, Patient } from './types';
import { supabase } from './lib/supabase';

export type ToastType = 'success' | 'info' | 'error';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType | 'patient_detail'>('dashboard');
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const showToast = (message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleSelectPatient = (patient: Patient) => {
    setActivePatient(patient);
    setCurrentView('patient_detail');
  };

  const handleClearPatient = () => {
    setActivePatient(null);
    if (['anamnesis', 'assessments', 'diets', 'patient_detail'].includes(currentView)) {
      setCurrentView('patients');
    }
  };

  const handlePatientCreated = (patient: Patient) => {
    handleSelectPatient(patient);
    showToast('Paciente criado com sucesso!');
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView onNewConsultation={() => setIsNewPatientModalOpen(true)} onSelectPatient={handleSelectPatient} showToast={showToast} onViewAllPatients={() => setCurrentView('patients')} onViewAgenda={() => setCurrentView('agenda')} />;
      case 'anamnesis':
        return <AnamnesisView activePatient={activePatient} showToast={showToast} />;
      case 'assessments':
        return <AssessmentsView activePatient={activePatient} showToast={showToast} />;
      case 'diets':
        return <DietsView activePatient={activePatient} showToast={showToast} />;
      case 'patients':
        return <PatientsView onSelectPatient={handleSelectPatient} onNewPatient={() => setIsNewPatientModalOpen(true)} showToast={showToast} />;
      case 'profile':
        return <ProfileView showToast={showToast} />;
      case 'agenda':
        return <AgendaView showToast={showToast} />;
      case 'patient_detail':
        return <PatientDetailView activePatient={activePatient} setCurrentView={setCurrentView} showToast={showToast} />;
      default:
        return <DashboardView onNewConsultation={() => setIsNewPatientModalOpen(true)} onSelectPatient={handleSelectPatient} showToast={showToast} />;
    }
  };

  const renderToasts = () => (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none print:hidden">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
              toast.type === 'success' ? 'bg-primary-container text-on-primary-container border-primary/20' :
              toast.type === 'error' ? 'bg-error-container text-on-error-container border-error/20' :
              'bg-surface-container-high text-on-surface border-on-surface-variant/20'
            }`}
          >
            {toast.type === 'success' && <CheckCircle size={20} className="text-primary" />}
            {toast.type === 'error' && <AlertCircle size={20} className="text-error" />}
            {toast.type === 'info' && <Info size={20} className="text-secondary" />}
            <span className="font-medium text-sm">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 md:w-12 md:h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-surface flex">
        <LoginView onLogin={() => setIsAuthenticated(true)} showToast={showToast} />
        {renderToasts()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar 
        currentView={currentView as ViewType} 
        onViewChange={(view) => setCurrentView(view)} 
        onNewConsultation={() => setIsNewPatientModalOpen(true)}
        activePatient={activePatient}
        onClearPatient={handleClearPatient}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      
      <div className="flex-1 lg:ml-72 transition-all duration-300 w-full print:ml-0">
        <TopBar onMenuToggle={() => setIsMobileMenuOpen(true)} onProfileClick={() => setCurrentView('profile')} />
        
        <main className="pt-24 md:pt-32 px-4 md:px-12 pb-12 print:pt-0 print:px-0 print:pb-0">
          <div className="max-w-7xl mx-auto">
            {renderView()}
          </div>
        </main>
      </div>

      <PatientModal 
        isOpen={isNewPatientModalOpen} 
        onClose={() => setIsNewPatientModalOpen(false)} 
        onSave={handlePatientCreated}
      />

      {/* Toast Container */}
      {renderToasts()}
    </div>
  );
}
