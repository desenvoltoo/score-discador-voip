import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Download, MessageSquare, RefreshCw, Search, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { api } from '../services/api';
import Notice, { type NoticeMessage } from '../components/Notice';
import StatusBadge from '../components/StatusBadge';
import '../ops-pages.css';

type Lead = {
  id: string;
  name?: string;
  phoneNormalized?: string;
  course?: string;
  origin?: string;
  status?: string;
  notes?: string;
  attemptsCount?: number;
  callbackAt?: string;
  doNotCall?: boolean;
  campaign?: { name?: string };
};

type CallRow = {
  id: string;
  status?: string;
  finalDisposition?: string;
  notes?: string;
  createdAt?: string;
  lead?: Lead;
  operator?: { name?: string };
  campaign?: { name?: string };
};

function fmt(v: any) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return v.toLocaleString('pt-BR');
  if (String(v).includes('T')) return String(v).replace('T', ' ').slice(0, 16);
  return String(v).replaceAll('_', ' ');
}

function qualityScore(call: CallRow) {
  let score = 100;
  if (!call.notes || call.notes.trim().length < 12) score -= 30;
  if (!call.finalDisposition) score -= 25;
  if (call.finalDisposition === 'RETORNO' && !call.lead?.callbackAt) score -= 20;
  if (call.lead?.doNotCall && call.finalDisposition !== 'NAO_LIGAR_NOVAMENTE') score -= 15;
  if ((call.lead?.attemptsCount || 0) >= 3 && !call.notes) score -= 10;
  return Math.max(0, score);
}

function riskItems(call: CallRow) {
  const items: string[] = [];
  if (!call.notes || call.notes.trim().length < 12) items.push('Sem observação útil');
  if (!call.finalDisposition) items.push('Sem desfecho');
  if (call.finalDisposition === 'RETORNO' && !call.lead?.callbackAt) items.push('Retorno sem data');
  if (call.lead?.doNotCall && call.finalDisposition !== 'NAO_LIGAR_NOVAMENTE') items.push('Revisar LGPD');
  return items;
}

function scriptFor(call: CallRow) {
  const lead = call.lead;
  const course = lead?.course || 'o curso de interesse';
  if (call.finalDisposition === 'INTERESSADO') return `Olá, ${lead?.name || 'tudo bem'}! Conforme conversamos, estou te enviando o próximo passo para avançarmos na sua inscrição em ${course}.`;
  if (call.finalDisposition === 'RETORNO') return `Olá, ${lead?.name || 'tudo bem'}! Combinado, vou te chamar no horário combinado sobre ${course}. Qualquer dúvida, fico à disposição.`;
  if (call.finalDisposition === 'NAO_ATENDEU') return `Olá, ${lead?.name || 'tudo bem'}! Tentei falar com você sobre ${course}. Pode me informar o melhor horário para contato?`;
  if (call.finalDisposition === 'SEM_INTERESSE') return `Olá, ${lead?.name || 'tudo bem'}! Obrigado pelo retorno. Caso mude de ideia sobre ${course}, fico à disposição.`;
  return `Olá, ${lead?.name || 'tudo bem'}! Estou entrando em contato sobre seu interesse em ${course}.`;
}

