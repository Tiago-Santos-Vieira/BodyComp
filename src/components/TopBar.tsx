import { Search, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface TopBarProps {
  onMenuToggle: () => void;
  onProfileClick?: () => void;
}

export default function TopBar({ onMenuToggle, onProfileClick }: TopBarProps) {
  const [profile, setProfile] = useState<{full_name: string, specialty: string, avatar_url: string}>({
    full_name: 'Carregando...',
    specialty: 'Carregando...',
    avatar_url: 'https://picsum.photos/seed/doctor/100/100'
  });

  useEffect(() => {
    loadProfile();
    window.addEventListener('profileUpdated', loadProfile);
    return () => window.removeEventListener('profileUpdated', loadProfile);
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('full_name, specialty, avatar_url').eq('id', user.id).single();
      if (data) {
        setProfile({
          full_name: data.full_name || 'Profissional',
          specialty: data.specialty || '',
          avatar_url: data.avatar_url || 'https://picsum.photos/seed/doctor/100/100'
        });
      }
    }
  };

  return (
    <header className="fixed top-0 right-0 w-full lg:w-[calc(100%-18rem)] z-30 glass-header flex justify-between items-center px-4 md:px-12 py-4 md:py-6 transition-all duration-300 print:hidden">
      <div className="flex items-center gap-4 flex-1">
        <button onClick={onMenuToggle} className="lg:hidden text-on-surface-variant hover:text-primary p-2 -ml-2">
          <Menu size={24} />
        </button>
        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
          <input
            type="text"
            placeholder="Buscar pacientes..."
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-full text-sm focus:ring-2 focus:ring-primary-container transition-all outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        <div 
          onClick={onProfileClick}
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          title="Ver perfil"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold font-headline leading-none">{profile.full_name}</p>
            {profile.specialty && <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter mt-1">{profile.specialty}</p>}
          </div>
          <div className="w-10 h-10 rounded-full bg-primary-container overflow-hidden border-2 border-primary-container/20">
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
