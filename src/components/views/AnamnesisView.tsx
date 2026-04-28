import React, { useState, useEffect } from 'react';
import { Save, Printer } from 'lucide-react';
import { motion } from 'motion/react';
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

export default function AnamnesisView({ activePatient, showToast }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [anamnesisData, setAnamnesisData] = useState<any>({});
  const [anamnesisId, setAnamnesisId] = useState<string | null>(null);

  useEffect(() => {
    if (activePatient) {
      loadAnamnesis();
    }
  }, [activePatient]);

  const loadAnamnesis = async () => {
    const { data } = await supabase
      .from('anamnesis')
      .select('*')
      .eq('patient_id', activePatient!.id)
      .maybeSingle();

    if (data) {
      setAnamnesisId(data.id);
      setAnamnesisData(data.data || {});
    } else {
      setAnamnesisId(null);
      setAnamnesisData({});
    }
  };

  const handleSave = async () => {
    if (!activePatient) return;
    setIsSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const payload = {
      nutri_id: user?.id,
      patient_id: activePatient.id,
      data: anamnesisData,
      updated_at: new Date().toISOString()
    };

    if (anamnesisId) {
      const { error } = await supabase.from('anamnesis').update(payload).eq('id', anamnesisId);
      if (!error) showToast?.('Anamnese atualizada com sucesso!', 'success');
      else showToast?.('Erro ao atualizar. Verifique se a tabela "anamnesis" existe.', 'error');
    } else {
      const { data, error } = await supabase.from('anamnesis').insert([payload]).select().single();
      if (data) {
        setAnamnesisId(data.id);
        showToast?.('Anamnese salva com sucesso!', 'success');
      } else if (error) {
        showToast?.('Erro ao salvar. Verifique se a tabela "anamnesis" existe.', 'error');
      }
    }
    setIsSaving(false);
  };

  const handleChange = (field: string, value: any) => {
    setAnamnesisData((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-5xl mx-auto space-y-8 pb-12"
    >
      {/* Print Header */}
      <div className="hidden print:block text-center pb-4 mb-8" style={{ borderBottom: '2px solid #000' }}>
        <h1 className="text-2xl font-extrabold uppercase tracking-widest mb-2">Ficha de Anamnese Clínica</h1>
        <h2 className="text-lg font-bold">Paciente: {activePatient?.name || anamnesisData.fullName || '---'}</h2>
        <div className="flex justify-center gap-8 mt-2 text-sm">
          <p><strong>ID:</strong> #{activePatient?.id || '---'}</p>
          <p><strong>Data:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8 print:hidden">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-on-surface font-headline tracking-tight">Anamnese Completa</h2>
          <p className="text-sm md:text-base text-on-surface-variant mt-1">Preencha os dados detalhados do paciente para uma avaliação precisa.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => window.print()}
            className="w-12 md:w-14 h-12 md:h-[56px] border border-primary/20 text-primary rounded-full flex items-center justify-center hover:bg-primary/5 active:scale-95 transition-all print:hidden"
            title="Imprimir Anamnese"
          >
            <Printer size={20} />
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 sm:w-auto primary-gradient text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-bold shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 print:hidden"
          >
            <Save size={20} />
            {isSaving ? 'Salvando...' : 'Salvar Anamnese'}
          </button>
        </div>
      </motion.div>

      {/* 01. DADOS IDENTIFICATÓRIOS */}
      <motion.section variants={item} className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 md:mb-6 border-l-4 border-primary pl-3 md:pl-4">01. DADOS IDENTIFICATÓRIOS</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2 space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nome Completo</label>
            <input 
              type="text" 
              value={anamnesisData.fullName ?? activePatient?.name ?? ''}
              onChange={e => handleChange('fullName', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Idade</label>
            <input 
              type="number" 
              value={anamnesisData.age ?? ''}
              onChange={e => handleChange('age', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Data de Nasc.</label>
            <input 
              type="date" 
              value={anamnesisData.birthDate ?? ''}
              onChange={e => handleChange('birthDate', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50 text-gray-700"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gênero</label>
            <select 
              value={anamnesisData.gender ?? ''}
              onChange={e => handleChange('gender', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50 text-gray-700"
            >
              <option value="">Selecione...</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="O">Outro</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Profissão</label>
            <input 
              type="text" 
              value={anamnesisData.profession ?? ''}
              onChange={e => handleChange('profession', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Telefone</label>
            <input 
              type="text" 
              value={anamnesisData.phone ?? ''}
              onChange={e => handleChange('phone', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</label>
            <input 
              type="email" 
              value={anamnesisData.email ?? ''}
              onChange={e => handleChange('email', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>

          <div className="lg:col-span-4 space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Motivo Principal da Consulta</label>
            <textarea 
              rows={3}
              value={anamnesisData.mainReason ?? ''}
              onChange={e => handleChange('mainReason', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50 resize-none"
            ></textarea>
          </div>
        </div>
      </motion.section>

      {/* 02. HISTÓRICO CLÍNICO E PATOLÓGICO */}
      <motion.section variants={item} className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 md:mb-6 border-l-4 border-primary pl-3 md:pl-4">02. HISTÓRICO CLÍNICO E PATOLÓGICO</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Doenças Pré-existentes (Diabetes, Hipertensão, etc.)</label>
            <textarea 
              rows={2}
              value={anamnesisData.diseases ?? ''}
              onChange={e => handleChange('diseases', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50 resize-none"
            ></textarea>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Histórico Familiar</label>
            <textarea 
              rows={2}
              value={anamnesisData.familyHistory ?? ''}
              onChange={e => handleChange('familyHistory', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50 resize-none"
            ></textarea>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Uso de Medicamentos Contínuos</label>
            <textarea 
              rows={2}
              value={anamnesisData.medications ?? ''}
              onChange={e => handleChange('medications', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50 resize-none"
            ></textarea>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cirurgias Anteriores</label>
            <input 
              type="text" 
              value={anamnesisData.surgeries ?? ''}
              onChange={e => handleChange('surgeries', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Uso de Suplementos</label>
            <textarea 
              rows={1}
              value={anamnesisData.supplements ?? ''}
              onChange={e => handleChange('supplements', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50 resize-none"
            ></textarea>
          </div>
        </div>
      </motion.section>

      {/* 03. SAÚDE GASTROINTESTINAL */}
      <motion.section variants={item} className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 md:mb-6 border-l-4 border-primary pl-3 md:pl-4">03. SAÚDE GASTROINTESTINAL</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Alergias Alimentares</label>
            <input 
              type="text" 
              value={anamnesisData.allergies ?? ''}
              onChange={e => handleChange('allergies', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Intolerâncias (Glúten, Lactose, etc.)</label>
            <input 
              type="text" 
              value={anamnesisData.intolerances ?? ''}
              onChange={e => handleChange('intolerances', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Funcionamento Intestinal (Escala de Bristol)</label>
            <select 
              value={anamnesisData.bristolScale ?? ''}
              onChange={e => handleChange('bristolScale', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50 text-gray-700"
            >
              <option value="">Selecione...</option>
              <option value="1">Tipo 1: Caroços duros e separados</option>
              <option value="2">Tipo 2: Forma de salsicha, mas grumoso</option>
              <option value="3">Tipo 3: Como salsicha, com rachaduras</option>
              <option value="4">Tipo 4: Como salsicha ou cobra, liso e macio</option>
              <option value="5">Tipo 5: Bolhas macias com bordas nítidas</option>
              <option value="6">Tipo 6: Pedaços fofos com bordas irregulares</option>
              <option value="7">Tipo 7: Aquoso, sem pedaços sólidos</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Digestão (Azia, Refluxo, Empachamento)</label>
            <input 
              type="text" 
              value={anamnesisData.digestion ?? ''}
              onChange={e => handleChange('digestion', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>
        </div>
      </motion.section>

      {/* 04. ESTILO DE VIDA E HÁBITOS */}
      <motion.section variants={item} className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 md:mb-6 border-l-4 border-primary pl-3 md:pl-4">04. ESTILO DE VIDA E HÁBITOS</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Qualidade do Sono</label>
            <select 
              value={anamnesisData.sleepQuality ?? ''}
              onChange={e => handleChange('sleepQuality', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50 text-gray-700"
            >
              <option value="">Selecione...</option>
              <option value="excelente">Excelente</option>
              <option value="boa">Boa</option>
              <option value="regular">Regular</option>
              <option value="ruim">Ruim</option>
              <option value="pessima">Péssima</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Horas de Sono/Noite</label>
            <input 
              type="number" 
              value={anamnesisData.sleepHours ?? ''}
              onChange={e => handleChange('sleepHours', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nível de Estresse</label>
            <select 
              value={anamnesisData.stressLevel ?? ''}
              onChange={e => handleChange('stressLevel', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50 text-gray-700"
            >
              <option value="">Selecione...</option>
              <option value="baixo">Baixo</option>
              <option value="moderado">Moderado</option>
              <option value="alto">Alto</option>
              <option value="muito_alto">Muito Alto</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Prática de Atividade Física (Tipo e Frequência)</label>
            <textarea 
              rows={1}
              value={anamnesisData.physicalActivity ?? ''}
              onChange={e => handleChange('physicalActivity', e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50 resize-none"
            ></textarea>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Consumo de Álcool</label>
            <input 
              type="text" 
              value={anamnesisData.alcohol ?? ''}
              onChange={e => handleChange('alcohol', e.target.value)}
              placeholder="Ex: Finais de semana, 2 taças de vinho"
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tabagismo</label>
            <input 
              type="text" 
              value={anamnesisData.smoking ?? ''}
              onChange={e => handleChange('smoking', e.target.value)}
              placeholder="Ex: Não fumante / 10 cigarros por dia"
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>
        </div>
      </motion.section>

    </motion.div>
  );
}
