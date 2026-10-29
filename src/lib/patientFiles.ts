import { supabase } from './supabase';

// Arquivos dos pacientes (exames, laudos...) no bucket privado "patient-files".
// O banco controla a cota (ver supabase/patient_files.sql); aqui a cota só é conferida antes para avisar mais cedo.
export const BUCKET = 'patient-files';
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const QUOTA_BYTES = 200 * 1024 * 1024;
export const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif';
const ALLOWED = ACCEPT.split(',');

export interface PatientFile {
  id: string;
  patient_id: string;
  path: string;
  name: string;
  description: string | null;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;

// Fotos são redimensionadas (lado maior até 2000 px) e salvas em JPEG; PDFs e imagens que o navegador
// não consegue abrir (como HEIC fora do Safari) vão como estão.
async function compressImage(file: File): Promise<{ blob: Blob; name: string; type: string }> {
  const original = { blob: file as Blob, name: file.name, type: file.type };
  if (!file.type.startsWith('image/')) return original;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return original;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob || blob.size >= file.size) return original;
    return { blob, name: file.name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg' };
  } catch {
    return original;
  }
}

export async function listPatientFiles(patientId: string): Promise<PatientFile[]> {
  const { data, error } = await supabase
    .from('patient_files')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getUsedBytes(): Promise<number> {
  const { data, error } = await supabase.from('patient_files').select('size_bytes');
  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + Number(row.size_bytes), 0);
}

export class UploadError extends Error {}

export async function uploadPatientFile(patientId: string, file: File, usedBytes: number): Promise<PatientFile> {
  const isAllowed = ALLOWED.includes(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (!isAllowed) throw new UploadError(`"${file.name}" não é PDF nem imagem.`);

  const prepared = await compressImage(file);
  if (prepared.blob.size > MAX_FILE_BYTES) throw new UploadError(`"${file.name}" tem mais de 10 MB.`);
  if (usedBytes + prepared.blob.size > QUOTA_BYTES) throw new UploadError('COTA_EXCEDIDA');

  // sessão lida localmente (sem ida ao servidor); quem confere o dono da pasta é o banco
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new UploadError('Sua sessão expirou. Entre de novo para enviar arquivos.');

  const ext = (prepared.name.match(/\.([a-z0-9]+)$/i)?.[1] || 'bin').toLowerCase();
  const path = `${user.id}/${patientId}/${crypto.randomUUID()}.${ext}`;
  const type = prepared.type || (ext === 'heic' || ext === 'heif' ? `image/${ext}` : 'application/octet-stream');

  // 1) registra (o banco confere a cota), 2) envia o arquivo; se o envio falhar, desfaz o registro
  const { data: row, error: rowError } = await supabase
    .from('patient_files')
    .insert({ patient_id: patientId, path, name: prepared.name, mime_type: type, size_bytes: prepared.blob.size })
    .select()
    .single();
  if (rowError) throw new UploadError(/COTA_EXCEDIDA/.test(rowError.message) ? 'COTA_EXCEDIDA' : `Não foi possível salvar "${file.name}".`);

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, prepared.blob, { contentType: type, upsert: false });
  if (uploadError) {
    await supabase.from('patient_files').delete().eq('id', row.id);
    throw new UploadError(`Não foi possível enviar "${file.name}". Tente de novo.`);
  }
  return row;
}

export async function updateFileDescription(id: string, description: string) {
  const { error } = await supabase.from('patient_files').update({ description: description.trim() || null }).eq('id', id);
  if (error) throw error;
}

// Link temporário (5 minutos): o arquivo nunca fica com endereço público
export async function getFileUrl(file: PatientFile, download = false): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(file.path, 300, download ? { download: file.name } : undefined);
  if (error || !data) throw error ?? new Error('Link não gerado');
  return data.signedUrl;
}

export async function deletePatientFile(file: PatientFile) {
  const { error } = await supabase.storage.from(BUCKET).remove([file.path]);
  if (error) throw error;
  const { error: rowError } = await supabase.from('patient_files').delete().eq('id', file.id);
  if (rowError) throw rowError;
}

// Usado ao excluir um paciente: apaga os arquivos dele do armazenamento (os registros caem junto com o paciente)
export async function deleteAllFilesOfPatient(patientId: string) {
  const files = await listPatientFiles(patientId);
  if (files.length) await supabase.storage.from(BUCKET).remove(files.map((f) => f.path));
}