function downloadCsv(rows: CallRow[]) {
  const headers = ['data', 'campanha', 'operador', 'lead', 'telefone', 'desfecho', 'score_qualidade', 'alertas', 'observacao'];
  const csv = [headers.join(';'), ...rows.map((r) => [
    r.createdAt,
    r.campaign?.name,
    r.operator?.name,
    r.lead?.name,
    r.lead?.phoneNormalized,
    r.finalDisposition,
    qualityScore(r),
    riskItems(r).join(', '),
    r.notes,
  ].map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(';'))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'qualidade-atendimento-referencia.csv';
  a.click();
}

export default function QualityCenterPage({ openReports }: { openReports: () => void }) {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [query, setQuery] = useState('');
  const [onlyRisk, setOnlyRisk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<NoticeMessage>(null);

  async function load() {
    try {
      setLoading(true);
      setCalls(await api('/reports/calls'));
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Não foi possível carregar auditoria.' });
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return calls.filter((c) => {
      const haystack = [c.lead?.name, c.lead?.phoneNormalized, c.operator?.name, c.campaign?.name, c.finalDisposition, c.notes].join(' ').toLowerCase();
      const risk = riskItems(c).length > 0;
      return (!q || haystack.includes(q)) && (!onlyRisk || risk);
    });
  }, [calls, query, onlyRisk]);

  const avg = useMemo(() => filtered.length ? Math.round(filtered.reduce((sum, c) => sum + qualityScore(c), 0) / filtered.length) : 0, [filtered]);
  const risky = filtered.filter((c) => riskItems(c).length).length;
  const noNotes = filtered.filter((c) => !c.notes || c.notes.trim().length < 12).length;
  const noDisposition = filtered.filter((c) => !c.finalDisposition).length;

  return <section>
    <div className="heroPanel heroPremium">
      <div>
        <small>Qualidade e auditoria</small>
        <h2>Revise atendimentos, falhas de registro e próximos scripts</h2>
        <p>Central para supervisão acompanhar qualidade do atendimento, observações fracas, desfechos ausentes, riscos LGPD e mensagens sugeridas.</p>
      </div>
      <div className="heroActions"><button className="ghostBtn" onClick={openReports}><ClipboardCheck size={17} />Relatório executivo</button><button onClick={load}><RefreshCw size={17} />Atualizar</button></div>
    </div>

    <div className="kpiGrid compactKpis">
      <div className="kpi"><small>Score médio</small><strong>{avg}%</strong><span>qualidade do registro</span></div>
      <div className="kpi"><small>Com alerta</small><strong>{risky}</strong><span>precisam revisão</span></div>
      <div className="kpi"><small>Obs. fraca</small><strong>{noNotes}</strong><span>sem contexto suficiente</span></div>
      <div className="kpi"><small>Sem desfecho</small><strong>{noDisposition}</strong><span>chamadas incompletas</span></div>
    </div>

    <Notice msg={msg} />

    <section className="qualityGrid">
      <div className="panel">
        <div className="panelHeader"><h3><ShieldCheck size={20} />Checklist de qualidade</h3><button className="ghostBtn" onClick={() => downloadCsv(filtered)}><Download size={16} />Exportar auditoria</button></div>
        <div className="filters singleFilter"><label>Buscar<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Lead, telefone, campanha, operador ou desfecho" /></label><button onClick={() => setOnlyRisk(!onlyRisk)}><Search size={16} />{onlyRisk ? 'Mostrar todos' : 'Só alertas'}</button></div>
        {loading ? <p>Carregando...</p> : <div className="qualityList">
          {filtered.map((call) => {
            const risks = riskItems(call);
            const score = qualityScore(call);
            return <article key={call.id} className="qualityCard">
              <div className="qualityTop"><div><b>{call.lead?.name || 'Lead sem nome'}</b><span>{call.lead?.phoneNormalized || 'Sem telefone'} • {call.campaign?.name || 'Sem campanha'}</span></div><strong className={score < 70 ? 'bad' : score < 90 ? 'warn' : 'ok'}>{score}%</strong></div>
              <div className="qualityMeta"><StatusBadge status={call.finalDisposition || call.status || 'SEM_DESFECHO'} /><span>{fmt(call.createdAt)}</span><span>{call.operator?.name || 'Operador não informado'}</span></div>
              <p>{call.notes || 'Sem observação registrada.'}</p>
              <div className="riskList">{risks.length ? risks.map((risk) => <span key={risk}><AlertTriangle size={14} />{risk}</span>) : <span className="ok"><CheckCircle2 size={14} />Registro consistente</span>}</div>
              <div className="scriptSuggestion"><small><Sparkles size={14} />Mensagem sugerida</small><p>{scriptFor(call)}</p><button className="ghostBtn" onClick={() => navigator.clipboard.writeText(scriptFor(call))}><MessageSquare size={15} />Copiar texto</button></div>
            </article>;
          })}
          {!filtered.length && <div className="empty"><ClipboardCheck size={34} /><strong>Nenhum atendimento encontrado</strong><span>Faça atendimentos para iniciar a auditoria.</span></div>}
        </div>}
      </div>

      <aside className="panel accent">
        <h3><Target size={20} />Padrão recomendado</h3>
        <div className="miniGuide">
          <span>Todo atendimento precisa ter desfecho claro.</span>
          <span>Observação deve explicar motivo, objeção ou próximo passo.</span>
          <span>Retorno precisa ter data e horário combinados.</span>
          <span>Pedido de não contato deve ir para Não Ligar.</span>
          <span>Mensagem pós-ligação deve reforçar o CTA da matrícula.</span>
        </div>
      </aside>
    </section>
  </section>;
}
