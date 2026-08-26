import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';

// ─── Constants (all in 340×340 viewBox units) ──────────────────────────────
const VB = 340;
const CX = VB / 2; // 170
const CY = VB / 2; // 170

const NODE_CFG = [
  { x: 48,  y: 62,  label: 'right' },
  { x: 292, y: 52,  label: 'left'  },
  { x: 32,  y: 278, label: 'right' },
  { x: 284, y: 276, label: 'left'  },
];

const BUBBLE_CFG = [
  { x: (CX + 48)  / 2, y: (CY + 62)  / 2 },
  { x: (CX + 292) / 2, y: (CY + 52)  / 2 },
  { x: (CX + 32)  / 2, y: (CY + 278) / 2 },
  { x: (CX + 284) / 2, y: (CY + 276) / 2 },
];

const AVATAR_COLOURS = [
  'from-emerald-500 to-emerald-700',
  'from-teal-500 to-teal-700',
  'from-emerald-600 to-teal-700',
  'from-cyan-600 to-emerald-700',
];

const getInitials = (name) => {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
};

const avatarGradient = (name, idx) => {
  const hash = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), idx);
  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
};

const HubIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <circle cx="16" cy="16" r="3.5" fill="white" />
    <circle cx="7"  cy="9"  r="2.8" fill="white" fillOpacity="0.85" />
    <circle cx="25" cy="9"  r="2.8" fill="white" fillOpacity="0.85" />
    <circle cx="7"  cy="23" r="2.8" fill="white" fillOpacity="0.85" />
    <circle cx="25" cy="23" r="2.8" fill="white" fillOpacity="0.85" />
    <line x1="16" y1="16" x2="7"  y2="9"  stroke="white" strokeWidth="1.6" strokeOpacity="0.75" />
    <line x1="16" y1="16" x2="25" y2="9"  stroke="white" strokeWidth="1.6" strokeOpacity="0.75" />
    <line x1="16" y1="16" x2="7"  y2="23" stroke="white" strokeWidth="1.6" strokeOpacity="0.75" />
    <line x1="16" y1="16" x2="25" y2="23" stroke="white" strokeWidth="1.6" strokeOpacity="0.75" />
  </svg>
);

const AlumniOrbitalShowcase = ({ alumni = [] }) => {
  const nodes = Array.from({ length: 4 }, (_, i) => alumni[i] || null);

  return (
    <div
      className="relative mx-auto w-full select-none"
      style={{ maxWidth: VB, aspectRatio: '1 / 1' }}
      aria-label="Alumni community network"
    >
      {/* Rotating outer orbit ring */}
      <div className="absolute inset-0 animate-orbit-cw pointer-events-none">
        <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full h-full">
          <circle cx={CX} cy={CY} r="132" fill="none"
            stroke="rgba(52,211,153,0.22)" strokeWidth="1.5" strokeDasharray="9 7" />
        </svg>
      </div>

      {/* Counter-rotating inner ring */}
      <div className="absolute inset-0 animate-orbit-ccw pointer-events-none">
        <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full h-full">
          <circle cx={CX} cy={CY} r="80" fill="none"
            stroke="rgba(255,255,255,0.10)" strokeWidth="1" strokeDasharray="5 9" />
        </svg>
      </div>

      {/* Static: connection lines + chat bubble backgrounds */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${VB} ${VB}`}>
        {NODE_CFG.map((n, i) => (
          <line key={i} x1={CX} y1={CY} x2={n.x} y2={n.y}
            stroke="rgba(52,211,153,0.18)" strokeWidth="1" strokeDasharray="4 6" />
        ))}
        {BUBBLE_CFG.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r="15"
            fill="rgba(6,78,59,0.85)" stroke="rgba(52,211,153,0.35)" strokeWidth="1" />
        ))}
      </svg>

      {/* Chat bubble icons */}
      {BUBBLE_CFG.map((b, i) => (
        <div key={i} className="absolute flex items-center justify-center pointer-events-none"
          style={{ left: `${(b.x/VB)*100}%`, top: `${(b.y/VB)*100}%`, transform: 'translate(-50%,-50%)' }}>
          <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
        </div>
      ))}

      {/* Centre hub */}
      <div className="absolute flex items-center justify-center"
        style={{ left:'50%', top:'50%', transform:'translate(-50%,-50%)' }}>
        <div className="animate-hub-pulse w-[72px] h-[72px] rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-2xl ring-4 ring-emerald-400/20">
          <HubIcon />
        </div>
      </div>

      {/* Avatar nodes */}
      {nodes.map((alumni, i) => {
        const cfg = NODE_CFG[i];
        const isPlaceholder = !alumni;
        const name = alumni?.full_name ?? '';
        const firstName = name.split(' ')[0] || 'Join Us';
        const role = alumni?.working_area || (alumni?.passout_year ? `Batch ${alumni.passout_year}` : '');
        const gradient = avatarGradient(name, i);

        return (
          <motion.div key={i}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.12, duration: 0.4, ease: 'easeOut' }}
            className="absolute flex flex-col items-center"
            style={{ left: `${(cfg.x/VB)*100}%`, top: `${(cfg.y/VB)*100}%`, transform: 'translate(-50%,-50%)' }}>

            {/* Avatar circle */}
            <div className={`w-[58px] h-[58px] rounded-full border-2 border-emerald-400/50 bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg text-white font-bold text-base ${isPlaceholder ? 'opacity-40' : ''}`}>
              {getInitials(name) || '+'}
            </div>

            {/* Name chip */}
            <div className="absolute top-full mt-1.5 bg-white/10 backdrop-blur-md border border-white/15 rounded-full px-2 py-0.5 pointer-events-none whitespace-nowrap"
              style={cfg.label === 'right' ? { left: 0 } : { right: 0 }}>
              <p className="text-[10px] font-bold text-emerald-100 leading-tight">
                {isPlaceholder ? 'Be a member' : firstName}
              </p>
              {role && <p className="text-[9px] text-emerald-300/70 mt-0.5 truncate max-w-[72px]">{role}</p>}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default AlumniOrbitalShowcase;
