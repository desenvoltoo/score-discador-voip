import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Headphones, Mic, PhoneCall, PhoneIncoming, PhoneOff, Save, Server, Wifi, WifiOff } from 'lucide-react';

type Status = 'desconectado' | 'conectando' | 'registrado' | 'chamando' | 'em_chamada' | 'erro';

type SipConfig = {
  wssUrl: string;
  sipDomain: string;
  extension: string;
  password: string;
  displayName: string;
};

const defaultConfig: SipConfig = {
  wssUrl: `wss://${window.location.hostname}:8089/ws`,
  sipDomain: window.location.hostname,
  extension: '9001',
  password: 'SenhaWebRTC9001',
  displayName: 'Supervisão WebRTC',
};

function loadConfig(): SipConfig {
  try {
    return { ...defaultConfig, ...(JSON.parse(localStorage.getItem('referencia:sip') || '{}')) };
  } catch {
    return defaultConfig;
  }
}

export default function SipSoftphone() {
  const [cfg, setCfg] = useState<SipConfig>(loadConfig());
  const [status, setStatus] = useState<Status>('desconectado');
  const [message, setMessage] = useState('Configure o WebSocket seguro do Asterisk e registre o ramal para usar o telefone no navegador.');
  const [target, setTarget] = useState('600');
  const [incoming, setIncoming] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const uaRef = useRef<any>(null);
  const registererRef = useRef<any>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);

  function save() {
    localStorage.setItem('referencia:sip', JSON.stringify(cfg));
    setMessage('Configuração SIP salva neste navegador.');
  }

  function resetDefaults() {
    localStorage.removeItem('referencia:sip');
    setCfg(defaultConfig);
    setMessage('Configuração resetada para o ramal WebRTC 9001. Clique em Registrar novamente.');
  }

  function attachAudio(s: any) {
    setTimeout(() => {
      const pc = s?.sessionDescriptionHandler?.peerConnection;
      if (!pc || !remoteAudio.current) return;
      const stream = new MediaStream();
      pc.getReceivers().forEach((r: RTCRtpReceiver) => r.track && stream.addTrack(r.track));
      remoteAudio.current!.srcObject = stream;
      remoteAudio.current!.play().catch(() => {});
      pc.ontrack = (event: RTCTrackEvent) => {
        const [mediaStream] = event.streams;
        if (mediaStream && remoteAudio.current) {
          remoteAudio.current.srcObject = mediaStream;
          remoteAudio.current.play().catch(() => {});
        }
      };
    }, 400);
  }

  async function connect() {
    try {
      setStatus('conectando');
      setMessage('Solicitando permissão do microfone e conectando no Asterisk...');
      await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      // @ts-ignore - import dinâmico para manter a tela isolada do restante do painel
      const SIP = await import('sip.js');
      const uri = SIP.UserAgent.makeURI(`sip:${cfg.extension}@${cfg.sipDomain}`);
      if (!uri) throw new Error('URI SIP inválida. Confira ramal e domínio.');

      const userAgent = new SIP.UserAgent({
        uri,
        transportOptions: { server: cfg.wssUrl },
        authorizationUsername: cfg.extension,
        authorizationPassword: cfg.password,
        displayName: cfg.displayName,
        sessionDescriptionHandlerFactoryOptions: {
          constraints: { audio: true, video: false },
          peerConnectionConfiguration: {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
          },
        },
        delegate: {
          onInvite: (invitation: any) => {
            setIncoming(invitation);
            setSession(invitation);
            setStatus('chamando');
            setMessage('Chamada recebida no navegador.');
            invitation.stateChange.addListener((state: any) => {
              if (String(state).includes('Established')) {
                setStatus('em_chamada');
                attachAudio(invitation);
              }
              if (String(state).includes('Terminated')) {
                setStatus('registrado');
                setIncoming(null);
                setSession(null);
              }
            });
          },
        },
      });

      const registerer = new SIP.Registerer(userAgent);
      await userAgent.start();
      await registerer.register();
      uaRef.current = userAgent;
      registererRef.current = registerer;
      setStatus('registrado');
      setMessage(`Ramal ${cfg.extension} registrado via WebRTC/WSS.`);
    } catch (e: any) {
      setStatus('erro');
      setMessage(e.message || 'Falha ao conectar SIP.');
    }
  }

  async function disconnect() {
    try {
      await registererRef.current?.unregister?.();
      await uaRef.current?.stop?.();
    } finally {
      uaRef.current = null;
      registererRef.current = null;
      setIncoming(null);
      setSession(null);
      setStatus('desconectado');
      setMessage('Softphone desconectado.');
    }
  }

  async function call() {
    try {
      if (!uaRef.current) throw new Error('Registre o ramal antes de ligar.');
      // @ts-ignore
      const SIP = await import('sip.js');
      const targetUri = SIP.UserAgent.makeURI(target.includes('@') ? `sip:${target}` : `sip:${target}@${cfg.sipDomain}`);
      if (!targetUri) throw new Error('Destino inválido.');
      const inviter = new SIP.Inviter(uaRef.current, targetUri, {
        sessionDescriptionHandlerOptions: { constraints: { audio: true, video: false } },
      });
      setSession(inviter);
      setStatus('chamando');
      inviter.stateChange.addListener((state: any) => {
        if (String(state).includes('Established')) {
          setStatus('em_chamada');
          attachAudio(inviter);
        }
        if (String(state).includes('Terminated')) {
          setStatus('registrado');
          setSession(null);
        }
      });
      await inviter.invite();
      setMessage(`Ligando para ${target}...`);
    } catch (e: any) {
      setStatus('erro');
      setMessage(e.message || 'Falha ao originar chamada.');
    }
  }

  async function answer() {
    try {
      await incoming?.accept({ sessionDescriptionHandlerOptions: { constraints: { audio: true, video: false } } });
      attachAudio(incoming);
      setIncoming(null);
      setStatus('em_chamada');
      setMessage('Chamada atendida.');
    } catch (e: any) {
      setMessage(e.message || 'Falha ao atender.');
    }
  }

  async function hangup() {
    try {
      if (!session) return;
      if (session.bye) await session.bye();
      else if (session.cancel) await session.cancel();
      else if (session.reject) await session.reject();
    } finally {
      setIncoming(null);
      setSession(null);
      setStatus(uaRef.current ? 'registrado' : 'desconectado');
    }
  }

  const online = status === 'registrado' || status === 'chamando' || status === 'em_chamada';

  return (
    <section className="softphoneGrid">
      <audio ref={remoteAudio} autoPlay />
      <div className="panel phonePanel">
        <div className="phoneHeader">
          <div>
            <small>Telefone WebRTC</small>
            <h2>Ramal {cfg.extension}</h2>
            <p>{message}</p>
          </div>
          <div className={`phoneStatus ${online ? 'ok' : status === 'erro' ? 'bad' : ''}`}>
            {online ? <Wifi size={18} /> : <WifiOff size={18} />}
            {status.replaceAll('_', ' ')}
          </div>
        </div>

        <div className="dialCard">
          <div className="dialDisplay"><Headphones size={22} />{target}</div>
          <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Digite 600, 1002 ou telefone" />
          <div className="dialPad">
            {'123456789*0#'.split('').map((n) => <button key={n} onClick={() => setTarget((v) => v + n)}>{n}</button>)}
          </div>
          <div className="phoneActions">
            <button onClick={connect} disabled={online}><Mic size={18} />Registrar</button>
            <button className="callBtn" onClick={call} disabled={!online || status === 'em_chamada'}><PhoneCall size={18} />Ligar</button>
            <button className="dangerBtn" onClick={hangup} disabled={!session}><PhoneOff size={18} />Encerrar</button>
          </div>
          {incoming && <div className="incomingBox"><PhoneIncoming size={22} /><b>Chamada recebida</b><button onClick={answer}>Atender</button><button className="dangerBtn" onClick={hangup}>Recusar</button></div>}
        </div>
      </div>

      <div className="panel">
        <h3><Server size={19} /> Configuração do Asterisk</h3>
        <p className="muted">O navegador não registra em SIP UDP. Para o painel funcionar como telefone, o Asterisk precisa expor SIP por WebSocket seguro: <b>WSS</b>.</p>
        <div className="formGrid">
          <label>WebSocket WSS<input value={cfg.wssUrl} onChange={(e) => setCfg({ ...cfg, wssUrl: e.target.value })} placeholder="wss://seu-dominio:8089/ws" /></label>
          <label>Domínio SIP<input value={cfg.sipDomain} onChange={(e) => setCfg({ ...cfg, sipDomain: e.target.value })} /></label>
          <label>Ramal<input value={cfg.extension} onChange={(e) => setCfg({ ...cfg, extension: e.target.value })} /></label>
          <label>Senha<input type="password" value={cfg.password} onChange={(e) => setCfg({ ...cfg, password: e.target.value })} /></label>
          <label className="wide">Nome de exibição<input value={cfg.displayName} onChange={(e) => setCfg({ ...cfg, displayName: e.target.value })} /></label>
        </div>
        <div className="phoneActions mt"><button onClick={save}><Save size={18} />Salvar configuração</button><button onClick={resetDefaults} className="ghostBtn">Usar ramal 9001</button><button onClick={disconnect} className="ghostBtn">Desconectar</button></div>
        <div className="miniGuide mt">
          <b>Checklist para ativar no navegador</b>
          <span>1. Asterisk com transporte WSS ativo na porta 8089.</span>
          <span>2. Endpoint PJSIP do ramal com <b>webrtc=yes</b>.</span>
          <span>3. Certificado válido no Asterisk para o navegador aceitar o WSS.</span>
          <span>4. Porta 8089 liberada no firewall da VPS.</span>
        </div>
      </div>

      <div className="panel accent widePanel">
        <h3><CheckCircle2 size={19} /> Próxima conexão com a operação</h3>
        <p>Depois que o ramal registrar pelo painel, vamos trocar o botão “Iniciar ligação” da Mesa do Operador para discar diretamente pelo softphone integrado, abrir screen pop em chamadas recebidas e gravar o desfecho no lead.</p>
      </div>
    </section>
  );
}
