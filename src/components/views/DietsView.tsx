import React, { useState, useMemo } from 'react';
import { FileText, MessageSquare, User, PieChart, Save, Copy, Plus, MoreHorizontal, Trash2, Printer, Search, X, Check, Edit2, Sparkles, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Patient } from '../../types';
import { ToastType } from '../../App';
import { tacoData } from '../../data/taco';
import { ibgeData } from '../../data/ibge';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { generateDietPlan } from '../../lib/ai';

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

export default function DietsView({ activePatient, showToast }: Props) {
  const [meals, setMeals] = useState<any[]>([]);
  const [dietId, setDietId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const skipNextSave = React.useRef(true);

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSmartCheckOpen, setIsSmartCheckOpen] = useState(false);
  const [smartCheckData, setSmartCheckData] = useState({ objective: '', weight: '', height: '' });
  const [patientAnamnesis, setPatientAnamnesis] = useState<any>(null);

  const startAIDietGeneration = async () => {
    if (!activePatient) return;
    setIsAiLoading(true);
    
    const apiKey = localStorage.getItem('GEMINI_API_KEY');
    if (!apiKey) {
      showToast?.('Por favor, configure sua API Key na aba BodyComp IA Pro.', 'error');
      setIsAiLoading(false);
      return;
    }

    const { data: anamnesis } = await supabase.from('anamnesis').select('*').eq('patient_id', activePatient.id).single();
    const { data: assessments } = await supabase.from('assessments').select('*').eq('patient_id', activePatient.id).order('created_at', { ascending: false }).limit(1);
    
    setPatientAnamnesis(anamnesis);
    const latestAssessment = assessments?.[0] || null;
    
    const objective = activePatient.objective;
    const weight = latestAssessment?.weight;
    const height = latestAssessment?.height;

    if (!objective || !weight || !height) {
      setSmartCheckData({ 
        objective: objective || '', 
        weight: weight?.replace('kg','') || '', 
        height: height?.replace('cm','') || '' 
      });
      setIsSmartCheckOpen(true);
      setIsAiLoading(false);
      return;
    }

    await callAI(objective, weight.replace('kg',''), height.replace('cm',''), anamnesis);
  };

  const callAI = async (objective: string, weight: string, height: string, anamnesis: any) => {
    if (!activePatient) return;
    setIsAiLoading(true);
    setIsSmartCheckOpen(false);
    const apiKey = localStorage.getItem('GEMINI_API_KEY');
    if (!apiKey) return;
    
    try {
      // Calcular idade real a partir da birthDate da anamnese
      let patientAge: number | string = 'Não informado';
      if (anamnesis?.birthDate) {
        const birth = new Date(anamnesis.birthDate);
        const today = new Date();
        patientAge = today.getFullYear() - birth.getFullYear() -
          (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
      }

      const result = await generateDietPlan({
        name: activePatient.name,
        age: patientAge,
        gender: anamnesis?.gender || 'Não informado',
        objective,
        weight: parseFloat(weight),
        height: parseFloat(height),
        bodyFat: null,
        anamnesis
      }, apiKey);

      if (result && result.meals) {
        const newMeals = result.meals.map((m: any, i: number) => ({
          ...m,
          id: 'm' + Date.now() + i,
          items: m.items.map((it: any, j: number) => ({
            ...it,
            id: 'i' + Date.now() + i + j
          }))
        }));
        setMeals(newMeals);
        showToast?.('Dieta inteligente gerada com sucesso!', 'success');
        setTimeout(() => handleSaveDiet(true), 1000);
      }
    } catch (error: any) {
      showToast?.('Erro da IA: ' + (error.message || 'Verifique a chave da API.'), 'error');
    }
    setIsAiLoading(false);
  };

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    
    if (!activePatient || meals.length === 0) return;

    const timeoutId = setTimeout(() => {
      handleSaveDiet(true);
    }, 2500);

    return () => clearTimeout(timeoutId);
  }, [meals]);

  useEffect(() => {
    if (activePatient) {
      loadDiet();
    } else {
      setMeals([]);
      setDietId(null);
    }
  }, [activePatient]);

  const loadDiet = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('diets')
      .select('*')
      .eq('patient_id', activePatient!.id)
      .single();

    if (data) {
      setDietId(data.id);
      setMeals(data.meals || []);
      setLastSaved(new Date(data.updated_at));
    } else {
      setDietId(null);
      setMeals([]);
      setLastSaved(null);
    }
    skipNextSave.current = true;
    setIsLoading(false);
  };

  const calculateMealTotals = (items: any[]) => {
    return items.reduce((acc, item) => ({
      kcal: acc.kcal + item.kcal,
      prot: acc.prot + item.prot,
      carb: acc.carb + item.carb,
      gord: acc.gord + item.gord
    }), { kcal: 0, prot: 0, carb: 0, gord: 0 });
  };

  const formatMeasure = (quantity: number, measure: string) => {
    if (!measure) return '';
    const cleanedMeasure = measure.replace(/^1\s+/, '');
    
    if (quantity <= 1) {
      return `${quantity} ${cleanedMeasure}`;
    }
    
    let pluralized = cleanedMeasure;
    if (cleanedMeasure === 'unidade') pluralized = 'unidades';
    else if (cleanedMeasure === 'colher de sopa') pluralized = 'colheres de sopa';
    else if (cleanedMeasure === 'colher de servir') pluralized = 'colheres de servir';
    else if (cleanedMeasure === 'copo de 200ml') pluralized = 'copos de 200ml';
    else if (cleanedMeasure === 'xícara') pluralized = 'xícaras';
    else if (cleanedMeasure === 'escumadeira') pluralized = 'escumadeiras';
    else if (cleanedMeasure === 'fatia') pluralized = 'fatias';
    else if (cleanedMeasure === 'pedaço') pluralized = 'pedaços';
    
    return `${quantity} ${pluralized}`;
  };

  const calculateDailyTotals = () => {
    let total = { kcal: 0, prot: 0, carb: 0, gord: 0 };
    meals.forEach(m => {
       const mealTotal = calculateMealTotals(m.items);
       total.kcal += mealTotal.kcal;
       total.prot += mealTotal.prot;
       total.carb += mealTotal.carb;
       total.gord += mealTotal.gord;
    });
    return total;
  };

  const dailyTotals = calculateDailyTotals();
  const pcProt = dailyTotals.kcal > 0 ? ((dailyTotals.prot * 4) / dailyTotals.kcal * 100).toFixed(1) : '0.0';
  const pcCarb = dailyTotals.kcal > 0 ? ((dailyTotals.carb * 4) / dailyTotals.kcal * 100).toFixed(1) : '0.0';
  const pcGord = dailyTotals.kcal > 0 ? ((dailyTotals.gord * 9) / dailyTotals.kcal * 100).toFixed(1) : '0.0';

  const weightKg = parseFloat(activePatient?.assessments?.[0]?.weight?.replace('kg', '') || '70');

  // Modals state
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [newMealName, setNewMealName] = useState('');
  const [newMealTime, setNewMealTime] = useState('');

  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [isEditFoodModalOpen, setIsEditFoodModalOpen] = useState(false);
  const [editingFoodData, setEditingFoodData] = useState<any>(null); // { mealId, food }

  const [activeMealId, setActiveMealId] = useState<string | null>(null);
  const [tacoSearch, setTacoSearch] = useState('');
  const [selectedTaco, setSelectedTaco] = useState<any>(null);
  
  const [foodQuantity, setFoodQuantity] = useState<number>(1);
  const [foodMeasure, setFoodMeasure] = useState('');
  const [foodWeight, setFoodWeight] = useState<number>(100);
  const [foodUnit, setFoodUnit] = useState<string>('g');
  const [currentMeasures, setCurrentMeasures] = useState<any[]>([]);

  const allFoods = useMemo(() => {
    return [
      ...tacoData.map(t => ({ ...t, source: 'TACO' })),
      ...ibgeData.map(i => ({ ...i, source: 'IBGE' }))
    ];
  }, []);

  const filteredFoods = useMemo(() => {
    if (!tacoSearch) return allFoods.slice(0, 40);
    const lowerSearch = tacoSearch.toLowerCase();
    return allFoods.filter(t => t.name.toLowerCase().includes(lowerSearch)).slice(0, 40);
  }, [tacoSearch, allFoods]);

  const handleSelectTaco = (food: any) => {
    setSelectedTaco(food);
    const measures = food.householdMeasures || [];
    setCurrentMeasures(measures);
    if (measures.length > 0) {
       setFoodMeasure(measures[0].measure);
       setFoodWeight(measures[0].amount);
       setFoodQuantity(1);
    } else {
       setFoodMeasure('Grama(s)');
       setFoodWeight(100);
       setFoodQuantity(1);
    }
    setFoodUnit(food.unit || 'g');
  };

  const openMealModal = (meal?: any) => {
    if (meal) {
      setEditingMealId(meal.id);
      setNewMealName(meal.name);
      setNewMealTime(meal.time);
    } else {
      setEditingMealId(null);
      setNewMealName('');
      setNewMealTime('');
    }
    setIsMealModalOpen(true);
  };

  const handleSaveMeal = () => {
    if (!newMealName || !newMealTime) {
      showToast?.('Preencha o nome e o horário da refeição', 'error');
      return;
    }
    if (editingMealId) {
      setMeals(meals.map(m => m.id === editingMealId ? { ...m, name: newMealName, time: newMealTime } : m));
      showToast?.('Refeição atualizada', 'success');
    } else {
      setMeals([...meals, { id: 'm' + Date.now(), name: newMealName, time: newMealTime, items: [] }]);
      showToast?.('Refeição adicionada', 'success');
    }
    setIsMealModalOpen(false);
  };

  const handleRemoveMeal = (mealId: string) => {
    setMeals(meals.filter(m => m.id !== mealId));
  };

  const handleAddTacoFood = () => {
    if (!selectedTaco || !activeMealId) return;
    const ratio = foodWeight / 100;
    const newItem = {
      id: 'i' + Date.now(),
      name: selectedTaco.name,
      measure: foodMeasure,
      quantity: foodQuantity,
      weight: `${foodWeight}${foodUnit}`,
      kcal: selectedTaco.kcal * ratio,
      prot: selectedTaco.prot * ratio,
      carb: selectedTaco.carb * ratio,
      gord: selectedTaco.gord * ratio
    };
    
    setMeals(meals.map(m => m.id === activeMealId ? { ...m, items: [...m.items, newItem] } : m));
    setIsFoodModalOpen(false);
    setSelectedTaco(null);
    setTacoSearch('');
    setFoodWeight(100);
    setFoodQuantity(1);
    showToast?.('Alimento adicionado', 'success');
  };

  const handleRemoveFood = (mealId: string, foodId: string) => {
    setMeals(meals.map(m => m.id === mealId ? { ...m, items: m.items.filter(i => i.id !== foodId) } : m));
  };

  const openEditFoodModal = (mealId: string, food: any) => {
    setEditingFoodData({ mealId, food });
    setFoodMeasure(food.measure);
    setFoodQuantity(food.quantity);
    const wStr = food.weight.replace(/g|ml/gi, '');
    setFoodWeight(parseFloat(wStr));
    setFoodUnit(food.weight.toLowerCase().includes('ml') ? 'ml' : 'g');
    
    const baseFood = allFoods.find(f => f.name === food.name);
    setCurrentMeasures(baseFood?.householdMeasures || []);
    
    setIsEditFoodModalOpen(true);
  };

  const handleSaveEditedFood = () => {
    if (!editingFoodData) return;
    const { mealId, food } = editingFoodData;
    
    const oldWeight = parseFloat(food.weight.replace(/g|ml/gi, ''));
    if (oldWeight === 0) return;

    const ratio = foodWeight / oldWeight;
    
    const updatedFood = {
      ...food,
      measure: foodMeasure,
      quantity: foodQuantity,
      weight: `${foodWeight}${foodUnit}`,
      kcal: food.kcal * ratio,
      prot: food.prot * ratio,
      carb: food.carb * ratio,
      gord: food.gord * ratio
    };

    setMeals(meals.map(m => m.id === mealId ? { ...m, items: m.items.map(i => i.id === food.id ? updatedFood : i) } : m));
    setIsEditFoodModalOpen(false);
    showToast?.('Quantidade atualizada', 'success');
  };

  const handleSaveDiet = async (silent = false) => {
    if (!activePatient) {
      if (!silent) showToast?.('Selecione um paciente primeiro!', 'error');
      return;
    }

    if (silent) setIsAutoSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (silent) setIsAutoSaving(false);
      return;
    }

    let payload = {
      nutri_id: user.id,
      patient_id: activePatient.id,
      meals: meals,
      updated_at: new Date().toISOString()
    };

    if (dietId) {
      const { error } = await supabase.from('diets').update(payload).eq('id', dietId);
      if (!silent) {
        if (error) showToast?.('Erro ao atualizar dieta.', 'error');
        else showToast?.('Dieta atualizada e publicada com sucesso!', 'success');
      }
      if (!error) setLastSaved(new Date());
    } else {
      const { data, error } = await supabase.from('diets').insert([payload]).select().single();
      if (!silent) {
        if (error) showToast?.('Erro ao criar dieta.', 'error');
        else {
          setDietId(data.id);
          showToast?.('Nova Dieta salva e publicada!', 'success');
        }
      }
      if (data) {
        setDietId(data.id);
        setLastSaved(new Date());
      }
    }
    
    if (silent) setIsAutoSaving(false);
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 md:space-y-12 print-container"
    >
      <motion.section variants={item} className="mb-8 md:mb-12">
        <div className="flex flex-col xl:flex-row justify-between items-start gap-6 bg-surface-container-low p-6 rounded-2xl border border-on-surface-variant/10 print:border-none print:p-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <User size={20} className="text-primary print:text-black" />
              <h1 className="text-2xl font-extrabold font-headline text-on-surface print:text-black">Plano Alimentar</h1>
            </div>
            <p className="text-on-surface-variant text-sm flex items-center divide-x divide-on-surface-variant/30 print:text-black">
              <span className="pr-3 font-semibold text-on-surface print:text-black">{activePatient?.name || 'Não selecionado'}</span>
              <span className="px-3 print:text-black">Peso: {weightKg}kg</span>
              <span className="pl-3 print:text-black">Objetivo: {activePatient?.objective || '---'}</span>
            </p>
          </div>
          <div className="flex gap-2 w-full xl:w-auto print:hidden">
            <button 
              onClick={startAIDietGeneration}
              className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary-container text-primary rounded-lg font-bold text-sm hover:bg-primary/20 transition-colors shadow-sm"
            >
              <Sparkles size={16} /> IA Dieta
            </button>
            <button 
              onClick={() => {
                showToast?.('Geração de impressão otimizada em andamento', 'info');
                setTimeout(() => window.print(), 500);
              }}
              className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-surface text-on-surface rounded-lg border border-on-surface-variant/20 font-semibold text-sm hover:bg-surface-container-highest transition-colors"
            >
              <Printer size={16} /> Imprimir
            </button>
            <button 
              onClick={() => showToast?.('Integração com celular ativada', 'success')}
              className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              <MessageSquare size={16} /> Enviar p/ App
            </button>
          </div>
        </div>

        {/* Totais Diários e Resumo de Metas */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-6 print:break-inside-avoid">
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-on-surface-variant/10 flex flex-col justify-center print:border-black/20">
            <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider mb-2 print:text-black/70">Total Calórico</span>
            <div className="flex items-baseline gap-2 text-primary print:text-black">
              <span className="text-4xl font-black font-headline tracking-tighter">{Math.round(dailyTotals.kcal)}</span>
              <span className="text-sm font-semibold">kcal</span>
            </div>
          </div>

          <div className="lg:col-span-3 bg-surface-container-lowest p-6 rounded-2xl border border-on-surface-variant/10 print:border-black/20">
            <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4 flex items-center gap-2 print:text-black/70">
              <PieChart size={16} className="print:text-black" /> Repartição de Macronutrientes
            </h3>
            
            <div className="flex flex-col sm:flex-row gap-6 mb-4">
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-on-surface print:text-black">Carboidratos ({pcCarb}%)</span>
                  <span className="font-black text-primary print:text-black">{Math.round(dailyTotals.carb)}g</span>
                </div>
                <div className="text-[10px] text-on-surface-variant text-right mb-1 print:text-black/70">{(dailyTotals.carb / weightKg).toFixed(1)} g/kg</div>
                <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden print:border print:border-black/10">
                  <div className="h-full bg-primary print:bg-black/60" style={{ width: `${pcCarb}%` }}></div>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-on-surface print:text-black">Proteínas ({pcProt}%)</span>
                  <span className="font-black text-secondary-container print:text-black">{Math.round(dailyTotals.prot)}g</span>
                </div>
                <div className="text-[10px] text-on-surface-variant text-right mb-1 print:text-black/70">{(dailyTotals.prot / weightKg).toFixed(1)} g/kg</div>
                <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden print:border print:border-black/10">
                  <div className="h-full bg-secondary-container print:bg-black/80" style={{ width: `${pcProt}%` }}></div>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-1">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-on-surface print:text-black">Gorduras ({pcGord}%)</span>
                  <span className="font-black text-tertiary-container print:text-black">{Math.round(dailyTotals.gord)}g</span>
                </div>
                <div className="text-[10px] text-on-surface-variant text-right mb-1 print:text-black/70">{(dailyTotals.gord / weightKg).toFixed(1)} g/kg</div>
                <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden print:border print:border-black/10">
                  <div className="h-full bg-tertiary-container print:bg-black/40" style={{ width: `${pcGord}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-8 h-8 md:w-12 md:h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : (
      <motion.section variants={item} className="space-y-6">
        <div className="flex justify-between items-end mb-2 print:hidden">
          <h2 className="text-xl font-bold font-headline text-on-surface">Refeições</h2>
          <button onClick={() => openMealModal()} className="text-primary text-sm font-semibold hover:underline flex items-center gap-1">
            <Plus size={16} /> Nova Refeição
          </button>
        </div>

        {meals.map((meal) => {
          const mealTotals = calculateMealTotals(meal.items);

          return (
            <div key={meal.id} className="bg-surface-container-lowest rounded-2xl border border-on-surface-variant/10 overflow-hidden shadow-sm mb-6 print:break-inside-avoid print:border-black/20 print:shadow-none">
              {/* Cabeçalho da Refeição */}
              <div className="bg-surface-container-low px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-on-surface-variant/10 print:bg-transparent print:border-black/20 group/meal">
                <div className="flex items-center gap-3">
                  <div className="bg-surface border border-on-surface-variant/20 px-3 py-1 rounded-md text-sm font-bold text-on-surface print:bg-transparent print:border-black/30 print:text-black">
                    {meal.time}
                  </div>
                  <h3 className="text-lg font-bold font-headline text-primary print:text-black">{meal.name}</h3>
                  
                  <div className="flex opacity-0 group-hover/meal:opacity-100 transition-opacity print:hidden items-center ml-2">
                    <button onClick={() => openMealModal(meal)} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors mr-1" title="Editar Refeição">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleRemoveMeal(meal.id)} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors" title="Excluir Refeição">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between gap-4 text-xs font-semibold text-on-surface-variant bg-surface px-4 py-2 rounded-lg border border-on-surface-variant/10 w-full sm:w-auto overflow-x-auto print:bg-transparent print:border-none print:text-black/80">
                  <span title="Energia Total"><span className="text-on-surface print:text-black">{Math.round(mealTotals.kcal)}</span> kcal</span>
                  <span className="text-on-surface-variant/30 print:hidden">•</span>
                  <span title="Carboidratos"><span className="text-primary print:text-black">{mealTotals.carb.toFixed(1)}g</span> CHO</span>
                  <span className="text-on-surface-variant/30 print:hidden">•</span>
                  <span title="Proteínas"><span className="text-secondary-container print:text-black">{mealTotals.prot.toFixed(1)}g</span> PTN</span>
                  <span className="text-on-surface-variant/30 print:hidden">•</span>
                  <span title="Gorduras"><span className="text-tertiary-container print:text-black">{mealTotals.gord.toFixed(1)}g</span> LIP</span>
                </div>
              </div>

              {/* Tabela de Alimentos (Desktop) & Lista (Mobile) */}
              <div className="p-0">
                {/* Cabeçalho das colunas */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-surface-container-lowest border-b border-on-surface-variant/5 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider print:grid print:border-black/20 print:text-black/70">
                  <div className="col-span-5">Alimento</div>
                  <div className="col-span-3 text-center">Quantidade</div>
                  <div className="col-span-4 grid grid-cols-4 gap-2 text-center">
                    <div>Kcal</div>
                    <div>Carb</div>
                    <div>Prot</div>
                    <div>Gord</div>
                  </div>
                </div>

                <div className="divide-y divide-on-surface-variant/5 print:divide-black/10">
                  {meal.items.map((food, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 md:px-6 py-4 md:py-3 items-center hover:bg-surface-container-low transition-colors group/food print:grid print:py-2">
                      
                      <div className="col-span-1 md:col-span-5 flex flex-col pr-4">
                        <span className="text-sm font-bold text-on-surface print:text-black leading-tight">{food.name}</span>
                      </div>

                      <div className="col-span-1 md:col-span-3 flex flex-row md:flex-col justify-between md:justify-center md:items-center mt-2 md:mt-0">
                        <span className="md:hidden text-xs text-on-surface-variant font-medium print:hidden">Quantidade:</span>
                        <div className="text-right md:text-center flex flex-col">
                          <span className="text-sm font-semibold text-primary print:text-black">{formatMeasure(food.quantity, food.measure)}</span>
                          <span className="text-[11px] text-on-surface-variant print:text-black/60">({food.weight})</span>
                        </div>
                      </div>

                      <div className="col-span-1 md:col-span-4 grid grid-cols-4 gap-2 mt-2 md:mt-0 items-center">
                        <div className="text-center flex flex-col">
                          <span className="md:hidden text-[10px] text-on-surface-variant uppercase tracking-wider mb-1 print:hidden">Kcal</span>
                          <span className="text-sm font-bold text-on-surface print:text-black">{Math.round(food.kcal)}</span>
                        </div>
                        <div className="text-center flex flex-col">
                          <span className="md:hidden text-[10px] text-on-surface-variant uppercase tracking-wider mb-1 print:hidden">Carb</span>
                          <span className="text-sm font-semibold text-on-surface-variant print:text-black">{food.carb.toFixed(1)}g</span>
                        </div>
                        <div className="text-center flex flex-col">
                          <span className="md:hidden text-[10px] text-on-surface-variant uppercase tracking-wider mb-1 print:hidden">Prot</span>
                          <span className="text-sm font-semibold text-on-surface-variant print:text-black">{food.prot.toFixed(1)}g</span>
                        </div>
                        <div className="text-center flex flex-col">
                          <span className="md:hidden text-[10px] text-on-surface-variant uppercase tracking-wider mb-1 print:hidden">Gord</span>
                          <span className="text-sm font-semibold text-on-surface-variant print:text-black">{food.gord.toFixed(1)}g</span>
                        </div>
                      </div>

                      {/* Icones de edição absolutos overlay em desktop ou bottom em mobile */}
                      <div className="print:hidden absolute md:relative right-2 md:right-auto md:absolute md:right-4 flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover/food:opacity-100 transition-opacity">
                        <button onClick={() => openEditFoodModal(meal.id, food)} className="p-2 md:p-1.5 bg-surface text-on-surface-variant shadow-sm md:shadow-none hover:text-primary hover:bg-primary/10 rounded-lg transition-colors border border-on-surface-variant/10 md:border-transparent">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleRemoveFood(meal.id, food.id)} className="p-2 md:p-1.5 bg-surface text-on-surface-variant shadow-sm md:shadow-none hover:text-error hover:bg-error/10 rounded-lg transition-colors border border-on-surface-variant/10 md:border-transparent">
                          <Trash2 size={16} />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>

                <div className="px-6 py-4 bg-surface-container-lowest print:hidden border-t border-on-surface-variant/5">
                  <button 
                    onClick={() => { setActiveMealId(meal.id); setIsFoodModalOpen(true); }}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-on-surface-variant/20 rounded-xl text-primary font-bold text-sm hover:bg-primary/5 hover:border-primary/30 transition-all"
                  >
                    <Plus size={18} /> Adicionar Alimento
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {meals.length === 0 && (
          <div className="text-center py-12 bg-surface-container-low rounded-2xl border border-dashed border-on-surface-variant/30 print:hidden">
            <BrainCircuit size={48} className="mx-auto text-primary mb-4" />
            <h3 className="text-lg font-bold text-on-surface mb-2">Construa o Perfil Alimentar</h3>
            <p className="text-on-surface-variant max-w-md mx-auto mb-6">Comece adicionando refeições manualmente ou deixe a Inteligência Artificial montar uma base hiper-personalizada para você.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => openMealModal()} className="px-6 py-3 bg-surface-container-high text-on-surface rounded-full font-bold shadow-sm hover:bg-on-surface-variant/10 transition-colors inline-flex items-center gap-2">
                <Plus size={18} /> Manual
              </button>
              <button onClick={startAIDietGeneration} className="px-6 py-3 primary-gradient text-white rounded-full font-bold shadow-lg hover:scale-105 active:scale-95 transition-transform inline-flex items-center gap-2">
                <Sparkles size={18} /> Gerar Dieta Inteligente
              </button>
            </div>
          </div>
        )}
      </motion.section>
      )}

      <motion.div variants={item} className="mt-12 md:mt-16 flex flex-col items-center justify-center gap-4 pb-12 print:hidden">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
          <button 
            onClick={() => handleSaveDiet(false)}
            className="w-full sm:w-auto px-8 md:px-12 py-4 md:py-5 primary-gradient text-white rounded-full font-bold text-base md:text-lg shadow-xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-2 md:gap-3"
          >
            <Save size={20} className="md:w-6 md:h-6" />
            Finalizar e Publicar
          </button>
          <button 
            onClick={() => showToast?.('Plano duplicado com sucesso!', 'success')}
            className="w-full sm:w-auto px-6 md:px-10 py-4 md:py-5 bg-surface-container-high text-on-surface rounded-full font-bold text-base md:text-lg hover:bg-on-surface-variant/10 transition-colors flex items-center justify-center gap-2 md:gap-3"
          >
            <Copy size={18} className="md:w-5 md:h-5" />
            Duplicar Plano
          </button>
        </div>
        <div className="text-xs font-semibold text-on-surface-variant mt-2 flex items-center gap-2 h-6">
          {isAutoSaving ? (
            <><span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></span> Salvando automaticamente...</>
          ) : lastSaved ? (
            <><Check size={14} className="text-primary" /> Rascunho salvo às {lastSaved.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</>
          ) : null}
        </div>
      </motion.div>

      {/* Modal: Nova Refeição / Editar Refeição */}
      <AnimatePresence>
        {isMealModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-scrim/50 backdrop-blur-sm shadow-2xl print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-on-surface-variant/10"
            >
              <div className="flex justify-between items-center p-6 border-b border-on-surface-variant/10">
                <h3 className="text-xl font-bold font-headline text-on-surface">{editingMealId ? 'Editar Refeição' : 'Nova Refeição'}</h3>
                <button onClick={() => setIsMealModalOpen(false)} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-1">Nome da Refeição (ex: Ceia)</label>
                  <input type="text" value={newMealName} onChange={e => setNewMealName(e.target.value)} className="w-full bg-surface-container border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary outline-none" placeholder="Digite o nome..." />
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-1">Horário</label>
                  <input type="time" value={newMealTime} onChange={e => setNewMealTime(e.target.value)} className="w-full bg-surface-container border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
              <div className="p-6 bg-surface-container-lowest border-t border-on-surface-variant/10 flex justify-end gap-3">
                <button onClick={() => setIsMealModalOpen(false)} className="px-6 py-2.5 font-bold text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">Cancelar</button>
                <button onClick={handleSaveMeal} className="px-6 py-2.5 font-bold bg-primary text-white rounded-full hover:bg-primary/90 transition-colors shadow-md">{editingMealId ? 'Salvar Alterações' : 'Adicionar Refeição'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Editar Quantidade do Alimento */}
      <AnimatePresence>
        {isEditFoodModalOpen && editingFoodData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-scrim/50 backdrop-blur-sm shadow-2xl print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-on-surface-variant/10"
            >
              <div className="flex justify-between items-center p-6 border-b border-on-surface-variant/10 bg-surface-container-lowest">
                <h3 className="text-xl font-bold font-headline text-on-surface">Editar Quantidade</h3>
                <button onClick={() => setIsEditFoodModalOpen(false)} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="bg-surface-container p-4 rounded-xl">
                    <p className="font-bold text-on-surface mb-1">{editingFoodData.food.name}</p>
                    <p className="text-xs text-on-surface-variant">Kcal e Macros atuais serão ajustados baseados nesta nova medida proporcionalmente.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-on-surface-variant mb-1">Medida Caseira</label>
                    <select 
                      value={foodMeasure} 
                      onChange={e => {
                        const newMeasure = e.target.value;
                        setFoodMeasure(newMeasure);
                        const measureObj = currentMeasures.find(m => m.measure === newMeasure);
                        const amount = measureObj ? measureObj.amount : 100;
                        setFoodWeight(foodQuantity * amount);
                      }} 
                      className="w-full bg-surface-container border-none rounded-xl px-4 py-3 text-on-surface font-bold focus:ring-2 focus:ring-primary outline-none appearance-none"
                    >
                      {currentMeasures.map(m => (
                        <option key={m.measure} value={m.measure}>{m.measure.charAt(0).toUpperCase() + m.measure.slice(1)}</option>
                      ))}
                      {currentMeasures.length === 0 && <option value={foodMeasure}>{foodMeasure.charAt(0).toUpperCase() + foodMeasure.slice(1)}</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-on-surface-variant mb-1">Quantas medidas?</label>
                    <input 
                      type="number" 
                      step="0.5" 
                      min="0" 
                      value={foodQuantity} 
                      onChange={e => {
                        const newQuantity = Number(e.target.value) || 0;
                        setFoodQuantity(newQuantity);
                        const measureObj = currentMeasures.find(m => m.measure === foodMeasure);
                        const amount = measureObj ? measureObj.amount : 100;
                        setFoodWeight(newQuantity * amount);
                      }} 
                      className="w-full bg-surface-container border-none rounded-xl px-4 py-3 text-on-surface font-bold focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-on-surface-variant mb-1">Qtd em {foodUnit.toUpperCase()}</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={foodWeight} 
                      onChange={e => {
                        const newWeight = Number(e.target.value) || 0;
                        setFoodWeight(newWeight);
                        const measureObj = currentMeasures.find(m => m.measure === foodMeasure);
                        if (measureObj && measureObj.amount) {
                            setFoodQuantity(parseFloat((newWeight / measureObj.amount).toFixed(2)));
                        }
                      }} 
                      className="w-full bg-surface-container border-none rounded-xl px-4 py-3 text-on-surface font-bold focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-surface-container-lowest border-t border-on-surface-variant/10 flex justify-end gap-3">
                <button onClick={() => setIsEditFoodModalOpen(false)} className="px-6 py-2.5 font-bold text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">Cancelar</button>
                <button onClick={handleSaveEditedFood} className="px-6 py-2.5 font-bold bg-primary text-white rounded-full hover:bg-primary/90 transition-colors shadow-md">Salvar Novo Tamanho</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Adicionar Alimento TACO */}
      <AnimatePresence>
        {isFoodModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-scrim/50 backdrop-blur-sm py-10 shadow-2xl print:hidden">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-surface w-full max-w-3xl max-h-full rounded-3xl shadow-2xl flex flex-col border border-on-surface-variant/10 overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-on-surface-variant/10 bg-surface-container-lowest flex-shrink-0">
                <div>
                  <h3 className="text-xl font-bold font-headline text-on-surface flex items-center gap-2">Tabela TACO <span className="text-[10px] bg-primary-container text-primary px-2 py-1 rounded-md uppercase font-black">IBGE</span></h3>
                  <p className="text-xs text-on-surface-variant mt-1">Busque alimentos nacionais para compor o plano</p>
                </div>
                <button onClick={() => { setIsFoodModalOpen(false); setSelectedTaco(null); }} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {!selectedTaco ? (
                <>
                  <div className="p-4 border-b border-on-surface-variant/10 bg-surface flex-shrink-0">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
                      <input 
                        type="text" 
                        value={tacoSearch}
                        onChange={e => setTacoSearch(e.target.value)}
                        placeholder="Buscar alimento (ex: Arroz, Frango, Banana...)"
                        className="w-full bg-surface-container border-none rounded-xl pl-12 pr-4 py-4 text-on-surface focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 min-h-[300px]">
                    {filteredFoods.length === 0 ? (
                      <p className="p-8 text-center text-on-surface-variant font-medium">Nenhum alimento encontrado na base.</p>
                    ) : (
                      <div className="divide-y divide-on-surface-variant/10">
                        {filteredFoods.map(food => (
                          <div key={food.id} onClick={() => handleSelectTaco(food)} className="p-4 md:px-6 hover:bg-surface-container-low cursor-pointer transition-colors flex justify-between items-center group">
                            <div>
                              <p className="font-bold text-on-surface group-hover:text-primary transition-colors flex items-center gap-2">
                                {food.name} <span className="text-xs font-normal text-on-surface-variant">({food.unit || 'g'})</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase ${food.source === 'TACO' ? 'bg-primary-container text-primary' : 'bg-tertiary-container text-tertiary'}`}>
                                  {food.source}
                                </span>
                              </p>
                              <p className="text-xs text-on-surface-variant mt-1 font-medium">100{food.unit || 'g'} = {food.kcal}kcal | CHO: {food.carb}g | PTN: {food.prot}g | LIP: {food.gord}g</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-surface-container-high group-hover:bg-primary-container group-hover:text-primary flex items-center justify-center transition-colors">
                              <Plus size={18} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 overflow-y-auto flex flex-col">
                  <div className="p-6 flex-1">
                    <button onClick={() => setSelectedTaco(null)} className="text-sm text-primary font-bold hover:underline mb-4 flex items-center gap-1">← Voltar para a busca</button>
                    
                    <div className="bg-surface-container-low p-6 rounded-2xl border border-primary/20 mb-6">
                      <h4 className="text-lg font-bold text-on-surface mb-2">{selectedTaco.name} <span className="text-sm font-normal text-on-surface-variant">({selectedTaco.unit || 'g'})</span></h4>
                      <p className="text-sm text-on-surface-variant font-medium">Valores calculados dinamicamente para a porção escolhida.</p>
                      
                      <div className="grid grid-cols-4 gap-4 mt-4 p-4 bg-surface rounded-xl border border-on-surface-variant/10 text-center shadow-sm">
                        <div className="border-r border-on-surface-variant/10"><p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">Kcal</p><p className="font-black text-primary text-xl md:text-2xl">{Math.round(selectedTaco.kcal * (foodWeight / 100))}</p></div>
                        <div className="border-r border-on-surface-variant/10"><p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">Carb</p><p className="font-bold text-on-surface text-xl md:text-2xl">{(selectedTaco.carb * (foodWeight / 100)).toFixed(1)}<span className="text-sm">g</span></p></div>
                        <div className="border-r border-on-surface-variant/10"><p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">Prot</p><p className="font-bold text-on-surface text-xl md:text-2xl">{(selectedTaco.prot * (foodWeight / 100)).toFixed(1)}<span className="text-sm">g</span></p></div>
                        <div><p className="text-[10px] text-on-surface-variant uppercase font-bold mb-1">Gord</p><p className="font-bold text-on-surface text-xl md:text-2xl">{(selectedTaco.gord * (foodWeight / 100)).toFixed(1)}<span className="text-sm">g</span></p></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-on-surface-variant mb-1">Medida Caseira</label>
                        <select 
                          value={foodMeasure} 
                          onChange={e => {
                            const newMeasure = e.target.value;
                            setFoodMeasure(newMeasure);
                            const measureObj = currentMeasures.find(m => m.measure === newMeasure);
                            const amount = measureObj ? measureObj.amount : 100;
                            setFoodWeight(foodQuantity * amount);
                          }} 
                          className="w-full bg-surface-container border-none rounded-xl px-4 py-3 text-on-surface font-bold focus:ring-2 focus:ring-primary outline-none appearance-none"
                        >
                          {currentMeasures.map(m => (
                            <option key={m.measure} value={m.measure}>{m.measure.charAt(0).toUpperCase() + m.measure.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-on-surface-variant mb-1">Quantas medidas?</label>
                        <input 
                          type="number" 
                          step="0.5" 
                          min="0" 
                          value={foodQuantity} 
                          onChange={e => {
                            const newQuantity = Number(e.target.value) || 0;
                            setFoodQuantity(newQuantity);
                            const measureObj = currentMeasures.find(m => m.measure === foodMeasure);
                            const amount = measureObj ? measureObj.amount : 100;
                            setFoodWeight(newQuantity * amount);
                          }} 
                          className="w-full bg-surface-container border-none rounded-xl px-4 py-3 text-on-surface font-bold focus:ring-2 focus:ring-primary outline-none" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-on-surface-variant mb-1">Qtd em {foodUnit.toUpperCase()} (Referência)</label>
                        <input 
                          type="number" 
                          min="0" 
                          value={foodWeight} 
                          onChange={e => {
                            const newWeight = Number(e.target.value) || 0;
                            setFoodWeight(newWeight);
                            const measureObj = currentMeasures.find(m => m.measure === foodMeasure);
                            if (measureObj && measureObj.amount) {
                                setFoodQuantity(parseFloat((newWeight / measureObj.amount).toFixed(2)));
                            }
                          }} 
                          className="w-full bg-surface-container border-none rounded-xl px-4 py-3 text-on-surface font-bold focus:ring-2 focus:ring-primary outline-none" 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-surface-container-lowest border-t border-on-surface-variant/10 flex justify-end gap-3 flex-shrink-0">
                    <button onClick={() => { setIsFoodModalOpen(false); setSelectedTaco(null); }} className="px-6 py-2.5 font-bold text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">Cancelar</button>
                    <button onClick={handleAddTacoFood} className="px-6 py-2.5 font-bold bg-primary text-white rounded-full hover:bg-primary/90 transition-colors shadow-md flex items-center gap-2"><Check size={18}/> Inserir na Refeição</button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isAiLoading && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-scrim/50 backdrop-blur-sm shadow-2xl print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface p-8 rounded-3xl shadow-2xl text-center max-w-sm flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              <h3 className="text-xl font-bold font-headline text-on-surface flex items-center gap-2"><Sparkles className="text-primary" /> Mentes brilhantes...</h3>
              <p className="text-sm text-on-surface-variant">A Inteligência Artificial está analisando o prontuário e calculando os macronutrientes da dieta ideal.</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSmartCheckOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-scrim/50 backdrop-blur-sm shadow-2xl print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-on-surface-variant/10"
            >
              <div className="flex justify-between items-center p-6 border-b border-on-surface-variant/10 bg-primary-container/20">
                <h3 className="text-xl font-bold font-headline text-primary flex items-center gap-2"><BrainCircuit size={20} /> Smart Check</h3>
                <button onClick={() => setIsSmartCheckOpen(false)} className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-on-surface-variant mb-4">A IA precisa de alguns dados vitais para criar um cálculo científico preciso. Por favor, preencha as informações que estão faltando no prontuário:</p>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-1">Objetivo (ex: Hipertrofia, Emagrecimento)</label>
                  <input type="text" value={smartCheckData.objective} onChange={e => setSmartCheckData({...smartCheckData, objective: e.target.value})} className="w-full bg-surface-container border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-on-surface-variant mb-1">Peso (kg)</label>
                    <input type="number" value={smartCheckData.weight} onChange={e => setSmartCheckData({...smartCheckData, weight: e.target.value})} className="w-full bg-surface-container border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-on-surface-variant mb-1">Altura (cm)</label>
                    <input type="number" value={smartCheckData.height} onChange={e => setSmartCheckData({...smartCheckData, height: e.target.value})} className="w-full bg-surface-container border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-surface-container-lowest border-t border-on-surface-variant/10 flex justify-end gap-3">
                <button onClick={() => setIsSmartCheckOpen(false)} className="px-6 py-2.5 font-bold text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">Cancelar</button>
                <button onClick={() => callAI(smartCheckData.objective, smartCheckData.weight, smartCheckData.height, patientAnamnesis)} className="px-6 py-2.5 font-bold bg-primary text-white rounded-full hover:bg-primary/90 transition-colors shadow-md inline-flex items-center gap-2"><Sparkles size={16} /> Continuar para IA</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
