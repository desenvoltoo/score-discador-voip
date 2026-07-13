import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, RefreshCw, Search } from 'lucide-react';
import { api } from '../services/api';
import Notice, { type NoticeMessage } from '../components/Notice';
import '../ops-pages.css';

function fmt(v: any) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return v.toLocaleString('pt-BR');
  if (String(v).includes('T')) return String(v).replace('T', ' ').slice(0, 16);
  return String(v);
}

function downloadCsv(name: string, rows: any[]) {
  const headers = ['arquivo', 'campanha', 'lidos', 'importados', 'duplicados', 'invalidos', 'bloqueados', 'data'];
  const csv = [headers.join(';'), ...rows.map((r) => [
    r.fileName,
    r.campaign?.name,
    r.totalRead,
    r.totalImported,
    r.duplicates,
    r.invalid,
    r.blocked,
    r.createdAt,
  ].map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(';'))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  a.click();
}

export default function ImportHistoryPage({ openImport }: { openImport: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<NoticeMessage>(null);

  async function load() {
    try {
      setLoading(true);
      setRows(await api('/imports'));
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Não foi possível carregar histórico.' });
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => !q || [r.fileName, r.campaign?.name].join(' ').toLowerCase().includes(q));
  }, [rows, query]);

  const totals = useMemo(() => filtered.reduce((acc, r) => ({
    totalRead: acc.totalRead + Number(r.totalRead || 0),
    totalImported: acc.totalImported + Number(r.totalImported || 0),
    duplicates: acc.duplicates + Number(r.duplicates || 0),
    invalid: acc.invalid + Number(r.invalid || 0),
    blocked: acc.blocked + Number(r.blocked || 0),
  }), { totalRead: 0, totalImported: 0, duplicates: 0, invalid: 0, blocked: 0 }), [filtered]);

  return <section>
    <div className="heroPanel heroPremium">
      <div>
        <small>Histórico de importações</small>
        <h2>Rastreie bases enviadas, rejeições e aproveitamento</h2>
        <p>Veja arquivo, campanha, quantidade lida, importados, duplicados, inválidos e bloqueados para validar a qualidade da base.</p>
      </div>
      <div className="heroActions"><button className="ghostBtn" onClick={openImport}><FileSpreadsheet size={17} />Nova importação</button><button onClick={load}><RefreshCw size={17} />Atualizar</button></div>
    </div>

    <div className="kpiGrid compactKpis">
      <div className="kpi"><small>Lidos</small><strong>{fmt(totals.totalRead)}</strong><span>linhas processadas</span></div>
      <div className="kpi"><small>Importados</small><strong>{fmt(totals.totalImported)}</strong><span>entraram na fila</span></div>
      <div className="kpi"><small>Duplicados</small><strong>{fmt(totals.duplicates)}</strong><span>ignorados</span></div>
      <div className="kpi"><small>Inválidos/Bloq.</small><strong>{fmt(totals.invalid + totals.blocked)}</strong><span>corrigir base</span></div>
    </div>

    <Notice msg={msg} />

    <div className="panel">
      <div className="panelHeader"><h3><FileSpreadsheet size={20} />Últimas importações</h3><button className="ghostBtn" onClick={() => downloadCsv('historico-importacoes-referencia.csv', filtered)}><Download size={16} />Exportar resumo</button></div>
      <div className="filters singleFilter"><label>Buscar<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Arquivo ou campanha" /></label><button onClick={load}><Search size={16} />Buscar</button></div>
      {loading ? <p>Carregando...</p> : <div className="tableWrap"><table><thead><tr><th>Arquivo</th><th>Campanha</th><th>Lidos</th><th>Importados</th><th>Duplicados</th><th>Inválidos</th><th>Bloqueados</th><th>Data</th></tr></thead><tbody>{filtered.map((r) => <tr key={r.id}><td>{fmt(r.fileName)}</td><td>{fmt(r.campaign?.name)}</td><td>{fmt(r.totalRead)}</td><td>{fmt(r.totalImported)}</td><td>{fmt(r.duplicates)}</td><td>{fmt(r.invalid)}</td><td>{fmt(r.blocked)}</td><td>{fmt(r.createdAt)}</td></tr>)}</tbody></table>{!filtered.length && <div className="empty"><FileSpreadsheet size={34} /><strong>Nenhuma importação encontrada</strong><span>Faça uma importação para começar o histórico.</span></div>}</div>}
    </div>
  </section>;
}
