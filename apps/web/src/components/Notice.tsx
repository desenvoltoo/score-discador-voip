import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export type NoticeMessage = { type: 'ok' | 'err' | 'info'; text: string } | null;

export default function Notice({ msg }: { msg: NoticeMessage }) {
  if (!msg) return null;
  const Icon = msg.type === 'err' ? AlertTriangle : msg.type === 'info' ? Info : CheckCircle2;
  return <div className={`notice ${msg.type}`}><Icon size={18} /><span>{msg.text}</span></div>;
}
