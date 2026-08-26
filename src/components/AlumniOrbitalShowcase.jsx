import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';

// ─── Perfect Geometric Constants (360×360 viewBox) ──────────────────────────
const VB = 360;
const CX = 180;
const CY = 180;

// Outer orbit radius = 125. Nodes at 45°, 135°, 225°, 315°
const NODE_CFG = [
  { x: 92,  y: 92  }, // Top-Left
  { x: 268, y: 92  }, // Top-Right
  { x: 92,  y: 268 }, // Bottom-Left
  { x: 268, y: 268 }, // Bottom-Right
];

// Inner orbit radius = 62. Midpoints between Hub (180,180) and Nodes
const BUBBLE_CFG = [
  { x: 136, y: 136 }, // Top-Left midpoint
  { x: 224, y: 136 }, // Top-Right midpoint
  { x: 136, y: 224 }, // Bottom-Left midpoint
  { x: 224, y: 224 }, // Bottom-Right midpoint
];

const AVATAR_COLOURS = [
  'from-emerald-500 to-emerald-700 border-emerald-400',
  'from-teal-500 to-teal-700 border-teal-400',
  'from-emerald-600 to-teal-700 border-emerald-300',
  'from-cyan-600 to-emerald-700 border-cyan-400',
];

const getInitials = (name) => {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
};

const avatarStyle = (name, idx) => {
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
      className="relative mx-auto w-full select-none p-2"
      style={{ maxWidth: VB, aspectRatio: '1 / 1' }}
      aria-label="Alumni community network"
    >
      {/* Outer orbit ring (radius 125) - slowly rotates clockwise */}
      <div className="absolute inset-0 animate-orbit-cw pointer-events-none">
        <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full h-full">
          <circle
            cx={CX} cy={CY} r="125"
            fill="none"
            stroke="rgba(52, 211, 153, 0.3)"
            strokeWidth="1.5"
            strokeDasharray="8 8"
          />
        </svg>
      </div>

      {/* Inner orbit ring (radius 62) - slowly rotates counter-clockwise */}
      <div className="absolute inset-0 animate-orbit-ccw pointer-events-none">
        <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full h-full">
          <circle
            cx={CX} cy={CY} r="62"
            fill="none"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="1"
            strokeDasharray="5 7"
          />
        </svg>
      </div>

      {/* Static layer: Connection lines + Chat bubble node circles */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${VB} ${VB}`}
      >
        {NODE_CFG.map((n, i) => (
          <line
            key={`line-${i}`}
            x1={CX} y1={CY} x2={n.x} y2={n.y}
            stroke="rgba(52, 211, 153, 0.25)"
            strokeWidth="1.2"
            strokeDasharray="4 5"
          />
        ))}
        {BUBBLE_CFG.map((b, i) => (
          <circle
            key={`bubble-bg-${i}`}
            cx={b.x} cy={b.y} r="14"
            fill="rgba(4, 47, 38, 0.9)"
            stroke="rgba(52, 211, 153, 0.4)"
            strokeWidth="1"
          />
        ))}
      </svg>

      {/* Chat bubble icons overlaid on inner ring */}
      {BUBBLE_CFG.map((b, i) => (
        <div
          key={`bubble-${i}`}
          className="absolute flex items-center justify-center pointer-events-none"
          style={{
            left: `${(b.x / VB) * 100}%`,
            top: `${(b.y / VB) * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
        </div>
      ))}

      {/* Center hub */}
      <div
        className="absolute flex items-center justify-center"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <div className="animate-hub-pulse w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-800 flex items-center justify-center shadow-2xl ring-4 ring-emerald-400/30">
          <HubIcon />
        </div>
      </div>

      {/* 4 Avatar nodes placed exactly along the outer orbit ring */}
      {nodes.map((alumni, i) => {
        const cfg = NODE_CFG[i];
        const isPlaceholder = !alumni;
        const name = alumni?.full_name ?? '';
        const firstName = name.split(' ')[0] || 'Join Us';
        const role = alumni?.working_area || (alumni?.passout_year ? `Batch ${alumni.passout_year}` : '');
        const styleClass = avatarStyle(name, i);

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1, duration: 0.4, ease: 'easeOut' }}
            className="absolute flex flex-col items-center"
            style={{
              left: `${(cfg.x / VB) * 100}%`,
              top: `${(cfg.y / VB) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Avatar circle */}
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 bg-gradient-to-br ${styleClass} flex items-center justify-center shadow-xl text-white font-bold text-sm sm:text-base ${
                isPlaceholder ? 'opacity-50 border-emerald-500/30' : ''
              }`}
            >
              {getInitials(name)}
            </div>

            {/* Name & Role Badge */}
            <div className="mt-1.5 bg-stone-900/90 backdrop-blur-md border border-emerald-500/30 rounded-full px-2.5 py-0.5 text-center shadow-lg pointer-events-none whitespace-nowrap">
              <p className="text-[10px] font-bold text-emerald-100 leading-tight">
                {isPlaceholder ? 'Be a member' : firstName}
              </p>
              {role && (
                <p className="text-[9px] text-emerald-300/80 mt-0.5 truncate max-w-[80px]">
                  {role}
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default AlumniOrbitalShowcase;
