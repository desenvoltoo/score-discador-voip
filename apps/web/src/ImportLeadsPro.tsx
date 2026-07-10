import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Eye, FileSpreadsheet, RefreshCw, ShieldCheck, UploadCloud } from 'lucide-react';
import { api, token } from './services/api';
import './import-leads-pro.css';

type Msg = { type: 'ok' | 'err' | 'info'; text: string } | null;

type Campaign = { id: string; name: string; status?: string };

const requiredColumns = ['nome', 'telefone'];
const recommendedColumns = ['cpf', 'email', 'curso', 'origem', 'observacao'];
const allColumns = [...requiredColumns, ...recommendedColumns];

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean).slice(0, 8);
  const delimiter = lines[0]?.includes(';') ? ';' : ',';
  const headers = (lines[0] || '').split(delimiter).map((h) => h.replace(/^\uFEFF/, '').trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(delimiter);
    return headers.reduce<Record<string, string>>((acc, h, i) => {
      acc[h] = cells[i]?.replace(/^"|"$/g, '') || '';
      return acc;
    }, {});
  });
  return { headers, rows };
}

async function readUploadResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (contentType.includes('application/json')) {
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      throw new Error('O backend respondeu JSON inválido ao importar. Veja os logs da API.');
    }
  }

  const cleaned = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  throw new Error(`A rota de importação não respondeu JSON da API. Resposta recebida: ${cleaned.slice(0, 220) || 'vazia'}`);
}

