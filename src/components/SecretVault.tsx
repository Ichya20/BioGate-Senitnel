import { useState, useEffect } from 'react';
import { Lock, Radio, Shield, Fingerprint, Activity, Database, Users, Network, TerminalSquare, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function SecretVault() {
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthenticated = sessionStorage.getItem('biogate_auth') === 'true';

  const agentName =
  location.state?.agentName || sessionStorage.getItem('biogate_agent');

  const agentRole =
    location.state?.agentRole || sessionStorage.getItem('biogate_role') || 'Authorized Agent';

  const formattedName = agentName
    ? agentName.toUpperCase().split(' ').join('_')
    : '';

  const [time, setTime] = useState('');
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !agentName) {
      navigate('/');
    }
  }, [isAuthenticated, agentName, navigate]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const formattedTime = now.toLocaleTimeString('en-US', { hour12: false });
      setTime(`${formattedTime} WIB`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!isAuthenticated || !agentName) return;

    const interval = setInterval(() => {
      setSessionSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, agentName]);

  useEffect(() => {
  if (!isAuthenticated || !agentName) return;

  const now = new Date();
  const timestamp = now.toLocaleTimeString('en-US', { hour12: false });

  setLogs([
    `> [${timestamp}] AGENT_AUTH_CONFIRMED: ${agentName}`,
    `> [${timestamp}] ROLE_ASSIGNED: ${agentRole}`,
    "> [SYSTEM] Initializing secure handshake...",
    "> [SYSTEM] Handshake acknowledged. Key exchange AES-256-GCM.",
    "> [SYSTEM] AUTH_METHOD: FACE_ID + VOICE_SIGNATURE",
    "> [SYSTEM] SESSION_TOKEN: LOCAL_SECURE_SESSION",
    "> [SYSTEM] Opening full encrypted directory tree...",
    "> [SYSTEM] Restricted sub-folders now accessible."
  ]);
}, [isAuthenticated, agentName, agentRole]);

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const handleTerminate = () => {
  setShowTerminateConfirm(true);
  };

  const confirmTerminateSession = () => {
  speak("Terminating secure session. Goodbye Agent.");

  sessionStorage.removeItem('biogate_auth');
  sessionStorage.removeItem('biogate_agent');
  sessionStorage.removeItem('biogate_role');

  setShowTerminateConfirm(false);

  setTimeout(() => {
    navigate('/');
  }, 1200);
};

  const personnel = [
    { name: "Ichya Ulumiddiin", role: "System Lead" },
    { name: "Abid Fadhilah", role: "Security Architect" },
    { name: "Iklil Bahy Sabaiki", role: "Network specialist" },
    { name: "Nathan Domuni", role: "DB Specialist" },
    { name: "Nashir Khoirul", role: "Protocol Analyst" },
    { name: "Arif Kurniawan", role: "UI/UX specialist" }
  ];

  const formatSessionTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
  const pushVaultLog = (message: string) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString('en-US', { hour12: false });

    setLogs(prev => [
      `> [${timestamp}] ${message}`,
      ...prev,
    ].slice(0, 8));
  };
  
  const showToast = (message: string) => {
  setToastMessage(message);

  window.setTimeout(() => {
    setToastMessage('');
    }, 2500);
  };

  const ActionButton = ({
    icon: Icon,
    label,
    danger,
    onClick
  }: {
    icon: any;
    label: string;
    danger?: boolean;
    onClick?: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`flex-1 neon-border hover:bg-[var(--emerald)] hover:text-black transition-all text-[10px] font-bold tracking-widest flex items-center justify-center gap-2 py-3 lg:py-0 ${
        danger
          ? 'bg-red-950/20 border-red-900 text-red-500 hover:bg-red-500'
          : 'bg-[#00ff88]/10 text-[var(--emerald)]'
      }`}
    >
      <Icon className="w-4 h-4 hidden sm:block" />
      <span>{`{> ${label}}`}</span>
    </button>
  );

  if (!isAuthenticated || !agentName) {
    return null;
  }

  return (
    <div className="h-screen w-full flex flex-col p-4 sm:p-6 gap-4 relative selection:bg-[var(--emerald)] selection:text-black">
    {toastMessage && (
      <div className="fixed right-5 top-5 z-[9999] border border-[var(--emerald)] bg-black/90 px-5 py-3 font-mono text-[10px] font-black tracking-[0.3em] text-[var(--emerald)] shadow-[0_0_25px_rgba(0,255,136,0.35)]">
        {toastMessage}
      </div>
    )}

    {showTerminateConfirm && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm">
        <div className="relative w-[90%] max-w-xl border border-red-500/70 bg-black/90 p-7 text-center font-mono shadow-[0_0_45px_rgba(239,68,68,0.45)]">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 px-4 py-1 text-[9px] font-black tracking-[0.45em] text-white">
            SESSION CONTROL
          </div>

          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/70 bg-red-500/10 shadow-[0_0_25px_rgba(239,68,68,0.45)]">
            <LogOut className="h-8 w-8 text-red-500" />
          </div>

          <h2 className="mb-3 text-2xl font-black tracking-[0.25em] text-red-500 md:text-3xl">
            TERMINATE SESSION?
          </h2>

          <p className="mx-auto mb-6 max-w-md text-[10px] leading-relaxed tracking-[0.25em] text-red-200/80">
            THIS ACTION WILL CLOSE THE CURRENT SECURE VAULT ACCESS AND RETURN THE SYSTEM TO THE BIOMETRIC GATEWAY.
          </p>

          <div className="mb-6 grid grid-cols-1 gap-2 border border-red-500/30 bg-red-950/10 p-3 text-left text-[10px] tracking-widest text-red-300 md:grid-cols-2">
            <div>
              <span className="text-red-500/70">AGENT:</span> {agentName}
            </div>
            <div>
              <span className="text-red-500/70">ROLE:</span> {agentRole}
            </div>
            <div>
              <span className="text-red-500/70">SESSION:</span> {formatSessionTime(sessionSeconds)}
            </div>
            <div>
              <span className="text-red-500/70">STATUS:</span> ACTIVE
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <button
              onClick={() => {
                setShowTerminateConfirm(false);
                speak("Termination cancelled.");
              }}
              className="flex-1 border border-emerald-700 bg-emerald-950/20 px-5 py-3 text-[10px] font-black tracking-[0.3em] text-emerald-400 transition-all hover:bg-emerald-500 hover:text-black"
            >
              CANCEL
            </button>

            <button
              onClick={confirmTerminateSession}
              className="flex-1 border border-red-500 bg-red-500/10 px-5 py-3 text-[10px] font-black tracking-[0.3em] text-red-400 transition-all hover:bg-red-500 hover:text-black"
            >
              TERMINATE
            </button>
          </div>
        </div>
      </div>
    )}
      <div className="crt-overlay"></div>
      <div className="vignette"></div>
      <div className="scan-line"></div>

      <motion.div
        initial={{ opacity: 0, scale: 1.3, filter: 'blur(20px) brightness(0)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px) brightness(1)' }}
        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full h-full max-w-[1200px] mx-auto flex flex-col gap-4 flex-grow"
      >
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center text-xs tracking-tighter border-b border-emerald-900 pb-2 mb-2 gap-2">
          <div className="flex gap-4 md:gap-6 items-center">
            <Lock className="w-4 h-4 text-[var(--emerald)] neon-text" />
            <h1 className="neon-text font-bold text-xs md:text-sm text-[var(--emerald)]">
              &gt;&gt; SENTINEL_VAULT_ACCESS <span className="opacity-60">// LEVEL_5_CLEARANCE</span>
            </h1>
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center">
            <span className="flex items-center gap-2 opacity-80">
              <span className="w-2 h-2 rounded-full bg-[var(--emerald)] animate-pulse shadow-[0_0_5px_#00ff88]"></span>
              [SECURE_CONNECTION: ACTIVE]
            </span>

            <div className="flex items-center gap-2 opacity-80 text-emerald-600">
              <Shield className="w-3 h-3" />
              <span>[ENCRYPTION: AES-256-GCM]</span>
            </div>

            <span className="font-bold">{time}</span>
          </div>
        </header>

        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-6 gap-4 min-h-0">
          <div className="lg:col-span-12 lg:row-span-2 flex flex-col items-center justify-center neon-bg neon-border rounded-sm relative overflow-hidden py-6 lg:py-4">
            <div className="absolute left-4 top-2 text-[10px] opacity-40">AUTHENTICATED_SESSION</div>
            <Fingerprint className="absolute opacity-10 scale-150 right-10 bottom-0 w-24 h-24 text-[var(--emerald)]" />

            <h2 className="text-xl md:text-3xl lg:text-4xl font-bold tracking-widest neon-text mb-1 z-10 text-center text-[var(--emerald)]">
              WELCOME, AGENT_{formattedName}
            </h2>

            <p className="text-xs opacity-60 tracking-[0.4em] z-10 text-center">
              BIOMETRIC_SERIAL: BS-9045-A // SECTOR_07
            </p>
              <div className="mt-4 grid w-[90%] max-w-3xl grid-cols-1 gap-2 text-left font-mono text-[10px] tracking-widest md:grid-cols-3">
          <div className="border border-emerald-900 bg-black/40 p-2">
            <div className="mb-1 text-emerald-700">ACTIVE_AGENT</div>
            <div className="text-[var(--emerald)]">{agentName}</div>
          </div>

          <div className="border border-emerald-900 bg-black/40 p-2">
            <div className="mb-1 text-emerald-700">CLEARANCE_ROLE</div>
            <div className="text-[var(--emerald)]">{agentRole}</div>
          </div>

          <div className="border border-emerald-900 bg-black/40 p-2">
            <div className="mb-1 text-emerald-700">SESSION_ACTIVE</div>
            <div className="text-[var(--emerald)]">{formatSessionTime(sessionSeconds)}</div>
          </div>
        </div>
        <div className="z-10 mt-3 border border-emerald-900/70 bg-black/40 px-3 py-2 font-mono text-[9px] tracking-[0.25em] text-emerald-700">
            BIOMETRIC_PROTOTYPE: FACE_RECOGNITION + VOICE_SIGNATURE_VERIFICATION
        </div>
          </div>

          <div className="lg:col-span-5 lg:row-span-2 flex flex-col neon-border rounded-sm p-4 bg-black/40 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-emerald-900 pb-1 mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 opacity-80" />
                <h3 className="text-xs font-bold tracking-widest">[AUTHORIZED_PERSONNEL]</h3>
              </div>
            </div>

            <div className="flex flex-col gap-3 flex-grow overflow-y-auto pr-2 custom-scrollbar">
              {personnel.map((p, index) => (
                <div key={index} className="flex justify-between items-center group cursor-crosshair">
                  <span className="group-hover:text-[var(--emerald)] transition-colors text-sm opacity-90">
                    {p.name}
                  </span>
                  <span className="text-emerald-700 group-hover:text-emerald-500 text-[10px] uppercase font-bold tracking-wider transition-colors">
                    {p.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 lg:row-span-2 flex flex-col neon-border rounded-sm p-4 bg-black/40 relative">
            <div className="flex items-center gap-2 mb-4 border-b border-emerald-900 pb-1">
              <Activity className="w-4 h-4 opacity-80" />
              <h3 className="text-xs font-bold tracking-widest">[SYSTEM_STATUS]</h3>
            </div>

            <div className="space-y-6 flex-grow flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] mb-1 opacity-80">
                  <span>AI_MODEL_STABILITY</span>
                  <span>85%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '85%' }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] mb-1 opacity-80">
                  <span>NETWORK_LATENCY</span>
                  <span className="text-emerald-300">2MS</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '98%' }}></div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border border-emerald-900 bg-emerald-950/20">
                <div className="flex flex-col">
                  <span className="text-[10px] opacity-60">FIREWALL_INTEGRITY</span>
                  <span className="text-lg font-bold neon-text mt-1 leading-tight text-[var(--emerald)]">
                    OPTIMAL
                  </span>
                </div>

                <div className="h-8 w-8 flex items-center justify-center border border-[var(--emerald)] rounded-full neon-border">
                  <span className="w-4 h-4 bg-[var(--emerald)] rounded-full animate-ping opacity-30"></span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-12 lg:row-span-2 flex flex-col neon-border rounded-sm p-4 bg-black/80 font-mono text-xs overflow-hidden">
            <div className="flex items-center gap-2 mb-2 border-b border-emerald-900 pb-1">
              <TerminalSquare className="w-4 h-4 opacity-80" />
              <h3 className="tracking-widest font-bold">[CLASSIFIED_INTEL_LOGS]</h3>
            </div>

            <div className="flex flex-col gap-1 overflow-y-hidden opacity-80 space-y-1 custom-scrollbar">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className={`${i === logs.length - 1 ? 'animate-[pulse_2s_ease-in-out_infinite] neon-text' : 'opacity-80'}`}
                >
                  {log}
                </div>
              ))}

              <div className="flex gap-2 items-center text-emerald-300 mt-1">
                <span>&gt;</span>
                <span className="w-2 h-4 bg-[var(--emerald)] animate-pulse"></span>
              </div>
            </div>
          </div>
        </main>

        <footer className="flex flex-col md:flex-row gap-4 mt-2 h-auto lg:h-16 shrink-0">
          <ActionButton
            icon={LogOut}
            label="TERMINATE_SESSION"
            danger
            onClick={handleTerminate}
          />

          <ActionButton
            icon={Database}
            label="ACCESS_USER_RECORDS"
            onClick={() => {
              pushVaultLog("USER_RECORDS directory opened.");
              showToast("USER_RECORDS OPENED");
              speak("User records directory opened.");
            }}
          />

          <ActionButton
            icon={Network}
            label="NETWORK_FEEDS"
            onClick={() => {
              pushVaultLog("NETWORK_FEEDS synchronized successfully.");
              showToast("NETWORK_FEEDS SYNCED");
              speak("Network feeds synchronized.");
            }}
          />

          <ActionButton
            icon={Radio}
            label="PROTOCOL_SETTING"
            onClick={() => {
              pushVaultLog("PROTOCOL_SETTING locked in prototype mode.");
              showToast("PROTOCOL LOCKED");
              speak("Protocol setting is locked in prototype mode.");
            }}
          />
        </footer>
      </motion.div>
    </div>
  );
}