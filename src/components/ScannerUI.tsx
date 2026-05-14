/**
 * BioGate Sentinel: Scanner UI Component (Integrated with Teachable Machine)
 * Features:
 * 1. Real-Time Auto Face Detection via Teachable Machine Model
 * 2. Animated Confidence & Vector Counter based on real prediction
 * 3. Voice Verification via Web Speech API
 * 4. Covert Duress Protocol
 * 5. Real-time Clock & Live Activity Logs
 * 6. TTS Voice Notifications
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, CheckCircle, AlertTriangle, Lock, Fingerprint, ShieldAlert, UserX, Shield } from 'lucide-react';
import { AuthResponse, User } from '../types';
import * as tmImage from '@teachablemachine/image';
import { useNavigate } from 'react-router-dom';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type Phase = 'scanning' | 'face_found' | 'face_denied' | 'voice' | 'result';

interface LogEntry {
  time: string;
  status: 'GRANTED' | 'DENIED';
  user: string;
}

const ALL_USERS = [
  { id: 1, name: 'Ichya Ulumiddiin' },
  { id: 2, name: 'Abid Fadhilah Mustofa' },
  { id: 3, name: 'Iklil Bahy Sabaiki' },
  { id: 4, name: 'Nathan Domuni Pasaribu' },
  { id: 5, name: 'Nashir Khoirul Huda' },
  { id: 6, name: 'Arif Kurniawan' },
];

const INITIAL_LOGS: LogEntry[] = [
  { time: '14:21:44', status: 'GRANTED', user: 'I. Bahy Sabaiki' },
  { time: '14:20:12', status: 'DENIED',  user: 'INVALID_VOICE_PATTERN' },
  { time: '14:18:55', status: 'GRANTED', user: 'A. Fadhilah Mustofa' },
  { time: '14:15:30', status: 'GRANTED', user: 'N. Khoirul Huda' },
  { time: '14:10:02', status: 'DENIED',  user: 'UNRECOGNIZED_FACE_ID' },
];

function getTimeString(): string {
  return new Date().toLocaleTimeString('id-ID', { hour12: false });
}

function speak(text: string) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function getUserPassphrase(userName: string): string {
  if (userName.includes("Ichya")) return "IZIN MASUK";
  if (userName.includes("Abid")) return "AKSES KEAMANAN";
  if (userName.includes("Iklil")) return "JARINGAN NETWORK";
  if (userName.includes("Nathan")) return "DATA DATABASE";
  if (userName.includes("Nashir")) return "PROTOKOL ANALISIS";
  if (userName.includes("Arif")) return "TAMPILAN SISTEM";
  return "AKSES MASUK";
}

function playDuressAlarm(durationMs = 5000) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(850, audioContext.currentTime);

    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.25, audioContext.currentTime + 0.05);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();

    const interval = window.setInterval(() => {
      oscillator.frequency.setValueAtTime(850, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1150, audioContext.currentTime + 0.2);
    }, 400);

    window.setTimeout(() => {
      window.clearInterval(interval);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.1);
      oscillator.stop(audioContext.currentTime + 0.15);
      window.setTimeout(() => audioContext.close(), 300);
    }, durationMs);
  } catch (error) {
    console.error('Duress alarm failed:', error);
  }
}

export default function ScannerUI() {
  const navigate = useNavigate();
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [phase, setPhase]               = useState<Phase>('scanning');
  const [users, setUsers]               = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUnknown, setIsUnknown]       = useState(false);
  const [scanningIndex, setScanningIndex] = useState(0);
  const [confidence, setConfidence]     = useState(0);
  const [vectors, setVectors]           = useState(0);
  const [isListening, setIsListening]   = useState(false);
  const [transcript, setTranscript]     = useState('');
  const [authResult, setAuthResult]     = useState<AuthResponse | null>(null);
  const [isDuress, setIsDuress]         = useState(false);
  const [showDuressPopup, setShowDuressPopup] = useState(false);
  const [logs, setLogs]                 = useState<LogEntry[]>(INITIAL_LOGS);
  const [currentTime, setCurrentTime]   = useState(getTimeString());
  const [phraseVisible, setPhraseVisible] = useState(false);
  const [voiceBars, setVoiceBars]       = useState([0.4, 0.7, 1, 0.6, 0.8, 0.7, 0.4]);

  // Teachable Machine States
  const [model, setModel] = useState<tmImage.CustomMobileNet | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  const videoRef        = useRef<HTMLVideoElement>(null);
  const recognitionRef  = useRef<any>(null);
  const barIntervalRef  = useRef<any>(null);
  const requestRef      = useRef<number>(0);

  // ── Real-time clock ──────────────────────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => setCurrentTime(getTimeString()), 1000);
    return () => clearInterval(tick);
  }, []);

  // ── Camera ───────────────────────────────────────────────────────────────
  useEffect(() => {
    // 1. TAMBAHKAN IF: Hanya eksekusi jika tombol sudah diklik
    if (hasStarted) {
      if (navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
          .catch(() => {});
      }
    }
    return () => {
      if (videoRef.current?.srcObject)
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    };
  }, [hasStarted]);

  // ── Fetch users ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers).catch(() => setUsers(ALL_USERS));
  }, []);

  // ── Load Teachable Machine Model ─────────────────────────────────────────
  useEffect(() => {
    const loadModel = async () => {
      try {
        const URL = "/my_model/";
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";
        const loadedModel = await tmImage.load(modelURL, metadataURL);
        setModel(loadedModel);
        setIsModelLoading(false);
        console.log("Teachable Machine Model Loaded Successfully!");
      } catch (error) {
        console.error("Gagal memuat model. Pastikan file ada di folder public/my_model/", error);
      }
    };
    loadModel();
  }, []);

  // ── Speech recognition ───────────────────────────────────────────────────
  const selectedUserRef  = useRef<User | null>(null);
  const verifyMFARef     = useRef<(phrase: string) => void>(() => {});
  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.lang = 'id-ID';
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      setIsListening(false);
      verifyMFARef.current(text);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend   = () => setIsListening(false);
    recognitionRef.current = rec;
  }, []);

// ── Verify MFA ───────────────────────────────────────────────────────────
const verifyMFA = useCallback(async (spokenPhrase: string) => {
  const user = selectedUserRef.current;
  if (!user) return;

  const recognizedText = spokenPhrase.toLowerCase().trim();

  let isMatch = false;
  let assignedRole = 'Authorized Agent';

  if (user.name.includes("Ichya")) {
    isMatch = recognizedText.includes("izin") || recognizedText.includes("masuk");
    assignedRole = 'System Lead';

  } else if (user.name.includes("Abid")) {
    isMatch = recognizedText.includes("akses") || recognizedText.includes("keamanan");
    assignedRole = 'Security Architect';

  } else if (user.name.includes("Iklil")) {
    isMatch = recognizedText.includes("jaringan") || recognizedText.includes("network");
    assignedRole = 'Network Specialist';

  } else if (user.name.includes("Nathan")) {
    isMatch = recognizedText.includes("data") || recognizedText.includes("database");
    assignedRole = 'DB Specialist';

  } else if (user.name.includes("Nashir")) {
    isMatch = recognizedText.includes("protokol") || recognizedText.includes("analisis");
    assignedRole = 'Protocol Analyst';

  } else if (user.name.includes("Arif")) {
    isMatch = recognizedText.includes("tampilan") || recognizedText.includes("sistem");
    assignedRole = 'UI/UX Specialist';

  } else {
    isMatch = recognizedText.includes("akses") || recognizedText.includes("masuk");
    assignedRole = 'Standard User';
  }

  const isDuressMatch =
    recognizedText.includes("darurat") ||
    recognizedText.includes("emergency") ||
    recognizedText.includes("bahaya");

  // DURESS: warning beberapa detik + alarm, lalu balik ke page awal
  if (isDuressMatch) {
    setAuthResult({
      status: 'error',
      message: 'DURESS PROTOCOL ACTIVE. UNKNOWN USER WARNING TRIGGERED.',
    });

    setIsDuress(true);
    setIsUnknown(true);
    setShowDuressPopup(true);
    setIsListening(false);
    setPhase('result');

    recognitionRef.current?.stop();

    speak('Access Denied. Duress protocol activated.');
    playDuressAlarm(5000);

    const newLog: LogEntry = {
      time: getTimeString(),
      status: 'DENIED',
      user: 'DURESS_PROTOCOL_UNKNOWN_USER',
    };

    setLogs(prev => [newLog, ...prev].slice(0, 12));

    sessionStorage.removeItem('biogate_auth');
    sessionStorage.removeItem('biogate_agent');
    sessionStorage.removeItem('biogate_role');
    sessionStorage.removeItem('biogate_duress');

    window.setTimeout(() => {
      recognitionRef.current?.stop();

      setHasStarted(false);
      setPhase('scanning');
      setConfidence(0);
      setVectors(0);
      setScanningIndex(0);
      setSelectedUser(null);
      setIsUnknown(false);
      setTranscript('');
      setAuthResult(null);
      setIsDuress(false);
      setShowDuressPopup(false);
      setPhraseVisible(false);
      setIsListening(false);

      window.history.replaceState(null, '', '/');
    }, 5000);

    return;
  }

  // NORMAL: voice cocok, masuk vault
  if (isMatch) {
    setAuthResult({
      status: 'success',
      user: {
        name: user.name,
        role: assignedRole,
      },
    });

    setIsDuress(false);
    setShowDuressPopup(false);
    setIsUnknown(false);
    setPhase('result');

    speak(`Access Granted. Welcome back, ${assignedRole} ${user.name}`);

    const newLog: LogEntry = {
      time: getTimeString(),
      status: 'GRANTED',
      user: user.name[0] + '. ' + user.name.split(' ').slice(-1)[0],
    };

    setLogs(prev => [newLog, ...prev].slice(0, 12));

    window.setTimeout(() => {
      sessionStorage.setItem('biogate_auth', 'true');
      sessionStorage.setItem('biogate_agent', user.name);
      sessionStorage.setItem('biogate_role', assignedRole);
      sessionStorage.setItem('biogate_duress', 'false');

      navigate('/secret-vault', {
        state: {
          agentName: user.name,
          agentRole: assignedRole,
        },
      });
    }, 4000);

    return;
  }

  // VOICE SALAH BIASA
  setAuthResult({
    status: 'error',
    message: 'Voice signature mismatch.',
  });

  setIsDuress(false);
  setIsUnknown(false);
  setPhase('result');

  speak(`Access Denied. Invalid voice signature for ${user.name}.`);

  const newLog: LogEntry = {
    time: getTimeString(),
    status: 'DENIED',
    user: 'INVALID_VOICE_PATTERN',
  };

  setLogs(prev => [newLog, ...prev].slice(0, 12));

  window.setTimeout(() => {
    setPhase('scanning');
    setConfidence(0);
    setVectors(0);
    setScanningIndex(0);
    setSelectedUser(null);
    setIsUnknown(false);
    setTranscript('');
    setAuthResult(null);
    setIsDuress(false);
    setPhraseVisible(false);
    setIsListening(false);
  }, 4000);
}, [navigate]);

  useEffect(() => { verifyMFARef.current = verifyMFA; }, [verifyMFA]);

  // ── Real-time Face Scanning (Teachable Machine) ──────────────────────────
  const predictWebcam = useCallback(async () => {
    if (!model || !videoRef.current || phase !== 'scanning') return;

    try {
      // AI memprediksi frame kamera saat ini
      const prediction = await model.predict(videoRef.current);
      
      // Mencari hasil dengan kemungkinan (probability) paling tinggi
      const topResult = prediction.reduce((prev, current) => 
        (prev.probability > current.probability) ? prev : current
      );

      const probPercentage = parseFloat((topResult.probability * 100).toFixed(1));
      setConfidence(probPercentage);
      setVectors(Math.floor(Math.random() * 400 + 800)); // Animasi visual

      // Jika yakin lebih dari 85%
      if (topResult.probability > 0.85) {
        
        if (topResult.className.toLowerCase() === "unknown" || topResult.className.toLowerCase() === "tidak dikenal") {
           // Wajah tidak ada di database (Unknown Face)
           setIsUnknown(true);
           setPhase('face_denied');
           speak('Access Denied. Unrecognized face detected.');
 
           const newLog: LogEntry = {
             time: getTimeString(),
             status: 'DENIED',
             user: 'UNRECOGNIZED_FACE_ID',
           };
           setLogs(prev => [newLog, ...prev].slice(0, 12));
 
           // Restart otomatis setelah 4 detik
           setTimeout(() => startAutoScan(), 4000);
           return; // Hentikan loop

        } else {
          // Wajah Dikenali
          const identifiedName = topResult.className;
      const displayUsers = users.length > 0 ? users : ALL_USERS;

      const normalizeName = (name: string) =>
        name
          .toLowerCase()
          .replace(/[^a-z\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

      const normalizedIdentifiedName = normalizeName(identifiedName);

      // Cocokkan nama class dari TM dengan data ALL_USERS tanpa fallback ke user pertama
        const userMatch = displayUsers.find((u) => {
        const normalizedUserName = normalizeName(u.name);

        return (
          normalizedUserName === normalizedIdentifiedName ||
          normalizedUserName.includes(normalizedIdentifiedName) ||
          normalizedIdentifiedName.includes(normalizedUserName)
        );
      });

      if (!userMatch) {
        setIsUnknown(true);
        setSelectedUser(null);
        setPhase('face_denied');
        speak('Access Denied. Identity mismatch detected.');
        return;
      }

      setSelectedUser(userMatch);
      setScanningIndex(displayUsers.findIndex(u => u.id === userMatch.id));
      setPhase('face_found');

      speak(`Face recognized as ${userMatch.name}. Please provide voice authentication.`);

      // Lanjut ke verifikasi suara
      setTimeout(() => {
        setPhase('voice');
        setPhraseVisible(false);
        setTimeout(() => setPhraseVisible(true), 700);
      }, 1800);

      return; // Hentikan loop karena sudah ketemu // Hentikan loop karena sudah ketemu
        }
      }

      // Jika belum ada yang mencapai 85%, lanjutkan proses scanning
      requestRef.current = requestAnimationFrame(predictWebcam);
      
    } catch (e) {
      requestRef.current = requestAnimationFrame(predictWebcam);
    }
  }, [model, phase, users, speak]);

  // Trigger loop scanning saat berada di fase 'scanning'
  useEffect(() => {
    if (phase === 'scanning' && !isModelLoading) {
      requestRef.current = requestAnimationFrame(predictWebcam);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [phase, isModelLoading, predictWebcam]);

  // Fungsi Reset / Restart manual
  const startAutoScan = useCallback(() => {
    setPhase('scanning');
    setConfidence(0);
    setVectors(0);
    setScanningIndex(0);
    setSelectedUser(null);
    setIsUnknown(false);
    setTranscript('');
    setAuthResult(null);
    setIsDuress(false);
    setPhraseVisible(false);
  }, []);

  // ── Voice bar animation ──────────────────────────────────────────────────
  useEffect(() => {
    if (barIntervalRef.current) clearInterval(barIntervalRef.current);
    if (isListening) {
      barIntervalRef.current = setInterval(() => {
        setVoiceBars(Array.from({ length: 7 }, () => Math.random()));
      }, 120);
    } else {
      setVoiceBars([0.4, 0.7, 1, 0.6, 0.8, 0.7, 0.4]);
    }
    return () => clearInterval(barIntervalRef.current);
  }, [isListening]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      try { recognitionRef.current?.start(); } catch (e) {}
      setIsListening(true);
    }
  };

  const displayUsers = users.length > 0 ? users : ALL_USERS;
  const isGranted    = phase === 'result' && authResult?.status === 'success';
  const isDenied     = (phase === 'result' && authResult?.status !== 'success') || phase === 'face_denied';

  // ── Scan box / badge color helpers ───────────────────────────────────────
  const boxRed    = isDenied;
  const cornerCls = boxRed ? 'border-red-500' : 'border-[var(--accent)]';

  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--bg)] text-[var(--text-primary)] flex flex-col font-sans relative">
       {showDuressPopup && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm">
        <div className="relative w-[90%] max-w-2xl border-2 border-red-500 bg-red-950/30 p-8 text-center shadow-[0_0_40px_rgba(239,68,68,0.8)] animate-pulse">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-red-600 px-4 py-1 text-xs font-black tracking-[0.4em] text-white">
            SECURITY ALERT
          </div>

          <div className="mb-4 text-6xl font-black text-red-500">
            ⚠
          </div>

          <h1 className="mb-3 text-3xl md:text-5xl font-black tracking-widest text-red-500">
            ACCESS DENIED
          </h1>

          <p className="mb-2 text-sm md:text-lg font-bold tracking-[0.3em] text-red-300">
            DURESS PROTOCOL ACTIVE
          </p>

          <p className="text-xs md:text-sm tracking-widest text-red-200/80">
            UNKNOWN USER WARNING TRIGGERED
          </p>

          <div className="mt-6 border border-red-500/40 bg-black/60 p-3 font-mono text-xs text-red-300">
            SYSTEM LOCKDOWN // RETURNING TO INITIAL PAGE IN 5 SECONDS
          </div>
            <div className="mt-4 h-2 w-full overflow-hidden border border-red-500/40 bg-black">
            <div className="h-full animate-[duressLoading_5s_linear_forwards] bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.9)]"></div>
          </div>
          <div className="mt-3 flex justify-center gap-2">
            <span className="h-2 w-2 animate-ping rounded-full bg-red-500"></span>
            <span className="h-2 w-2 animate-ping rounded-full bg-red-500 [animation-delay:150ms]"></span>
            <span className="h-2 w-2 animate-ping rounded-full bg-red-500 [animation-delay:300ms]"></span>
          </div>
        </div>
      </div>
    )}

      {/* ========================================== */}
      {/* OVERLAY: TAP TO START (Menutupi seluruh layar) */}
      {/* ========================================== */}
      {!hasStarted && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--bg)]">
          <Shield className="w-24 h-24 text-[var(--accent)] animate-pulse mb-8 opacity-50" />
          <h1 className="font-mono font-extrabold text-2xl md:text-4xl text-[var(--accent)] tracking-[10px] mb-12 text-center drop-shadow-[0_0_15px_rgba(0,255,136,0.3)]">
            BIOGATE SENTINEL
          </h1>
          
          <button 
            onClick={() => {
              setHasStarted(true);
              speak("System initialized. Calibrating biometric sensors.");
            }}
            className="bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black border border-[var(--accent)] transition-all duration-300 px-8 py-4 text-sm md:text-lg font-mono font-bold tracking-[3px] flex items-center gap-3 shadow-[0_0_15px_rgba(0,255,136,0.2)] hover:shadow-[0_0_25px_rgba(0,255,136,0.6)]"
          >
            <Fingerprint className="w-6 h-6" />
            [ TAP TO INITIALIZE ]
          </button>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="h-[52px] bg-[var(--card-bg)] border-b border-[var(--border)] flex items-center justify-between px-6 z-20 flex-shrink-0">
        <div className="font-mono font-extrabold text-sm tracking-[3px] text-[var(--accent)]">
          BIOGATE // SENTINEL
        </div>
        <div className="flex gap-6 font-mono text-[10px] uppercase text-[var(--text-secondary)]">
          {([
            ['Encryption', 'AES-256-GCM'],
            ['Network',    'SECURE:443'],
            ['Status',
              phase === 'scanning'     ? (isModelLoading ? 'LOADING AI...' : 'SCANNING') :
              phase === 'face_found'   ? 'ID CONFIRMED' :
              phase === 'face_denied'  ? 'FACE DENIED'  :
              phase === 'voice'        ? 'VOICE MFA'    :
              isGranted                ? 'GRANTED'      : 'DENIED'
            ],
            ['Time', currentTime],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} className="flex flex-col">
              <span>{label}</span>
              <span className={`font-bold ${val === 'DENIED' || val === 'FACE DENIED' ? 'text-red-500' : 'text-[var(--accent)]'}`}>
                {val}
              </span>
            </div>
          ))}
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] overflow-hidden">

        {/* ── Camera / Scanner View ──────────────────────────────────────── */}
        <section className="relative bg-black border-r border-[var(--border)] overflow-hidden h-full flex items-center justify-center">
          <video ref={videoRef} autoPlay muted playsInline
            className="w-full h-full object-cover opacity-75"
            style={{ filter: 'grayscale(20%) contrast(1.2)' }} />
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle, transparent 40%, rgba(2,6,23,0.4) 100%)' }} />

          {/* Scan box */}
          <div className={`absolute top-[15%] left-[25%] w-1/2 h-[60%] border-2 rounded-lg pointer-events-none transition-colors duration-500
            ${boxRed
              ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.25)]'
              : 'border-[var(--accent)] shadow-[0_0_20px_var(--accent-glow)]'}`}>
            {(['top-[-2px] left-[-2px] border-t-[3px] border-l-[3px]',
               'top-[-2px] right-[-2px] border-t-[3px] border-r-[3px]',
               'bottom-[-2px] left-[-2px] border-b-[3px] border-l-[3px]',
               'bottom-[-2px] right-[-2px] border-b-[3px] border-r-[3px]'] as string[]).map((cls, i) => (
              <div key={i} className={`absolute w-5 h-5 ${cornerCls} ${cls}`} />
            ))}
            {phase === 'scanning' && !isModelLoading && (
              <motion.div
                initial={{ top: '0%' }} animate={{ top: '100%' }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                className={`absolute left-0 w-full h-[2px] opacity-60 ${boxRed ? 'bg-red-500' : 'bg-[var(--accent)]'}`}
              />
            )}
          </div>

          {/* Face label above scan box */}
          <div className={`absolute font-mono text-[10px] tracking-[3px] uppercase pointer-events-none
            ${boxRed ? 'text-red-500' : 'text-[var(--accent)]'}`}
            style={{ top: 'calc(15% - 20px)', left: '25%', width: '50%', textAlign: 'center' }}>
            {isModelLoading          ? 'INITIALIZING AI...' :
             phase === 'scanning'    ? 'SCANNING...'        :
             phase === 'face_denied' ? 'UNKNOWN FACE'       :
             selectedUser?.name.toUpperCase() ?? ''}
          </div>

          {/* Status badge */}
          <div className={`absolute top-3 right-3 px-3 py-1 font-mono text-[10px] font-bold tracking-[2px] uppercase rounded border bg-[rgba(15,23,42,0.85)]
            ${boxRed ? 'border-red-500 text-red-500' : 'border-[var(--accent)] text-[var(--accent)]'}`}>
            {isModelLoading          ? 'INITIALIZING'  :
             phase === 'scanning'    ? 'SCANNING'      :
             phase === 'face_found'  ? 'ID CONFIRMED'  :
             phase === 'face_denied' ? 'ACCESS DENIED' :
             phase === 'voice'       ? 'VOICE MFA'     :
             isGranted               ? 'ACCESS GRANTED': 'ACCESS DENIED'}
          </div>

          {/* Bottom-left info */}
          <div className="absolute bottom-4 left-4 font-mono text-[10px] bg-[rgba(15,23,42,0.85)] p-2 border-l-[3px] border-[var(--accent)] leading-relaxed">
            MATCH CONFIDENCE: <span className="text-[var(--accent)]">{confidence > 0 ? confidence.toFixed(1) : '--.-'}%</span><br />
            VECTORS: <span className="text-[var(--accent)]">{vectors > 0 ? vectors : '0'}</span><br />
            THERMAL: <span className="text-[var(--accent)]">OPTIMAL</span>
          </div>

          {/* Bottom-right progress */}
          <div className="absolute bottom-4 right-4 w-[140px]">
            <div className="text-[9px] font-mono text-[var(--text-secondary)] mb-1 text-right">FACE LOCK</div>
            <div className="h-[3px] bg-[var(--border)] rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-150 ${boxRed ? 'bg-red-500' : 'bg-[var(--accent)]'}`}
                style={{ width: `${(confidence / 98.4) * 100}%` }} />
            </div>
          </div>
        </section>

        {/* ── Right Panel ────────────────────────────────────────────────── */}
        <section className="bg-[var(--card-bg)] flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">

            {/* Phase 1 — Scanning / Face Found */}
            {(phase === 'scanning' || phase === 'face_found') && (
              <motion.div key="phase1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-4 border-b border-[var(--border)]">
                <div className="flex justify-between items-center mb-3 font-mono text-[9px] uppercase tracking-widest">
                  <span className="text-[var(--text-secondary)]">Phase 01: Visual Identity</span>
                  <span className={`font-bold ${phase === 'face_found' ? 'text-[var(--accent)]' : 'text-amber-400'}`}>
                    {phase === 'face_found' ? 'ID CONFIRMED' : `AWAITING FACE...`}
                  </span>
                </div>
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {displayUsers.map((user) => {
                    const isMatch    = phase === 'face_found' && selectedUser?.id === user.id;
                    return (
                      <div key={user.id} className={`flex items-center gap-3 p-2 rounded-md border transition-colors duration-200
                        ${isMatch    ? 'border-[var(--accent)] bg-[rgba(74,222,128,0.05)]'
                        : 'border-[var(--border)] bg-[var(--bg)]'}`}>
                        <div className={`w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0
                          ${isMatch    ? 'border-[var(--accent)] text-[var(--accent)]'
                          : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>
                          {isMatch ? <CheckCircle className="w-4 h-4" /> : <Fingerprint className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-xs font-semibold">{user.name}</div>
                          <div className={`text-[9px] font-mono uppercase
                            ${isMatch ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>
                            ID: {String(user.id).padStart(4, '0')} {isMatch ? '— MATCHED' : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Phase 1 DENIED — Unknown Face */}
            {phase === 'face_denied' && (
              <motion.div key="face_denied"
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="p-5 border-b border-[var(--border)] text-center">
                <div className="mb-3 flex justify-center">
                  <UserX className="w-14 h-14 text-red-500" />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tighter italic text-red-500">
                  ACCESS DENIED
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Unrecognized face detected</p>
                <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded font-mono text-[9px] text-red-400 tracking-widest">
                  FACE NOT REGISTERED IN DATABASE
                </div>
                <p className="mt-3 text-[9px] font-mono text-[var(--text-secondary)]">
                  Restarting scan automatically...
                </p>
                <button onClick={startAutoScan}
                  className="mt-3 px-5 py-2 border border-[var(--border)] hover:bg-[var(--bg)] transition-colors rounded text-[10px] uppercase tracking-widest font-bold font-mono">
                  Restart Now
                </button>
              </motion.div>
            )}

            {/* Phase 2 — Voice */}
            {phase === 'voice' && selectedUser && (
              <motion.div key="phase2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-4 border-b border-[var(--border)]">
                <div className="flex justify-between items-center mb-3 font-mono text-[9px] uppercase tracking-widest">
                  <span className="text-[var(--text-secondary)]">Phase 02: Voice Verification</span>
                  <span className={`font-bold ${isListening ? 'text-amber-400' : 'text-[var(--text-primary)]'}`}>
                    {isListening ? 'LISTENING...' : 'AWAITING INPUT...'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-4 p-2 border border-[var(--accent)] rounded-md bg-[var(--bg)]">
                  <div className="w-9 h-9 rounded-full border border-[var(--accent)] flex items-center justify-center text-[var(--accent)] flex-shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">{selectedUser.name}</div>
                    <div className="text-[9px] font-mono text-[var(--accent)] uppercase">VISUAL_ID: VERIFIED</div>
                  </div>
                </div>
                <div className="bg-[var(--bg)] border border-dashed border-[var(--border)] p-3 rounded-md text-center mb-3">
                  <div className="text-[9px] text-[var(--text-secondary)] uppercase tracking-widest mb-2">Ucapkan Passphrase:</div>
                  <div className="font-mono text-sm tracking-wider italic text-[var(--text-primary)]">
                    {phraseVisible ? `"${getUserPassphrase(selectedUser.name)}"` : '**************'}
                  </div>
                  <div className="flex items-center justify-center gap-[3px] h-[28px] mt-2">
                    {voiceBars.map((h, i) => (
                      <div key={i} className="w-[3px] bg-[var(--accent)] rounded-sm transition-all duration-100"
                        style={{ height: `${h * 28}px` }} />
                    ))}
                  </div>
                  {transcript && (
                    <div className="mt-2 text-[10px] font-mono text-[var(--text-secondary)]">&gt; "{transcript}"</div>
                  )}
                </div>
                <button onClick={toggleListening}
                  className={`w-full p-3 font-bold rounded-md flex items-center justify-center gap-2 uppercase text-[11px] tracking-widest transition-all font-mono
                    ${isListening
                      ? 'bg-amber-400 text-[var(--bg)]'
                      : 'bg-[var(--accent)] text-[var(--bg)] shadow-[0_0_16px_var(--accent-glow)]'}`}>
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isListening ? 'Stop Listening' : 'Initialize Voice Scan'}
                </button>
              </motion.div>
            )}

            {/* Phase 3 — Result */}
{phase === 'result' && authResult && (
  <motion.div key="phase3" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
    className="p-5 border-b border-[var(--border)] text-center">
    
    <div className="mb-3 flex justify-center">
      {isGranted
        ? <CheckCircle className="w-14 h-14 text-[var(--accent)]" />
        : <AlertTriangle className="w-14 h-14 text-red-500" />}
    </div>

    <h2 className={`text-xl font-black uppercase tracking-tighter italic ${isGranted ? 'text-[var(--accent)]' : 'text-red-500'}`}>
      {isGranted ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
    </h2>

    <p className="text-xs text-[var(--text-secondary)] mt-1">
      {isGranted ? `Welcome, ${authResult.user?.name}` : authResult.message}
    </p>

    {isGranted && (
      <>
        <p className="text-[10px] text-[var(--text-secondary)] mt-1">Role: {authResult.user?.role}</p>
        
        {/* --- LOADING SIMPEL MULAI DI SINI --- */}
        <div className="mt-6 flex flex-col items-center gap-3">
          {/* Spinner kecil warna hijau accent */}
          <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
          
          <p className="text-[9px] text-[var(--accent)] animate-pulse tracking-[0.2em] font-mono">
            PREPARING_SECURE_SESSION...
          </p>
        </div>
        {/* --- LOADING SIMPEL SELESAI DI SINI --- */}
      </>
    )}
                {isDuress && (
                  <div className="mt-3 p-2 bg-red-500/10 border border-red-500/40 rounded text-[9px] font-mono text-red-400 tracking-wider flex items-center justify-center gap-2">
                    <ShieldAlert className="w-3 h-3" />
                    DURESS PROTOCOL ACTIVE — UNKNOWN USER WARNING TRIGGERED
                  </div>
                )}
                <button onClick={startAutoScan}
                  className="mt-4 px-5 py-2 border border-[var(--border)] hover:bg-[var(--bg)] transition-colors rounded text-[10px] uppercase tracking-widest font-bold font-mono">
                  Restart Protocol
                </button>
              </motion.div>
            )}

          </AnimatePresence>

          {/* ── Activity Logs ─────────────────────────────────────────────── */}
          <div className="flex-1 p-4 font-mono text-[10px] overflow-hidden flex flex-col">
            <div className="mb-2 font-bold border-b border-[var(--border)] pb-2 tracking-widest flex items-center gap-2 text-[9px] uppercase">
              <Lock className="w-3 h-3 text-[var(--accent)]" />
              ACCESS EVENT LOGS
              <span className="ml-auto w-[6px] h-[6px] rounded-full bg-[var(--accent)] inline-block"
                style={{ animation: 'pulse 1.5s ease infinite' }} />
            </div>
            <div className="flex-1 overflow-y-auto space-y-[2px]">
              {logs.map((log, i) => (
                <motion.div key={`${log.time}-${i}`}
                  initial={i === 0 ? { opacity: 0, x: -6 } : { opacity: 1 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-2 py-[3px] border-b border-white/[0.03]">
                  <span className="text-[var(--text-secondary)] min-w-[58px]">[{log.time}]</span>
                  <span className={`min-w-[48px] font-bold ${log.status === 'GRANTED' ? 'text-[var(--accent)]' : 'text-red-500'}`}>
                    {log.status}
                  </span>
                  <span className="truncate">
                    {log.status === 'GRANTED' ? `USER: ${log.user}` : log.user}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <style>{`
        :root {
          --bg: #020617; --card-bg: #0f172a; --panel: #1e293b;
          --border: #334155; --accent: #4ade80; --accent-glow: rgba(74,222,128,0.2);
          --danger: #ef4444; --text-primary: #f8fafc; --text-secondary: #94a3b8;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }
      `}</style>
    </div>
  );
}