function Notice({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return <div className={`notice ${msg.type}`}>{msg.type === 'err' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}<span>{msg.text}</span></div>;
}

export default function ImportLeadsPro() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [msg, setMsg] = useState<Msg>(null);
  const [loading, setLoading] = useState(false);
  const [checks, setChecks] = useState({ origem: false, consentimento: false, telefone: false });

  async function loadCampaigns() {
    try {
      const rows = await api('/campaigns');
      setCampaigns(rows || []);
      if (!campaignId && rows?.[0]?.id) setCampaignId(rows[0].id);
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Não foi possível carregar campanhas.' });
    }
  }

  useEffect(() => { loadCampaigns(); }, []);

  const fileExt = file?.name.toLowerCase().split('.').pop() || '';
  const isCsv = fileExt === 'csv';
  const isXlsx = fileExt === 'xlsx';
  const normalizedHeaders = useMemo(() => headers.map(normalizeHeader), [headers]);
  const missingRequired = requiredColumns.filter((c) => !normalizedHeaders.includes(c));
  const presentRecommended = recommendedColumns.filter((c) => normalizedHeaders.includes(c));
  const unknownHeaders = headers.filter((h) => !allColumns.includes(normalizeHeader(h)));
  const hasValidFileType = isCsv || isXlsx;
  const csvIsValid = isCsv && missingRequired.length === 0;
  const xlsxIsAllowed = isXlsx;
  const canUpload = !!campaignId && !!file && hasValidFileType && (csvIsValid || xlsxIsAllowed) && Object.values(checks).every(Boolean);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setFile(f || null);
    setHeaders([]);
    setPreviewRows([]);
    setMsg(null);
    if (!f) return;

    const name = f.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx')) {
      setMsg({ type: 'err', text: 'Formato não aceito. Use CSV ou XLSX.' });
      return;
    }

    if (name.endsWith('.xlsx')) {
      setMsg({ type: 'info', text: 'Arquivo XLSX selecionado. A prévia visual é exibida apenas para CSV, mas o envio XLSX está liberado após o checklist LGPD.' });
      return;
    }

    try {
      const text = await f.text();
      const parsed = parseCsv(text);
      setHeaders(parsed.headers);
      setPreviewRows(parsed.rows);
      if (!parsed.headers.length) setMsg({ type: 'err', text: 'CSV sem cabeçalho. Use o modelo oficial.' });
    } catch {
      setMsg({ type: 'err', text: 'Não foi possível ler a prévia do CSV.' });
    }
  }

  function downloadTemplate() {
    const csv = 'nome;telefone;cpf;email;curso;origem;observacao\nAna Teste;(11) 98888-1001;12345678901;ana.teste@email.com;Administração;Landing Page;Lead fictício para teste\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'modelo_importacao_referencia_discador.csv';
    a.click();
  }

  async function upload() {
    if (!file || !campaignId) return;
    if (!canUpload) {
      setMsg({ type: 'err', text: 'Confira campanha, tipo de arquivo, colunas obrigatórias do CSV e checklist LGPD antes de importar.' });
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    try {
      setLoading(true);
      setMsg({ type: 'info', text: 'Enviando base e aguardando processamento...' });
      const r = await fetch(`/api/imports/${campaignId}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd });
      const d = await readUploadResponse(r);
      if (!r.ok) throw new Error(d.message || 'Erro ao importar');
      setMsg({ type: 'ok', text: `Importação concluída: ${d.totalImported ?? 0} importados, ${d.duplicates ?? 0} duplicados, ${d.invalid ?? 0} inválidos, ${d.blocked ?? 0} bloqueados.` });
      setFile(null);
      setHeaders([]);
      setPreviewRows([]);
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Falha ao importar base.' });
    } finally {
      setLoading(false);
    }
  }

  return <section className="importPro">
    <div className="importHero">
      <div>
        <small>Importação 2.0</small>
        <h2>Suba bases com validação, prévia e controle LGPD</h2>
        <p>Antes de enviar, confira campanha, colunas, possíveis riscos e padrão do arquivo. Isso reduz erro operacional e deixa o fluxo mais profissional.</p>
      </div>
      <button className="ghostBtn" onClick={downloadTemplate}><Download size={17} />Baixar modelo CSV</button>
    </div>

    <div className="importGrid">
      <div className="panel importUploader">
        <h3><UploadCloud size={20} />1. Selecionar campanha e arquivo</h3>
        <label>Campanha
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            {!campaigns.length && <option value="">Nenhuma campanha carregada</option>}
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="uploadBox bigUpload">
          <FileSpreadsheet size={34} />
          <span>{file ? file.name : 'Selecionar CSV ou XLSX'}</span>
          <small>{file ? `${(file.size / 1024).toFixed(1)} KB` : 'Recomendado: use o modelo oficial para evitar erro de coluna'}</small>
          <input type="file" accept=".csv,.xlsx" onChange={onFileChange} />
        </label>
        <div className="importActions">
          <button onClick={upload} disabled={!canUpload || loading}>{loading ? 'Importando...' : 'Importar base'}</button>
          <button className="ghostBtn" onClick={loadCampaigns}><RefreshCw size={16} />Atualizar campanhas</button>
        </div>
        <Notice msg={msg} />
      </div>

      <div className="panel validationPanel">
        <h3><ShieldCheck size={20} />2. Checklist antes do envio</h3>
        <label className="checkLine"><input type="checkbox" checked={checks.origem} onChange={(e) => setChecks({ ...checks, origem: e.target.checked })} /> A origem/finalidade da base foi conferida.</label>
        <label className="checkLine"><input type="checkbox" checked={checks.consentimento} onChange={(e) => setChecks({ ...checks, consentimento: e.target.checked })} /> A base pode ser acionada pela operação comercial.</label>
        <label className="checkLine"><input type="checkbox" checked={checks.telefone} onChange={(e) => setChecks({ ...checks, telefone: e.target.checked })} /> Telefones foram revisados e contatos sensíveis removidos.</label>
        <div className="validationCards">
          <div className={isXlsx ? 'ok' : missingRequired.length ? 'bad' : 'ok'}><b>Obrigatórias</b><span>{isXlsx ? 'XLSX aceito; validação final no backend' : missingRequired.length ? `Faltando: ${missingRequired.join(', ')}` : 'nome e telefone OK'}</span></div>
          <div><b>Recomendadas</b><span>{isXlsx ? 'Validação no backend' : `${presentRecommended.length}/${recommendedColumns.length} reconhecidas`}</span></div>
          <div className={!hasValidFileType && file ? 'bad' : unknownHeaders.length ? 'warn' : 'ok'}><b>Arquivo</b><span>{file ? hasValidFileType ? (unknownHeaders.length ? `Extras: ${unknownHeaders.join(', ')}` : 'Formato OK') : 'Use CSV ou XLSX' : 'Aguardando arquivo'}</span></div>
        </div>
      </div>
    </div>

    <div className="panel previewPanel">
      <h3><Eye size={20} />3. Prévia e padrão de colunas</h3>
      <div className="tags">{allColumns.map((x) => <span key={x}>{x}</span>)}</div>
      {headers.length ? <div className="tableWrap"><table><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{previewRows.map((row, i) => <tr key={i}>{headers.map((h) => <td key={h}>{row[h] || '—'}</td>)}</tr>)}</tbody></table></div> : <div className="empty"><FileSpreadsheet size={36} /><strong>Prévia aguardando CSV</strong><span>Para XLSX, marque o checklist e importe normalmente. O backend processará a planilha.</span></div>}
    </div>
  </section>;
}
