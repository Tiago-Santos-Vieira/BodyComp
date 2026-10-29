import React, { useEffect, useRef, useState } from 'react';
import { Paperclip, Upload, FileText, Image as ImageIcon, ExternalLink, Download, Trash2, Loader2 } from 'lucide-react';
import { ToastType } from '../App';
import {
  ACCEPT, QUOTA_BYTES, PatientFile, UploadError, deletePatientFile, formatBytes, getFileUrl,
  getUsedBytes, listPatientFiles, updateFileDescription, uploadPatientFile,
} from '../lib/patientFiles';

interface Props {
  patientId: string;
  showToast?: (message: string, type?: ToastType) => void;
}

const QUOTA_MSG = 'Você atingiu o limite de 200 MB de arquivos. Exclua arquivos antigos para enviar novos.';

export default function PatientFiles({ patientId, showToast }: Props) {
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [used, setUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    try {
      const [list, total] = await Promise.all([listPatientFiles(patientId), getUsedBytes()]);
      setFiles(list);
      setUsed(total);
    } catch {
      showToast?.('Não foi possível carregar os arquivos do paciente.', 'error');
    }
    setLoading(false);
  };

  useEffect(() => { setLoading(true); refresh(); }, [patientId]);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked: File[] = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (!picked.length) return;
    let total = used;
    let sent = 0;
    for (const file of picked) {
      setUploading(`Enviando ${sent + 1} de ${picked.length}: ${file.name}`);
      try {
        const row = await uploadPatientFile(patientId, file, total);
        total += row.size_bytes;
        sent++;
      } catch (err) {
        const msg = err instanceof UploadError ? err.message : `Não foi possível enviar "${file.name}".`;
        showToast?.(msg === 'COTA_EXCEDIDA' ? QUOTA_MSG : msg, 'error');
        if (msg === 'COTA_EXCEDIDA') break;
      }
    }
    setUploading(null);
    if (sent) showToast?.(sent === 1 ? 'Arquivo salvo.' : `${sent} arquivos salvos.`, 'success');
    refresh();
  };

  const open = async (file: PatientFile, download: boolean) => {
    // a janela abre antes do link ficar pronto, senão o navegador do celular bloqueia
    const win = download ? null : window.open('', '_blank');
    try {
      const url = await getFileUrl(file, download);
      if (win) win.location.href = url;
      else window.location.href = url;
    } catch {
      win?.close();
      showToast?.('Não foi possível abrir o arquivo. Tente de novo.', 'error');
    }
  };

  const remove = async (file: PatientFile) => {
    if (!window.confirm(`Excluir "${file.name}"? O arquivo será apagado de vez.`)) return;
    try {
      await deletePatientFile(file);
      showToast?.('Arquivo excluído.', 'success');
      refresh();
    } catch {
      showToast?.('Não foi possível excluir o arquivo.', 'error');
    }
  };

  const saveDescription = async (file: PatientFile, value: string) => {
    if ((file.description ?? '') === value.trim()) return;
    try {
      await updateFileDescription(file.id, value);
      setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, description: value.trim() || null } : f)));
    } catch {
      showToast?.('Não foi possível salvar a descrição.', 'error');
    }
  };

  const usedPct = Math.min(100, (used / QUOTA_BYTES) * 100);

  return (
    <section className="bg-surface-container-low rounded-2xl p-6 md:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center flex-shrink-0">
            <Paperclip size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold font-headline text-on-surface">Arquivos do paciente</h2>
            <p className="text-sm text-on-surface-variant">Exames, laudos e documentos. PDF ou imagem, até 10 MB cada.</p>
          </div>
        </div>
        <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={handleFiles} />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={!!uploading}
          className="flex items-center justify-center gap-2 px-5 py-3 primary-gradient text-white rounded-full font-bold shadow-md hover:scale-105 transition-transform disabled:opacity-60 disabled:hover:scale-100"
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          Adicionar arquivos
        </button>
      </div>

      {uploading && <p className="text-sm text-primary font-semibold mb-4">{uploading}</p>}

      <div className="mb-5">
        <div className="flex justify-between gap-3 text-xs font-semibold text-on-surface-variant mb-1">
          <span>Espaço usado (todos os pacientes)</span>
          <span className="whitespace-nowrap">{formatBytes(used)} de 200 MB</span>
        </div>
        <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
          <div className={`h-full rounded-full ${usedPct > 90 ? 'bg-error' : 'bg-primary'}`} style={{ width: `${usedPct}%` }} />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-on-surface-variant py-6 text-center">Carregando arquivos...</p>
      ) : files.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-on-surface-variant/20 rounded-xl">
          <p className="text-on-surface-variant text-sm">Nenhum arquivo ainda. Adicione exames e documentos para ter tudo deste paciente num só lugar.</p>
        </div>
      ) : (
        <ul className="divide-y divide-on-surface-variant/10 bg-surface-container-lowest rounded-xl border border-on-surface-variant/10">
          {files.map((file) => {
            const isImage = file.mime_type.startsWith('image/');
            return (
              <li key={file.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary flex-shrink-0">
                    {isImage ? <ImageIcon size={18} /> : <FileText size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-on-surface truncate" title={file.name}>{file.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      {new Date(file.created_at).toLocaleDateString('pt-BR')} · {formatBytes(file.size_bytes)}
                    </p>
                    <input
                      type="text"
                      defaultValue={file.description ?? ''}
                      placeholder="Adicionar descrição (ex.: Hemograma de março)"
                      maxLength={120}
                      onBlur={(e) => saveDescription(file, e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                      className="mt-2 w-full bg-transparent border-b border-on-surface-variant/20 focus:border-primary text-sm text-on-surface py-1 outline-none placeholder:text-on-surface-variant/60"
                    />
                  </div>
                </div>
                <div className="flex gap-2 md:flex-shrink-0">
                  <button onClick={() => open(file, false)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-primary hover:bg-primary/10 transition-colors">
                    <ExternalLink size={16} /> Abrir
                  </button>
                  <button onClick={() => open(file, true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors">
                    <Download size={16} /> Baixar
                  </button>
                  <button onClick={() => remove(file)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-error hover:bg-error/10 transition-colors" aria-label={`Excluir ${file.name}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
