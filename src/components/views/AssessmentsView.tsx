import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Ruler, Camera, Activity, FileText, User, Save, History, Plus, Trash2, Printer } from 'lucide-react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Patient } from '../../types';
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
  activePatient: Patient | null;
  showToast?: (message: string, type?: ToastType) => void;
}

export default function AssessmentsView({ activePatient, showToast }: Props) {
  const skinfoldLabels = [
    'Dobra Subescapular', 'Dobra Tricipital', 'Dobra Peitoral', 
    'Dobra Axilar Média', 'Dobra Supra-ilíaca', 'Dobra Abdominal', 'Dobra Coxa'
  ];

  const [basicData, setBasicData] = useState({
    weight: 0,
    height: 0,
    age: 0,
    gender: 'M' as 'M' | 'F',
    waist: 0,
    hip: 0
  });

  const [skinfolds, setSkinfolds] = useState<number[]>(Array(7).fill(0));
  const [perimetry, setPerimetry] = useState<Record<string, number>>({});
  const [assessmentsHistory, setAssessmentsHistory] = useState<any[]>([]);
  const [currentAssessmentId, setCurrentAssessmentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activePatient) {
      loadHistory();
    }
  }, [activePatient]);

  const loadHistory = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('assessments')
      .select('*')
      .eq('patient_id', activePatient!.id)
      .order('date', { ascending: false });

    if (data && data.length > 0) {
      setAssessmentsHistory(data);
      loadAssessmentData(data[0]);
    } else {
      setAssessmentsHistory([]);
      startNewAssessment();
    }
    setIsLoading(false);
  };

  const loadAssessmentData = (assessment: any) => {
    setCurrentAssessmentId(assessment.id);
    setBasicData(assessment.basic_data || { weight: 0, height: 0, age: 0, gender: 'M', waist: 0, hip: 0 });
    setSkinfolds(assessment.skinfolds || Array(7).fill(0));
    setPerimetry(assessment.perimetry || {});
    setFrontalImage(assessment.photos?.frontal || null);
    setProfileImage(assessment.photos?.profile || null);
  };

  const startNewAssessment = () => {
    setCurrentAssessmentId(null);
    setBasicData({ weight: 0, height: 0, age: 0, gender: 'M', waist: 0, hip: 0 });
    setSkinfolds(Array(7).fill(0));
    setPerimetry({});
    setFrontalImage(null);
    setProfileImage(null);
  };

  const handleSaveAssessment = async () => {
    if (!activePatient) return;
    setIsSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const payload = {
      nutri_id: user?.id,
      patient_id: activePatient.id,
      basic_data: basicData,
      skinfolds: skinfolds,
      perimetry: perimetry,
      photos: {
        frontal: frontalImage,
        profile: profileImage
      },
      date: new Date().toISOString()
    };

    if (currentAssessmentId) {
      const { error } = await supabase.from('assessments').update(payload).eq('id', currentAssessmentId);
      if (!error) {
        showToast?.('Avaliação atualizada!', 'success');
        // Refresh list slightly
        const { data } = await supabase.from('assessments').select('*').eq('patient_id', activePatient.id).order('date', { ascending: false });
        if (data) setAssessmentsHistory(data);
      } else {
        showToast?.('Erro ao atualizar: ' + error.message, 'error');
      }
    } else {
      const { data, error } = await supabase.from('assessments').insert([payload]).select().single();
      if (data) {
        setCurrentAssessmentId(data.id);
        setAssessmentsHistory([data, ...assessmentsHistory]);
        showToast?.('Nova avaliação salva!', 'success');
      } else if (error) {
        showToast?.('Erro ao criar avaliação: ' + error.message, 'error');
      }
    }
    setIsSaving(false);
  };

  const handleDeleteAssessment = async () => {
    if (!currentAssessmentId || !activePatient) return;
    
    if (window.confirm('Tem certeza que deseja excluir esta avaliação do histórico? Esta ação é irreversível.')) {
      setIsSaving(true);
      await supabase.from('assessments').delete().eq('id', currentAssessmentId);
      showToast?.('Avaliação excluída com sucesso!', 'success');
      
      const { data } = await supabase.from('assessments').select('*').eq('patient_id', activePatient.id).order('date', { ascending: false });
      if (data && data.length > 0) {
        setAssessmentsHistory(data);
        loadAssessmentData(data[0]);
      } else {
        setAssessmentsHistory([]);
        startNewAssessment();
      }
      setIsSaving(false);
    }
  };

  const handleSkinfoldChange = (index: number, value: string) => {
    const newSkinfolds = [...skinfolds];
    newSkinfolds[index] = parseFloat(value) || 0;
    setSkinfolds(newSkinfolds);
  };

  const results = useMemo(() => {
    const { weight, height, age, gender, waist, hip } = basicData;
    
    // IMC
    const heightInMeters = height / 100;
    const imc = heightInMeters > 0 ? weight / (heightInMeters * heightInMeters) : 0;
    let imcClass = '';
    if (imc > 0) {
      if (imc < 18.5) imcClass = 'Abaixo do peso';
      else if (imc < 24.9) imcClass = 'Peso normal';
      else if (imc < 29.9) imcClass = 'Sobrepeso';
      else imcClass = 'Obesidade';
    }

    // Jackson-Pollock 7 Dobras
    const sumSkinfolds = skinfolds.reduce((a, b) => a + b, 0);
    let bodyFat = 0;
    
    if (sumSkinfolds > 0 && age > 0) {
      let bodyDensity = 0;
      if (gender === 'M') {
        bodyDensity = 1.112 - (0.00043499 * sumSkinfolds) + (0.00000055 * Math.pow(sumSkinfolds, 2)) - (0.00028826 * age);
      } else {
        bodyDensity = 1.097 - (0.00046971 * sumSkinfolds) + (0.00000056 * Math.pow(sumSkinfolds, 2)) - (0.00012828 * age);
      }
      
      if (bodyDensity > 0) {
        bodyFat = (4.95 / bodyDensity - 4.5) * 100;
        // Clamp between 0 and 100
        bodyFat = Math.max(0, Math.min(100, bodyFat));
      }
    }

    const fatMass = (weight * bodyFat) / 100;
    const leanMass = weight - fatMass;

    // Advanced Metrics
    const tmb = gender === 'M' 
      ? 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
      : 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);

    const idealWeight = gender === 'M'
      ? 22.5 * (heightInMeters * heightInMeters)
      : 21.0 * (heightInMeters * heightInMeters);

    const water = leanMass * 0.73;

    const whr = hip > 0 ? waist / hip : 0;
    let whrRisk = 'Ideal';
    if (whr > 0) {
      if (gender === 'M') {
        whrRisk = whr >= 0.90 ? 'Risco Alto' : 'Risco Baixo';
      } else {
        whrRisk = whr >= 0.85 ? 'Risco Alto' : 'Risco Baixo';
      }
    }

    return {
      imc: imc.toFixed(1),
      imcClass,
      bodyFat: bodyFat.toFixed(1),
      fatMass: fatMass.toFixed(1),
      leanMass: leanMass.toFixed(1),
      sumSkinfolds: sumSkinfolds.toFixed(1),
      tmb: Math.round(tmb),
      idealWeight: idealWeight.toFixed(1),
      water: water.toFixed(1),
      whr: whr.toFixed(2),
      whrRisk
    };
  }, [basicData, skinfolds]);

  const [frontalImage, setFrontalImage] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const frontalInputRef = useRef<HTMLInputElement>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
    });
  };

  const handleFrontalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await compressImage(file);
      setFrontalImage(base64);
      showToast?.('Foto frontal salva temporariamente!', 'success');
    }
  };

  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await compressImage(file);
      setProfileImage(base64);
      showToast?.('Foto de perfil salva temporariamente!', 'success');
    }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 md:space-y-12 pb-24 md:pb-12 print:space-y-6 print:pb-0"
    >
      <motion.header variants={item} className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-1 md:mb-2 font-headline">Avaliação Detalhada</h1>
          <p className="text-sm md:text-base text-on-surface-variant font-medium">Paciente: <span className="text-on-surface">{activePatient?.name || 'Não selecionado'}</span> • ID: #{activePatient?.id || '---'}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
          <div className="relative w-full sm:w-auto">
            <select 
              value={currentAssessmentId || ''}
              onChange={(e) => {
                if (e.target.value === '') startNewAssessment();
                else {
                  const found = assessmentsHistory.find(a => a.id === e.target.value);
                  if (found) loadAssessmentData(found);
                }
              }}
              className="w-full sm:w-auto appearance-none bg-surface-container border border-on-surface-variant/20 rounded-full px-5 py-3 md:py-4 pl-10 text-on-surface font-bold outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm md:text-base print:hidden"
            >
              <option value="">+ Iniciar Nova Avaliação</option>
              {assessmentsHistory.map(a => (
                <option key={a.id} value={a.id}>Histórico: {new Date(a.date).toLocaleDateString('pt-BR')}</option>
              ))}
            </select>
            <History size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-70 print:hidden" />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {currentAssessmentId && (
              <button 
                onClick={handleDeleteAssessment}
                disabled={isSaving}
                title="Excluir Avaliação"
                className="w-12 md:w-14 h-12 md:h-[56px] border border-error text-error rounded-full flex items-center justify-center hover:bg-error/10 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 print:hidden"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button 
              onClick={() => window.print()}
              className="w-12 md:w-14 h-12 md:h-[56px] border border-primary/20 text-primary rounded-full flex items-center justify-center hover:bg-primary/5 active:scale-95 transition-all print:hidden"
              title="Imprimir Avaliação"
            >
              <Printer size={20} />
            </button>
            <button 
              onClick={handleSaveAssessment}
              disabled={isSaving}
              className="flex-1 sm:w-auto primary-gradient text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-bold flex items-center justify-center gap-2 md:gap-3 shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 print:hidden"
            >
              <Save size={20} />
              <span className="text-sm md:text-base">{isSaving ? 'Salvando...' : 'Salvar Avaliação'}</span>
            </button>
          </div>
        </div>
      </motion.header>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-8 h-8 md:w-12 md:h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : (
      <>
      <div className="grid grid-cols-12 gap-6 md:gap-8">
        {/* Dados Básicos */}
        <motion.div variants={item} className="col-span-12 bg-surface-container-low p-6 md:p-10 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="bg-primary/10 p-2 md:p-3 rounded-full text-primary">
              <User size={20} className="md:w-6 md:h-6" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-headline">Dados Básicos</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Peso (kg)</label>
              <input 
                type="number" 
                value={basicData.weight || ''}
                onChange={(e) => setBasicData({...basicData, weight: parseFloat(e.target.value) || 0})}
                className="w-full bg-surface-container-lowest border-b-2 border-on-surface-variant/10 focus:border-primary border-t-0 border-l-0 border-r-0 py-2 px-2 text-lg font-bold focus:ring-0 transition-all outline-none rounded-t-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Altura (cm)</label>
              <input 
                type="number" 
                value={basicData.height || ''}
                onChange={(e) => setBasicData({...basicData, height: parseFloat(e.target.value) || 0})}
                className="w-full bg-surface-container-lowest border-b-2 border-on-surface-variant/10 focus:border-primary border-t-0 border-l-0 border-r-0 py-2 px-2 text-lg font-bold focus:ring-0 transition-all outline-none rounded-t-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Idade</label>
              <input 
                type="number" 
                value={basicData.age || ''}
                onChange={(e) => setBasicData({...basicData, age: parseInt(e.target.value) || 0})}
                className="w-full bg-surface-container-lowest border-b-2 border-on-surface-variant/10 focus:border-primary border-t-0 border-l-0 border-r-0 py-2 px-2 text-lg font-bold focus:ring-0 transition-all outline-none rounded-t-lg"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Sexo</label>
              <select 
                value={basicData.gender}
                onChange={(e) => setBasicData({...basicData, gender: e.target.value as 'M' | 'F'})}
                className="w-full bg-surface-container-lowest border-b-2 border-on-surface-variant/10 focus:border-primary border-t-0 border-l-0 border-r-0 py-2 px-2 text-lg font-bold focus:ring-0 transition-all outline-none rounded-t-lg"
              >
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Resultados da Avaliação */}
        <motion.div variants={item} className="col-span-12 bg-primary text-white p-6 md:p-10 rounded-xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl"></div>
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold font-headline mb-8">Resultados da Avaliação</h2>
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 w-full">
                <div className="grid grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
                  <div className="bg-white/10 p-4 rounded-xl border border-white/10">
                    <p className="text-primary-container text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">Gordura Corporal</p>
                    <p className="text-3xl md:text-4xl font-black">{results.bodyFat}%</p>
                    <p className="text-xs md:text-sm mt-2 opacity-90">Massa Gorda: <span className="font-bold">{results.fatMass} kg</span></p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-xl border border-white/10">
                    <p className="text-primary-container text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">Massa Magra</p>
                    <p className="text-3xl md:text-4xl font-black">{results.leanMass} <span className="text-lg md:text-xl font-medium opacity-80">kg</span></p>
                    <p className="text-xs md:text-sm mt-2 opacity-90">Água (ACT): <span className="font-bold">{results.water} L</span></p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-xl border border-white/10">
                    <p className="text-primary-container text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">IMC</p>
                    <p className="text-3xl md:text-4xl font-black">{results.imc}</p>
                    <p className="text-xs md:text-sm mt-2 opacity-90 font-medium">{results.imcClass}</p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-xl border border-white/10">
                    <p className="text-primary-container text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">Taxa Metabólica Basal</p>
                    <p className="text-3xl md:text-4xl font-black">{results.tmb} <span className="text-lg md:text-xl font-medium opacity-80">kcal</span></p>
                    <p className="text-xs md:text-sm mt-2 opacity-90">Peso Ideal Est.: <span className="font-bold">{results.idealWeight} kg</span></p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 md:gap-8 pt-6 border-t border-white/20">
                  <div>
                    <p className="text-primary-container text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">RCQ (Cintura/Quadril)</p>
                    <p className="text-2xl md:text-3xl font-black">{basicData.waist > 0 && basicData.hip > 0 ? results.whr : '--'}</p>
                    <p className="text-xs md:text-sm mt-1 opacity-80">{basicData.waist > 0 && basicData.hip > 0 ? results.whrRisk : 'Insira medidas p/ calc.'}</p>
                  </div>
                  <div>
                    <p className="text-primary-container text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">Somatório Dobras</p>
                    <p className="text-2xl md:text-3xl font-black">{results.sumSkinfolds} <span className="text-base font-medium opacity-80">mm</span></p>
                    <p className="text-xs md:text-sm mt-1 opacity-80">Protocolo de 7 Dobras</p>
                  </div>
                </div>
              </div>
              <div className="w-full lg:w-72 h-80 flex-shrink-0 bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col items-center justify-center">
                <p className="text-xs font-bold uppercase tracking-wider mb-2 text-white/80">Composição (kg)</p>
                <div className="w-full flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Massa Magra', value: parseFloat(results.leanMass) },
                          { name: 'Massa Gorda', value: parseFloat(results.fatMass) }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell fill="#3eb489" /> {/* Massa Magra */}
                        <Cell fill="#ef817d" /> {/* Massa Gorda */}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => [`${value} kg`, '']}
                        contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#191c1d', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', opacity: 0.9 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="col-span-12 lg:col-span-7 bg-surface-container-low p-6 md:p-10 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="bg-secondary-container p-2 md:p-3 rounded-full text-on-secondary-container">
              <Activity size={20} className="md:w-6 md:h-6" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-headline">Dobras Cutâneas (7 Protocolos)</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            {skinfoldLabels.map((fold, idx) => (
              <div key={idx} className={`space-y-2 ${idx === 6 ? 'sm:col-span-2' : ''}`}>
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{fold}</label>
                <div className="relative">
                  <input 
                    type="number" 
                    placeholder="0.0"
                    value={skinfolds[idx] || ''}
                    onChange={(e) => handleSkinfoldChange(idx, e.target.value)}
                    className="w-full bg-surface-container-lowest border-b-2 border-on-surface-variant/10 focus:border-primary border-t-0 border-l-0 border-r-0 py-3 md:py-4 px-2 text-lg md:text-xl font-bold focus:ring-0 transition-all outline-none rounded-t-lg"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-medium text-sm md:text-base">mm</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={item} className="col-span-12 lg:col-span-5 flex flex-col gap-6 md:gap-8">
          <div className="bg-surface-container-low p-6 md:p-8 rounded-xl flex-1 shadow-sm">
            <div className="flex items-center gap-3 md:gap-4 mb-6">
              <div className="bg-tertiary-container/10 p-2 md:p-3 rounded-full text-on-tertiary-container">
                <Camera size={20} className="md:w-6 md:h-6" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold font-headline">Registros Visuais</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 h-full pb-4 md:pb-8">
              <input type="file" ref={frontalInputRef} onChange={handleFrontalUpload} className="hidden" accept="image/*" />
              <input type="file" ref={profileInputRef} onChange={handleProfileUpload} className="hidden" accept="image/*" />
              
              <div 
                onClick={() => frontalInputRef.current?.click()}
                className="aspect-[3/4] bg-surface-container-lowest rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-on-surface-variant/20 group hover:border-primary transition-colors cursor-pointer overflow-hidden relative"
              >
                {frontalImage ? (
                  <img src={frontalImage} alt="Vista Frontal" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="text-on-surface-variant/30 mb-2 group-hover:text-primary transition-colors" size={24} />
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase text-center px-2 group-hover:text-primary transition-colors">Vista Frontal</p>
                  </>
                )}
              </div>
              <div 
                onClick={() => profileInputRef.current?.click()}
                className="aspect-[3/4] bg-surface-container-lowest rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-on-surface-variant/20 group hover:border-primary transition-colors cursor-pointer overflow-hidden relative"
              >
                {profileImage ? (
                  <img src={profileImage} alt="Vista Perfil" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="text-on-surface-variant/30 mb-2 group-hover:text-primary transition-colors" size={24} />
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase text-center px-2 group-hover:text-primary transition-colors">Vista Perfil</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} className="col-span-12 bg-surface-container-lowest p-6 md:p-10 rounded-xl shadow-sm border border-on-surface-variant/5">
          <div className="flex items-center gap-3 md:gap-4 mb-8 md:mb-10">
            <div className="bg-primary-container/10 p-2 md:p-3 rounded-full text-primary">
              <Ruler size={20} className="md:w-6 md:h-6" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-headline text-on-surface">Perimetria Completa</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
            <div className="space-y-6 md:space-y-8">
              <h3 className="text-base md:text-lg font-bold border-l-4 border-primary pl-3 text-primary font-headline">Tronco</h3>
              <div className="space-y-4 md:space-y-6">
                {['Pescoço', 'Ombros', 'Tórax Relaxado', 'Tórax Inspirado'].map(label => (
                  <div key={label} className="group">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase">{label}</label>
                    <input type="number" value={perimetry[label] || ''} onChange={(e) => setPerimetry({...perimetry, [label]: parseFloat(e.target.value) || 0})} placeholder="--" className="w-full bg-transparent border-b border-on-surface-variant/10 focus:border-primary py-2 outline-none transition-all text-sm md:text-base print:border-b-0 print:border-black/20" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-6 md:space-y-8">
              <h3 className="text-base md:text-lg font-bold border-l-4 border-primary pl-3 text-primary font-headline">Abdômen</h3>
              <div className="space-y-4 md:space-y-6">
                <div className="group">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Cintura</label>
                  <input type="number" value={basicData.waist || ''} onChange={(e) => setBasicData(prev => ({...prev, waist: parseFloat(e.target.value) || 0}))} placeholder="--" className="w-full bg-transparent border-b border-on-surface-variant/10 focus:border-primary py-2 outline-none transition-all text-sm md:text-base print:border-b-0 print:border-black/20" />
                </div>
                <div className="group">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Abdominal (Umbilical)</label>
                  <input type="number" value={perimetry['Abdominal (Umbilical)'] || ''} onChange={(e) => setPerimetry({...perimetry, 'Abdominal (Umbilical)': parseFloat(e.target.value) || 0})} placeholder="--" className="w-full bg-transparent border-b border-on-surface-variant/10 focus:border-primary py-2 outline-none transition-all text-sm md:text-base print:border-b-0 print:border-black/20" />
                </div>
                <div className="group">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Quadril</label>
                  <input type="number" value={basicData.hip || ''} onChange={(e) => setBasicData(prev => ({...prev, hip: parseFloat(e.target.value) || 0}))} placeholder="--" className="w-full bg-transparent border-b border-on-surface-variant/10 focus:border-primary py-2 outline-none transition-all text-sm md:text-base print:border-b-0 print:border-black/20" />
                </div>
              </div>
            </div>
            <div className="space-y-6 md:space-y-8">
              <h3 className="text-base md:text-lg font-bold border-l-4 border-primary pl-3 text-primary font-headline">Membros Sup.</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                {['Braço Relax. Esq.', 'Braço Relax. Dir.', 'Braço Cont. Esq.', 'Braço Cont. Dir.', 'Antebraço Esq.', 'Antebraço Dir.'].map(label => (
                  <div key={label} className="group">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase truncate block" title={label}>{label}</label>
                    <input type="number" value={perimetry[label] || ''} onChange={(e) => setPerimetry({...perimetry, [label]: parseFloat(e.target.value) || 0})} placeholder="cm" className="w-full bg-transparent border-b border-on-surface-variant/10 focus:border-primary py-2 outline-none text-sm transition-all print:border-b-0 print:border-black/20" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-6 md:space-y-8">
              <h3 className="text-base md:text-lg font-bold border-l-4 border-primary pl-3 text-primary font-headline">Membros Inf.</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                {['Coxa Prox. Esq.', 'Coxa Prox. Dir.', 'Coxa Méd. Esq.', 'Coxa Méd. Dir.', 'Coxa Dist. Esq.', 'Coxa Dist. Dir.', 'Pantur. Esq.', 'Pantur. Dir.'].map(label => (
                  <div key={label} className="group">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase truncate block" title={label}>{label}</label>
                    <input type="number" value={perimetry[label] || ''} onChange={(e) => setPerimetry({...perimetry, [label]: parseFloat(e.target.value) || 0})} placeholder="cm" className="w-full bg-transparent border-b border-on-surface-variant/10 focus:border-primary py-2 outline-none text-sm transition-all print:border-b-0 print:border-black/20" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="fixed bottom-4 right-4 md:bottom-10 md:right-10 flex gap-4 md:gap-6 z-40 print:hidden">
        <div className="bg-surface-container-lowest/90 backdrop-blur shadow-2xl p-4 md:p-6 rounded-lg flex items-center gap-4 md:gap-6 border border-on-surface-variant/10">
          <div className="text-center">
            <p className="text-[10px] md:text-xs font-bold text-on-surface-variant uppercase">Gordura Est.</p>
            <p className="text-xl md:text-2xl font-extrabold text-primary">{results.bodyFat}%</p>
          </div>
          <div className="w-px h-8 md:h-10 bg-on-surface-variant/10"></div>
          <div className="text-center">
            <p className="text-[10px] md:text-xs font-bold text-on-surface-variant uppercase">Massa Magra</p>
            <p className="text-xl md:text-2xl font-extrabold text-on-surface">{results.leanMass} kg</p>
          </div>
        </div>
      </div>
      </>
      )}
    </motion.div>
  );
}
