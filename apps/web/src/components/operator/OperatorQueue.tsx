import React, { useMemo, useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import type { OperatorLead } from '../../types/operator';

interface Props {
  queue: OperatorLead[];
  selectedLeadId?: string;
  onSelect: (lead: OperatorLead) => void;
}

function label(value?: string | null) {
  return value?.trim() || 'Não informado';
}

export default function OperatorQueue({ queue, selectedLeadId, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [onlyCallbacks, setOnlyCallbacks] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return queue.filter((lead) => {
      if (onlyCallbacks && !lead.callbackAt) return false;
      if (!term) return true;
      return [lead.name, lead.phoneNormalized, lead.course, lead.origin, lead.campaign]
        .some((value) => value?.toLocaleLowerCase('pt-BR').includes(term));
    });
  }, [onlyCallbacks, queue, search]);

  return <div className="panel queuePanel queuePolish">
    <div className="queueHeader">
      <div><h3><ClipboardList size={19} />Próximos da fila</h3><small>{filtered.length} de {queue.length} leads</small></div>
      <label className="queueToggle"><input type="checkbox" checked={onlyCallbacks} onChange={(event) => setOnlyCallbacks(event.target.checked)} />Só retornos</label>
    </div>
    <label className="queueSearch"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nome, telefone, curso..." /></label>
    <div className="queueItems">
      {filtered.slice(0, 30).map((item, index) => <button className={`queueItem queueItemRich ${selectedLeadId === item.id ? 'active' : ''}`} key={item.id} onClick={() => onSelect(item)}>
        <span className="queuePosition">{index + 1}</span>
        <span className="queueIdentity"><b>{label(item.name)}</b><small>{label(item.phoneNormalized)}</small><em>{label(item.course)} • {label(item.origin)}</em></span>
        <span className="queueMeta"><b>{item.attemptsCount || 0} tent.</b><small>{item.callbackAt ? 'Retorno agendado' : item.campaign || 'Fila geral'}</small></span>
      </button>)}
      {!filtered.length && <p className="muted queueEmpty">Nenhum lead encontrado com os filtros atuais.</p>}
    </div>
  </div>;
}
