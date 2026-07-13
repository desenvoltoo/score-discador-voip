import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Download, MessageSquare, RefreshCw, Search, ShieldCheck, Sparkles, Target, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import Notice, { type NoticeMessage } from '../components/Notice';
import StatusBadge from '../components/StatusBadge';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { exportCsv } from '../utils/exportCsv';
import { formatDateTime, formatStatus } from '../utils/format';
import '../ops-pages.css';
import '../crm-polish.css';
import '../styles/management-pages.css';

type Lead = { id: string; name?: string; phoneNormalized?: string; course?: string; origin?: string; status?: string; notes?: string; attemptsCount?: number; callbackAt?: string; doNotCall?: boolean; campaign?: { name?: string } };
type CallRow = { id: string; status?: string; finalDisposition?: string; notes?: string; createdAt?: string; lead?: Lead; operator?: { name?: string }; campaign?: { name?: string } };

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

export default function QualityCenterPage({ openReports }: { openReports: () => void }) {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [query, setQuery] = useState('');
  const [onlyRisk, setOnlyRisk] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [msg, setMsg] = useState<NoticeMessage>(null);
  const { pending: loading, run } = useAsyncAction();

  async function load() {
    await run(async () => {
      try {
        const rows = await api('/reports/calls');
        setCalls(Array.isArray(rows) ? rows : []);
        setPage(1);
      } catch (error: unknown) {
        const text = error instanceof Error ? error.message : 'Não foi possível carregar auditoria.';
        setMsg({ type: 'err', text });
      }
    });
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
    return calls.filter((call) => {
      const haystack = [call.lead?.name, call.lead?.phoneNormalized, call.operator?.name, call.campaign?.name, call.finalDisposition, call.notes].join(' ').toLocaleLowerCase('pt-BR');
      const risky = riskItems(call).length > 0;
      return (!normalizedQuery || haystack.includes(normalizedQuery)) && (!onlyRisk || risky);
    });
  }, [calls, query, onlyRisk]);

  useEffect(() => { setPage(1); }, [query, onlyRisk, pageSize]);

  const avg = useMemo(() => filtered.length ? Math.round(filtered.reduce((sum, call) => sum + qualityScore(call), 0) / filtered.length) : 0, [filtered]);
  const risky = filtered.filter((call) => riskItems(call).length).length;
  const noNotes = filtered.filter((call) => !call.notes || call.notes.trim().length < 12).length;
  const noDisposition = filtered.filter((call) => !call.finalDisposition).length;
  const excellent = filtered.filter((call) => qualityScore(call) >= 90).length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function download() { exportCsv('qualidade-atendimento-referencia.csv', ['data', 'campanha', 'operador', 'lead', 'telefone', 'desfecho', 'score_qualidade', 'alertas', 'observacao'], filtered.map((row) => [row.createdAt, row.campaign?.name, row.operator?.name, row.lead?.name, row.lead?.phoneNormalized, row.finalDisposition, qualityScore(row), riskItems(row).join(', '), row.notes])); }

  async function copyScript(call: CallRow) {
    try { await navigator.clipboard.writeText(scriptFor(call)); setMsg({ type: 'ok', text: 'Mensagem sugerida copiada.' }); }
    catch { setMsg({ type: 'err', text: 'Não foi possível copiar a mensagem.' }); }
  }

  return <section className="qualityCenter polishPage">
    <div className="polishHero qualityHero"><div><small>Qualidade e auditoria</small><h2>Supervisão visual de atendimento, registro e compliance</h2><p>Encontre rapidamente observações fracas, desfechos ausentes, retornos sem data e mensagens de WhatsApp recomendadas por atendimento.</p></div><div className="heroStack"><button className="ghostBtn" onClick={openReports}><ClipboardCheck size={17} />Relatório executivo</button><button onClick={() => void load()} disabled={loading}><RefreshCw size={17} />{loading ? 'Atualizando...' : 'Atualizar'}</button></div></div>
    <div className="polishKpis qualityKpis"><div><small>Score médio</small><strong>{avg}%</strong><span>qualidade do registro</span></div><div><small>Com alerta</small><strong>{risky}</strong><span>precisam revisão</span></div><div><small>Obs. fraca</small><strong>{noNotes}</strong><span>sem contexto suficiente</span></div><div><small>Excelentes</small><strong>{excellent}</strong><span>acima de 90%</span></div></div>
    <Notice msg={msg} />
    <section className="qualityGrid qualityGridPolish">
      <div className="panel qualityMainPanel"><div className="panelHeader"><h3><ShieldCheck size={20} />Checklist de qualidade</h3><button className="ghostBtn" onClick={download} disabled={!filtered.length}><Download size={16} />Exportar auditoria</button></div><div className="filters singleFilter qualityFilters"><label>Buscar<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Lead, telefone, campanha, operador ou desfecho" /></label><button onClick={() => setOnlyRisk((value) => !value)}><Search size={16} />{onlyRisk ? 'Mostrar todos' : 'Só alertas'}</button></div>{loading ? <p>Carregando...</p> : <div className="qualityList qualityListPolish">{pageRows.map((call) => { const risks = riskItems(call); const score = qualityScore(call); return <article key={call.id} className={`qualityCard qualityCardPolish ${score < 70 ? 'riskHigh' : score < 90 ? 'riskMedium' : 'riskOk'}`}><div className="qualityTop"><div><b>{call.lead?.name || 'Lead sem nome'}</b><span>{call.lead?.phoneNormalized || 'Sem telefone'} • {call.campaign?.name || 'Sem campanha'}</span></div><strong className={score < 70 ? 'bad' : score < 90 ? 'warn' : 'ok'}>{score}%</strong></div><div className="qualityMeta"><StatusBadge status={call.finalDisposition || call.status || 'SEM_DESFECHO'} /><span>{formatDateTime(call.createdAt)}</span><span>{call.operator?.name || 'Operador não informado'}</span></div><p>{call.notes || 'Sem observação registrada.'}</p><div className="riskList riskListPolish">{risks.length ? risks.map((risk) => <span key={risk}><AlertTriangle size={14} />{risk}</span>) : <span className="ok"><CheckCircle2 size={14} />Registro consistente</span>}</div><div className="scriptSuggestion scriptPolish"><small><Sparkles size={14} />Mensagem sugerida</small><p>{scriptFor(call)}</p><button className="ghostBtn" onClick={() => void copyScript(call)}><MessageSquare size={15} />Copiar texto</button></div></article>; })}{!filtered.length && <div className="empty"><ClipboardCheck size={34} /><strong>Nenhum atendimento encontrado</strong><span>Faça atendimentos ou altere os filtros.</span></div>}</div>}{!!filtered.length && <div className="paginationBar"><label>Cards<select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label><span>Página {safePage} de {totalPages} • {filtered.length} registros</span><div><button className="ghostBtn" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button><button className="ghostBtn" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Próxima</button></div></div>}</div>
      <aside className="panel accent qualityRules"><h3><Target size={20} />Padrão recomendado</h3><div className="qualityRuleList"><span><CheckCircle2 size={16} />Desfecho claro em todo atendimento.</span><span><TrendingUp size={16} />Observação com objeção ou próximo passo.</span><span><span className="calendarMini" />Retorno sempre com data e horário.</span><span><ShieldCheck size={16} />Pedido de não contato deve ir para Não Ligar.</span><span><Sparkles size={16} />Mensagem pós-ligação reforça o CTA.</span></div><div className="qualitySummaryBox"><b>{noDisposition}</b><span>chamadas sem desfecho precisam ser revisadas primeiro.</span></div><p className="muted">Status exibidos: {formatStatus(onlyRisk ? 'SOMENTE_ALERTAS' : 'TODOS')}</p></aside>
    </section>
  </section>;
}
