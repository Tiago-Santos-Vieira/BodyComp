import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Activity, ArrowUpRight, ArrowDownRight, Minus, Scale } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
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

interface ProcessedAssessment {
  id: string;
  dateStr: string;
  timestamp: number;
  weight: number;
  bodyFat: number;
  leanMass: number;
  fatMass: number;
  skinfolds: number[];
  perimetry: Record<string, number>;
}

const skinfoldLabels = [
  'Dobra Subescapular', 'Dobra Tricipital', 'Dobra Peitoral', 
  'Dobra Axilar Média', 'Dobra Supra-ilíaca', 'Dobra Abdominal', 'Dobra Coxa'
];

export default function EvolutionView({ activePatient, showToast }: Props) {
  const [history, setHistory] = useState<ProcessedAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'weight' | 'fat'>('weight');

  // Seletores para o comparativo detalhado
  const [date1Id, setDate1Id] = useState<string>('');
  const [date2Id, setDate2Id] = useState<string>('');

  useEffect(() => {
    if (activePatient) {
      loadEvolutionData();
    }
  }, [activePatient]);

  const loadEvolutionData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('id, date, basic_data, skinfolds, perimetry')
        .eq('patient_id', activePatient!.id)
        .order('date', { ascending: true }); 

      if (error) throw error;

      if (data) {
        const processed: ProcessedAssessment[] = data.map((entry) => {
          const basic = entry.basic_data || { weight: 0, age: 0, gender: 'M' };
          const skinfolds = entry.skinfolds || Array(7).fill(0);
          const perimetry = entry.perimetry || {};
          
          const weight = basic.weight || 0;
          const age = basic.age || 0;
          const gender = basic.gender || 'M';

          const sumSkinfolds = skinfolds.reduce((a: number, b: number) => a + b, 0);
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
              bodyFat = Math.max(0, Math.min(100, bodyFat));
            }
          }

          const fatMass = (weight * bodyFat) / 100;
          const leanMass = weight - fatMass;

          return {
            id: entry.id,
            dateStr: new Date(entry.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
            timestamp: new Date(entry.date).getTime(),
            weight: parseFloat(weight.toFixed(1)),
            bodyFat: parseFloat(bodyFat.toFixed(1)),
            leanMass: parseFloat(leanMass.toFixed(1)),
            fatMass: parseFloat(fatMass.toFixed(1)),
            skinfolds,
            perimetry
          };
        });

        setHistory(processed);
        
        // Auto-select as duas ultimas para o comparador detalhado
        if (processed.length >= 2) {
          setDate1Id(processed[processed.length - 2].id);
          setDate2Id(processed[processed.length - 1].id);
        } else if (processed.length === 1) {
          setDate1Id(processed[0].id);
          setDate2Id(processed[0].id);
        }
      }
    } catch (err: any) {
      showToast?.('Erro ao carregar dados: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const comparison = useMemo(() => {
    if (history.length < 2) return null;
    const latest = history[history.length - 1];
    const previous = history[history.length - 2];

    return {
      weightDiff: (latest.weight - previous.weight).toFixed(1),
      fatDiff: (latest.bodyFat - previous.bodyFat).toFixed(1),
      leanDiff: (latest.leanMass - previous.leanMass).toFixed(1),
    };
  }, [history]);

  // Obtem os objetos exatos para a tabela comparativa avançada
  const comp1 = useMemo(() => history.find(h => h.id === date1Id), [history, date1Id]);
  const comp2 = useMemo(() => history.find(h => h.id === date2Id), [history, date2Id]);

  const renderComparisonIndicator = (diffValue: string, invertColors = false, unit = '') => {
    const val = parseFloat(diffValue);
    if (isNaN(val)) return <span className="text-on-surface-variant font-medium text-sm">--</span>;
    if (val === 0) return <span className="flex items-center text-on-surface-variant font-bold text-sm"><Minus size={16} className="mr-1" /> Manteve</span>;
    
    const isPositive = val > 0;
    // Para dobras e gordura, cair é bom (isGood = true se negativo). Para massa magra, subir é bom.
    const isGood = invertColors ? isPositive : !isPositive;
    const colorClass = isGood ? 'text-primary' : 'text-error';
    const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
    const prefix = isPositive ? '+' : '';

    return (
      <span className={`flex items-center font-bold text-sm ${colorClass}`}>
        <Icon size={16} className="mr-1" />
        {prefix}{diffValue}{unit}
      </span>
    );
  };

  const renderTableRow = (label: string, val1: number | undefined, val2: number | undefined, unit: string, invertColors = false) => {
    const v1 = val1 || 0;
    const v2 = val2 || 0;
    const diff = (v2 - v1).toFixed(1);
    
    return (
      <div key={label} className="grid grid-cols-4 gap-4 py-3 border-b border-on-surface-variant/10 items-center hover:bg-surface-container-low transition-colors px-2">
        <span className="text-sm font-bold text-on-surface col-span-1">{label}</span>
        <span className="text-sm text-on-surface-variant font-medium text-center">{v1 > 0 ? `${v1} ${unit}` : '--'}</span>
        <span className="text-sm text-on-surface-variant font-medium text-center">{v2 > 0 ? `${v2} ${unit}` : '--'}</span>
        <div className="flex justify-end pr-2">
          {v1 > 0 && v2 > 0 ? renderComparisonIndicator(diff, invertColors, unit) : <span className="text-on-surface-variant text-sm">--</span>}
        </div>
      </div>
    );
  };

  if (!activePatient) return null;

  // Lista unificada de todas as chaves de perimetria presentes nestas duas avaliações para renderizar a tabela
  const perimetryKeys = Array.from(new Set([
    ...(comp1 ? Object.keys(comp1.perimetry) : []),
    ...(comp2 ? Object.keys(comp2.perimetry) : [])
  ])).sort();

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 md:space-y-12 pb-24 md:pb-12"
    >
      <motion.header variants={item} className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-1 md:mb-2 font-headline flex items-center gap-3">
            <TrendingUp className="text-primary" size={32} />
            Evolução Física
          </h1>
          <p className="text-sm md:text-base text-on-surface-variant font-medium">Paciente: <span className="text-on-surface">{activePatient?.name}</span></p>
        </div>
      </motion.header>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-8 h-8 md:w-12 md:h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : history.length === 0 ? (
        <motion.div variants={item} className="bg-surface-container-low p-12 rounded-2xl text-center shadow-sm">
          <Activity size={48} className="mx-auto text-on-surface-variant/30 mb-4" />
          <h2 className="text-xl font-bold font-headline mb-2 text-on-surface">Nenhum dado encontrado</h2>
          <p className="text-on-surface-variant">Realize a primeira avaliação física do paciente para visualizar o histórico de evolução.</p>
        </motion.div>
      ) : (
        <>
          {/* Cards Rápidos */}
          {comparison && (
            <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-surface-container-lowest border border-on-surface-variant/10 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Peso Corporal</p>
                <div className="flex justify-between items-end">
                  <p className="text-3xl font-black text-on-surface">{history[history.length - 1].weight} <span className="text-base font-medium opacity-70">kg</span></p>
                  {renderComparisonIndicator(comparison.weightDiff, false, 'kg')}
                </div>
              </div>
              
              <div className="bg-surface-container-lowest border border-on-surface-variant/10 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Percentual de Gordura</p>
                <div className="flex justify-between items-end">
                  <p className="text-3xl font-black text-on-surface">{history[history.length - 1].bodyFat} <span className="text-base font-medium opacity-70">%</span></p>
                  {renderComparisonIndicator(comparison.fatDiff, false, '%')}
                </div>
              </div>

              <div className="bg-surface-container-lowest border border-on-surface-variant/10 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Massa Magra</p>
                <div className="flex justify-between items-end">
                  <p className="text-3xl font-black text-on-surface">{history[history.length - 1].leanMass} <span className="text-base font-medium opacity-70">kg</span></p>
                  {renderComparisonIndicator(comparison.leanDiff, true, 'kg')}
                </div>
              </div>
            </motion.div>
          )}

          {!comparison && history.length === 1 && (
            <motion.div variants={item} className="bg-primary-container text-on-primary-container p-4 rounded-xl shadow-sm flex items-center gap-3">
              <Activity size={20} />
              <p className="font-medium text-sm">O paciente possui apenas 1 avaliação. Realize mais avaliações para visualizar comparativos.</p>
            </motion.div>
          )}

          {/* Gráfico Principal */}
          <motion.div variants={item} className="bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-sm border border-on-surface-variant/5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <h2 className="text-xl font-bold font-headline">Curva de Desempenho</h2>
              <div className="flex bg-surface-container-low p-1 rounded-full">
                <button 
                  onClick={() => setActiveTab('weight')}
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${activeTab === 'weight' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Peso (kg)
                </button>
                <button 
                  onClick={() => setActiveTab('fat')}
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${activeTab === 'fat' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Gordura (%)
                </button>
              </div>
            </div>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={activeTab === 'weight' ? '#3eb489' : '#ef817d'} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={activeTab === 'weight' ? '#3eb489' : '#ef817d'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888888" opacity={0.2} />
                  <XAxis 
                    dataKey="dateStr" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#888888', fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: '#888888', fontSize: 12, fontWeight: 500 }}
                  />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#191c1d', color: '#fff', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                    labelStyle={{ color: '#888', marginBottom: '4px', fontSize: '12px' }}
                    formatter={(value: number) => [`${value} ${activeTab === 'weight' ? 'kg' : '%'}`, activeTab === 'weight' ? 'Peso' : 'Gordura']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey={activeTab === 'weight' ? 'weight' : 'bodyFat'} 
                    stroke={activeTab === 'weight' ? '#3eb489' : '#ef817d'} 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Comparador Lado a Lado */}
          {history.length >= 2 && (
            <motion.div variants={item} className="bg-surface-container-lowest rounded-2xl shadow-sm border border-on-surface-variant/5 overflow-hidden">
              <div className="p-6 md:p-8 bg-surface-container-low border-b border-on-surface-variant/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-primary/10 p-2 rounded-full text-primary">
                    <Scale size={24} />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold font-headline text-on-surface">Comparativo Lado a Lado</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Avaliação Base</label>
                    <select 
                      value={date1Id} 
                      onChange={e => setDate1Id(e.target.value)}
                      className="w-full bg-surface border border-on-surface-variant/20 rounded-lg px-4 py-3 text-on-surface font-bold outline-none focus:ring-2 focus:ring-primary transition-all"
                    >
                      {history.map(h => (
                        <option key={h.id} value={h.id}>{h.dateStr}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Comparar Com</label>
                    <select 
                      value={date2Id} 
                      onChange={e => setDate2Id(e.target.value)}
                      className="w-full bg-surface border border-on-surface-variant/20 rounded-lg px-4 py-3 text-on-surface font-bold outline-none focus:ring-2 focus:ring-primary transition-all"
                    >
                      {history.map(h => (
                        <option key={h.id} value={h.id}>{h.dateStr}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {comp1 && comp2 ? (
                <div className="p-6 md:p-8 space-y-10">
                  {/* HEADER TABELA */}
                  <div className="grid grid-cols-4 gap-4 pb-2 border-b-2 border-on-surface-variant/20 px-2">
                    <span className="text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-widest col-span-1">Métrica</span>
                    <span className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-widest text-center">{comp1.dateStr}</span>
                    <span className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-widest text-center">{comp2.dateStr}</span>
                    <span className="text-[10px] md:text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right">Diferença</span>
                  </div>

                  {/* SESSAO: COMPOSICAO BASICA */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold font-headline text-on-surface mb-4">Composição Corporal</h3>
                    {renderTableRow("Peso Total", comp1.weight, comp2.weight, "kg", false)}
                    {renderTableRow("Gordura Corporal", comp1.bodyFat, comp2.bodyFat, "%", false)}
                    {renderTableRow("Massa Gorda", comp1.fatMass, comp2.fatMass, "kg", false)}
                    {renderTableRow("Massa Magra", comp1.leanMass, comp2.leanMass, "kg", true)}
                  </div>

                  {/* SESSAO: DOBRAS CUTANEAS */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold font-headline text-on-surface mb-4 mt-6">Dobras Cutâneas (mm)</h3>
                    {skinfoldLabels.map((label, idx) => 
                      renderTableRow(label, comp1.skinfolds[idx], comp2.skinfolds[idx], "mm", false)
                    )}
                  </div>

                  {/* SESSAO: PERIMETRIA */}
                  {perimetryKeys.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold font-headline text-on-surface mb-4 mt-6">Perimetria (cm)</h3>
                      {perimetryKeys.map((key) => {
                        // Redução de cintura e abdomen é verde. Redução de braço contraído é vermelho.
                        // Para simplificar: tratamos invertColors = false para tudo (perder medida = verde). 
                        // Idealmente o nutricionista analisa, mas a redução na cor verde faz sentido clínico para a maioria das medidas em emagrecimento.
                        return renderTableRow(key, comp1.perimetry[key], comp2.perimetry[key], "cm", false);
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center text-on-surface-variant">
                  <p>Selecione duas avaliações para visualizar o comparativo detalhado.</p>
                </div>
              )}
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
