import React, { useState, useRef, useEffect } from 'react';
import { Camera, Mail, Phone, MapPin, Award, Shield, LogOut, Save, User } from 'lucide-react';
import { motion } from 'motion/react';
import { ToastType } from '../../App';
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

interface Props {
  showToast?: (message: string, type?: ToastType) => void;
}

export default function ProfileView({ showToast }: Props) {
  const MALE_AVATAR = "https://cdn-icons-png.flaticon.com/512/4140/4140048.png";
  const FEMALE_AVATAR = "https://cdn-icons-png.flaticon.com/512/4140/4140047.png";

  const [profileImage, setProfileImage] = useState(MALE_AVATAR);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  
  const [profileData, setProfileData] = useState({
    full_name: '',
    specialty: '',
    phone: '',
    city: '',
    bio: '',
    tags: [] as string[]
  });
  const [authEmail, setAuthEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setAuthEmail(user.email || '');
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setProfileData({
          full_name: data.full_name || '',
          specialty: data.specialty || '',
          phone: data.phone || '',
          city: data.city || '',
          bio: data.bio || '',
          tags: data.tags || []
        });
        if (data.avatar_url) setProfileImage(data.avatar_url);
        if (data.cover_url) setCoverImage(data.cover_url);
      }
    }
    setIsLoading(false);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const payload = {
        id: user.id,
        full_name: profileData.full_name,
        specialty: profileData.specialty,
        phone: profileData.phone,
        city: profileData.city,
        bio: profileData.bio,
        tags: profileData.tags,
        avatar_url: profileImage,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase.from('profiles').upsert(payload);
      if (error) {
        showToast?.('Erro ao salvar perfil.', 'error');
      } else {
        showToast?.('Perfil atualizado com sucesso!', 'success');
        window.dispatchEvent(new Event('profileUpdated'));
      }
    }
    setIsSaving(false);
  };

  const handleAddTag = () => {
    const newTag = window.prompt('Digite a nova área de atuação:');
    if (newTag && newTag.trim() !== '') {
      setProfileData({ ...profileData, tags: [...profileData.tags, newTag.trim()] });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setProfileData({ ...profileData, tags: profileData.tags.filter(t => t !== tagToRemove) });
  };

  const handleResetPassword = async () => {
    const newPassword = window.prompt('Digite a nova senha (mínimo 6 caracteres):');
    if (newPassword && newPassword.length >= 6) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        showToast?.('Erro ao atualizar senha', 'error');
      } else {
        showToast?.('Senha atualizada com sucesso!', 'success');
      }
    } else if (newPassword) {
      showToast?.('A senha deve ter pelo menos 6 caracteres', 'error');
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Tem certeza que deseja sair da sua conta?')) {
      await supabase.auth.signOut();
      window.location.reload();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfileImage(imageUrl);
      showToast?.('Foto de perfil atualizada com sucesso!', 'success');
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setCoverImage(imageUrl);
      showToast?.('Foto de capa atualizada com sucesso!', 'success');
    }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-4xl mx-auto space-y-8 md:space-y-12 pb-20"
    >
      <motion.div variants={item} className="relative mb-8 md:mb-16">
        <div className="h-32 md:h-48 w-full bg-primary-container rounded-3xl overflow-hidden relative group">
          {coverImage ? (
            <img src={coverImage} alt="Capa" className="w-full h-full object-cover" />
          ) : (
            <>
              <div className="absolute inset-0 primary-gradient opacity-20"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
              </div>
            </>
          )}

          <input 
            type="file" 
            ref={coverInputRef} 
            onChange={handleCoverUpload} 
            className="hidden" 
            accept="image/*" 
          />
          <button 
            onClick={() => coverInputRef.current?.click()}
            className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 rounded-full bg-surface-container-lowest/80 backdrop-blur text-on-surface flex items-center justify-center shadow-lg hover:bg-primary-container hover:text-on-primary-container transition-colors cursor-pointer md:opacity-0 md:group-hover:opacity-100"
            title="Alterar foto de capa"
          >
            <Camera size={18} />
          </button>
        </div>
        
        <div className="px-6 md:px-12 flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-8">
          <div className="relative shrink-0 -mt-12 md:-mt-16 z-10 w-auto self-start md:self-auto flex flex-col items-center gap-2">
            <div className="w-24 h-24 md:w-40 md:h-40 rounded-3xl bg-surface-container-lowest p-1 shadow-2xl overflow-hidden border-4 border-surface-container-lowest">
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
            </div>
            <div className="flex gap-2 justify-center mt-1">
              <button 
                onClick={() => setProfileImage(MALE_AVATAR)}
                className={`text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${profileImage === MALE_AVATAR ? 'bg-primary text-white shadow-md' : 'bg-surface-container-low text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container'}`}
                title="Avatar Masculino"
              >
                👨‍⚕️ Homem
              </button>
              <button 
                onClick={() => setProfileImage(FEMALE_AVATAR)}
                className={`text-xs px-3 py-1.5 rounded-full font-bold transition-colors ${profileImage === FEMALE_AVATAR ? 'bg-primary text-white shadow-md' : 'bg-surface-container-low text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container'}`}
                title="Avatar Feminino"
              >
                👩‍⚕️ Mulher
              </button>
            </div>
          </div>
          <div className="pb-0 md:pb-4 w-full self-start md:self-end pt-2 md:pt-0">
             <h1 className="text-2xl md:text-3xl lg:text-4xl font-black font-headline text-on-surface tracking-tight">{profileData.full_name || 'Dr. Nutricionista'}</h1>
            <p className="text-xs md:text-sm text-primary font-bold flex items-center gap-1 md:gap-2 mt-1 md:mt-2">
              <Award size={16} className="md:w-5 md:h-5" />
              {profileData.specialty || 'Atendimento Clínico'}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-6 md:gap-12 pt-20 md:pt-16">
        <motion.div variants={item} className="col-span-12 lg:col-span-4 space-y-6 md:space-y-8">
          <div className="bg-surface-container-low p-6 md:p-8 rounded-2xl space-y-6 shadow-sm">
            <h3 className="text-base md:text-lg font-bold font-headline border-b border-on-surface-variant/10 pb-4">Informações de Contato</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-on-surface-variant">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0"><Mail size={16} /></div>
                <span className="text-xs md:text-sm font-medium break-all">{authEmail || 'contato@clinica.com'}</span>
              </div>
              <div className="flex items-center gap-4 text-on-surface-variant">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0"><Phone size={16} /></div>
                <span className="text-xs md:text-sm font-medium">{profileData.phone || '(00) 00000-0000'}</span>
              </div>
              <div className="flex items-center gap-4 text-on-surface-variant">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0"><MapPin size={16} /></div>
                <span className="text-xs md:text-sm font-medium">{profileData.city || 'Sua Cidade'}</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low p-6 md:p-8 rounded-2xl space-y-6 shadow-sm">
            <h3 className="text-base md:text-lg font-bold font-headline border-b border-on-surface-variant/10 pb-4">Configurações de Segurança</h3>
            <div className="space-y-4">
              <button 
                onClick={handleResetPassword}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-high transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-on-surface-variant group-hover:text-primary" />
                  <span className="text-xs md:text-sm font-medium">Alterar Senha</span>
                </div>
              </button>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-error/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <LogOut size={18} className="text-error" />
                  <span className="text-xs md:text-sm font-medium text-error">Sair da Conta</span>
                </div>
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="col-span-12 lg:col-span-8 space-y-6 md:space-y-8">
          <div className="bg-surface-container-low p-6 md:p-10 rounded-2xl shadow-sm space-y-6 md:space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-xl md:text-2xl font-bold font-headline">Perfil Profissional</h3>
              <button 
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-3 md:py-2 bg-primary text-white rounded-full font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:scale-100"
              >
                <Save size={16} />
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Nome Completo</label>
                <input type="text" value={profileData.full_name} onChange={e => setProfileData({...profileData, full_name: e.target.value})} placeholder="Ex: Dra. Juliana Costa" className="w-full bg-surface-container-lowest border-none rounded-xl p-3 md:p-4 text-sm md:text-base text-on-surface font-medium focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Especialidade Principal</label>
                <input type="text" value={profileData.specialty} onChange={e => setProfileData({...profileData, specialty: e.target.value})} placeholder="Ex: Nutrição Esportiva • CRN XXXXX" className="w-full bg-surface-container-lowest border-none rounded-xl p-3 md:p-4 text-sm md:text-base text-on-surface font-medium focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">E-mail (Acesso)</label>
                <input type="email" value={authEmail} readOnly disabled className="w-full bg-surface-container-lowest opacity-50 cursor-not-allowed border-none rounded-xl p-3 md:p-4 text-sm md:text-base text-on-surface font-medium border-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Telefone (Contato)</label>
                <input type="tel" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} placeholder="Ex: (11) 98888-7777" className="w-full bg-surface-container-lowest border-none rounded-xl p-3 md:p-4 text-sm md:text-base text-on-surface font-medium focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Cidade / Estado</label>
                <input type="text" value={profileData.city} onChange={e => setProfileData({...profileData, city: e.target.value})} placeholder="Ex: São Paulo, SP" className="w-full bg-surface-container-lowest border-none rounded-xl p-3 md:p-4 text-sm md:text-base text-on-surface font-medium focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Bio / Descrição Profissional</label>
                <textarea rows={4} value={profileData.bio} onChange={e => setProfileData({...profileData, bio: e.target.value})} placeholder="Descreva sua experiência..." className="w-full bg-surface-container-lowest border-none rounded-xl p-3 md:p-4 text-sm md:text-base text-on-surface font-medium focus:ring-2 focus:ring-primary outline-none resize-none" />
              </div>
            </div>

            <div className="pt-6 md:pt-8 border-t border-on-surface-variant/10">
              <h4 className="text-base md:text-lg font-bold font-headline mb-4 md:mb-6">Áreas de Atuação</h4>
              <div className="flex flex-wrap gap-2 md:gap-3">
                {profileData.tags.map(tag => (
                  <span onClick={() => handleRemoveTag(tag)} key={tag} className="cursor-pointer hover:bg-error/10 hover:text-error hover:border-error/20 px-3 py-1.5 md:px-4 md:py-2 bg-surface-container-lowest text-on-surface-variant rounded-full text-xs md:text-sm font-medium border border-on-surface-variant/10 transition-colors" title="Clique para remover">
                    {tag}
                  </span>
                ))}
                <button 
                  onClick={handleAddTag}
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-primary/10 text-primary rounded-full text-xs md:text-sm font-bold border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  + Adicionar
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
