export type ViewType = 'dashboard' | 'assessments' | 'anamnesis' | 'diets' | 'patients' | 'profile' | 'agenda';

export interface Patient {
  id: string;
  name: string;
  lastConsultation: string;
  status: 'Em progresso' | 'Ajuste de Dieta' | 'Novo' | 'Ativo' | 'Inativo';
  objective: string;
  avatar: string;
  assessments?: any[];
}

export interface Meal {
  time: string;
  name: string;
  calories: number;
  items: {
    name: string;
    description: string;
    prot: string;
    carb: string;
    gord: string;
    image: string;
  }[];
}

export interface Appointment {
  id: string;
  patientName: string;
  date: string; // ISO format or YYYY-MM-DD
  time: string; // HH:MM format
  notes: string;
  type: 'Consulta' | 'Retorno' | 'Avaliação';
}
