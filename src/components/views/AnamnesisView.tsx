import { Save } from 'lucide-react';
import { motion } from 'motion/react';
import { Patient } from '../../types';
import { ToastType } from '../../App';

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
  const handleSave = () => {
    showToast?.('Anamnese salva com sucesso!', 'success');
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-5xl mx-auto space-y-8 pb-12"
    >
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-on-surface font-headline tracking-tight">Anamnese Completa</h2>
          <p className="text-sm md:text-base text-on-surface-variant mt-1">Preencha os dados detalhados do paciente para uma avaliação precisa.</p>
        </div>
        <button 
          onClick={handleSave}
          className="w-full sm:w-auto primary-gradient text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-bold shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <Save size={20} />
          Salvar Anamnese
        </button>
      </motion.div>

      {/* 01. DADOS IDENTIFICATÓRIOS */}
      <motion.section variants={item} className="bg-white p-5 md:p-8 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 md:mb-6 border-l-4 border-primary pl-3 md:pl-4">01. DADOS IDENTIFICATÓRIOS</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2 space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nome Completo</label>
            <input 
              type="text" 
              defaultValue={activePatient?.name || ''}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Idade</label>
            <input 
              type="number" 
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Data de Nasc.</label>
            <input 
              type="date" 
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50 text-gray-700"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gênero</label>
            <select className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50 text-gray-700">
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
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Telefone</label>
            <input 
              type="text" 
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</label>
            <input 
              type="email" 
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>

          <div className="lg:col-span-4 space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Motivo Principal da Consulta</label>
            <textarea 
              rows={3}
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
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50 resize-none"
            ></textarea>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Histórico Familiar</label>
            <textarea 
              rows={2}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50 resize-none"
            ></textarea>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Uso de Medicamentos Contínuos</label>
            <textarea 
              rows={2}
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50 resize-none"
            ></textarea>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Cirurgias Anteriores</label>
            <input 
              type="text" 
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Uso de Suplementos</label>
            <textarea 
              rows={1}
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
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Intolerâncias (Glúten, Lactose, etc.)</label>
            <input 
              type="text" 
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Funcionamento Intestinal (Escala de Bristol)</label>
            <select className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50 text-gray-700">
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
            <select className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50 text-gray-700">
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
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nível de Estresse</label>
            <select className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50 text-gray-700">
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
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50 resize-none"
            ></textarea>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Consumo de Álcool</label>
            <input 
              type="text" 
              placeholder="Ex: Finais de semana, 2 taças de vinho"
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tabagismo</label>
            <input 
              type="text" 
              placeholder="Ex: Não fumante / 10 cigarros por dia"
              className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none transition-all bg-gray-50"
            />
          </div>
        </div>
      </motion.section>

    </motion.div>
  );
}
