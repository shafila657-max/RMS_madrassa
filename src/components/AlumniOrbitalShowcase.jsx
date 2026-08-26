import React from 'react';
import { motion } from 'framer-motion';

// ─── Reference Image Exact Geometry (360×360 ViewBox) ─────────────────────
const VB = 360;
const CX = 180;
const CY = 180;

// Inner orbit radius = 90, Outer orbit radius = 145
const R_INNER = 90;
const R_OUTER = 145;

// Avatar Node configurations matching the reference image placement
const AVATAR_NODES = [
  {
    // Top-Left (Mint bg) -> on Outer Ring
    x: 72, y: 88,
    size: 'w-14 h-14 sm:w-16 sm:h-16',
    bgColor: '#34d399', // Mint emerald
    defaultName: 'Fasil M.',
    svgType: 'suit',
  },
  {
    // Top-Right (Yellow/Amber bg) -> on Outer Ring
    x: 262, y: 64,
    size: 'w-16 h-16 sm:w-20 sm:h-20',
    bgColor: '#fbbf24', // Yellow/Gold
    defaultName: 'Rashid K.',
    svgType: 'cheerful',
  },
  {
    // Bottom-Left (Orange/Coral bg) -> on Outer Ring
    x: 96, y: 292,
    size: 'w-16 h-16 sm:w-20 sm:h-20',
    bgColor: '#f97316', // Orange
    defaultName: 'Muhammed F.',
    svgType: 'tie',
  },
  {
    // Bottom-Right (Green bg) -> on Inner Ring
    x: 254, y: 232,
    size: 'w-14 h-14 sm:w-16 sm:h-16',
    bgColor: '#10b981', // Emerald green
    defaultName: 'Anas P.',
    svgType: 'casual',
  },
];

// Speech Bubble Nodes matching reference image positions
const CHAT_BUBBLES = [
  { x: 318, y: 152 }, // Right (on Outer ring)
  { x: 92,  y: 164 }, // Left (on Inner ring)
  { x: 180, y: 270 }, // Bottom (on Inner ring)
];

// ─── SVG Profile Fallback Avatars ──────────────────────────────────────────
const AvatarIllustration = ({ type }) => {
  if (type === 'suit') {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full object-cover">
        <path d="M50 46c7 0 12-5 12-12s-5-12-12-12-12 5-12 12 5 12 12 12z" fill="#1e293b" />
        <path d="M50 52c-15 0-24 9-24 22v8h48v-8c0-13-9-22-24-22z" fill="#0f172a" />
        <path d="M46 52h8v16h-8z" fill="#ffffff" />
        <path d="M48 52l2 10 2-10z" fill="#0284c7" />
      </svg>
    );
  }
  if (type === 'cheerful') {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full object-cover">
        <path d="M50 44c7 0 12-5 12-12s-5-12-12-12-12 5-12 12 5 12 12 12z" fill="#3b0764" />
        <path d="M50 50c-14 0-23 8-23 20v10h46V70c0-12-9-20-23-20z" fill="#1e1b4b" />
        <path d="M47 50h6v12h-6z" fill="#ffffff" />
      </svg>
    );
  }
  if (type === 'tie') {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full object-cover">
        <path d="M50 46c7 0 12-5 12-12s-5-12-12-12-12 5-12 12 5 12 12 12z" fill="#451a03" />
        <path d="M50 52c-15 0-24 9-24 22v8h48v-8c0-13-9-22-24-22z" fill="#ffffff" />
        <path d="M48 52l2 22 2-22z" fill="#000000" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full object-cover">
      <path d="M50 45c7 0 12-5 12-12s-5-12-12-12-12 5-12 12 5 12 12 12z" fill="#064e3b" />
      <path d="M50 51c-14 0-23 8-23 21v7h46v-7c0-13-9-21-23-21z" fill="#0284c7" />
      <path d="M45 51h10v10H45z" fill="#ffffff" />
    </svg>
  );
};

// ─── Center Hub Icon ─────────────────────────────────────────────────────────
const NetworkHubIcon = () => (
  <svg width="34" height="34" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <circle cx="16" cy="16" r="3.5" fill="white" />
    <circle cx="8"  cy="9"  r="2.8" fill="white" fillOpacity="0.9" />
    <circle cx="24" cy="9"  r="2.8" fill="white" fillOpacity="0.9" />
    <circle cx="8"  cy="23" r="2.8" fill="white" fillOpacity="0.9" />
    <circle cx="24" cy="23" r="2.8" fill="white" fillOpacity="0.9" />
    <line x1="16" y1="16" x2="8"  y2="9"  stroke="white" strokeWidth="1.8" strokeOpacity="0.8" />
    <line x1="16" y1="16" x2="24" y2="9"  stroke="white" strokeWidth="1.8" strokeOpacity="0.8" />
    <line x1="16" y1="16" x2="8"  y2="23" stroke="white" strokeWidth="1.8" strokeOpacity="0.8" />
    <line x1="16" y1="16" x2="24" y2="23" stroke="white" strokeWidth="1.8" strokeOpacity="0.8" />
  </svg>
);

const AlumniOrbitalShowcase = ({ alumni = [] }) => {
  return (
    <div
      className="relative mx-auto w-full select-none p-2"
      style={{ maxWidth: VB, aspectRatio: '1 / 1' }}
      aria-label="Alumni community network showcase"
    >
      {/* ── Inner Dashed Orbit Ring (Radius 90) - Slow counter-clockwise rotation */}
      <div className="absolute inset-0 animate-orbit-ccw pointer-events-none">
        <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full h-full">
          <circle
            cx={CX} cy={CY} r={R_INNER}
            fill="none"
            stroke="rgba(52, 211, 153, 0.28)"
            strokeWidth="1.5"
            strokeDasharray="7 7"
          />
        </svg>
      </div>

      {/* ── Outer Dashed Orbit Ring (Radius 145) - Slow clockwise rotation */}
      <div className="absolute inset-0 animate-orbit-cw pointer-events-none">
        <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full h-full">
          <circle
            cx={CX} cy={CY} r={R_OUTER}
            fill="none"
            stroke="rgba(255, 255, 255, 0.22)"
            strokeWidth="1.5"
            strokeDasharray="9 9"
          />
        </svg>
      </div>

      {/* ── Chat Speech Bubble Badges */}
      {CHAT_BUBBLES.map((b, i) => (
        <motion.div
          key={`chat-${i}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 + i * 0.1 }}
          className="absolute flex items-center justify-center pointer-events-none z-10"
          style={{
            left: `${(b.x / VB) * 100}%`,
            top: `${(b.y / VB) * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 shadow-xl border border-emerald-100 flex items-center justify-center text-emerald-800">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-emerald-700">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
        </motion.div>
      ))}

      {/* ── Center Dark Emerald Hub */}
      <div
        className="absolute flex items-center justify-center z-10"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <div className="animate-hub-pulse w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-[#063a2f] border-2 border-emerald-400/40 flex items-center justify-center shadow-2xl ring-4 ring-emerald-500/20">
          <NetworkHubIcon />
        </div>
      </div>

      {/* ── 4 Avatar Circles positioned along concentric rings */}
      {AVATAR_NODES.map((cfg, i) => {
        const item = alumni[i];
        const photoUrl = item?.photo_url;
        const name = item?.full_name || cfg.defaultName;

        return (
          <motion.div
            key={`avatar-${i}`}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1, duration: 0.4, ease: 'easeOut' }}
            className="absolute flex flex-col items-center z-20"
            style={{
              left: `${(cfg.x / VB) * 100}%`,
              top: `${(cfg.y / VB) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Avatar Circle Container */}
            <div
              className={`${cfg.size} rounded-full overflow-hidden shadow-2xl border-2 border-white/90 transition-transform hover:scale-105`}
              style={{ backgroundColor: cfg.bgColor }}
            >
              {photoUrl ? (
                <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <AvatarIllustration type={cfg.svgType} />
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default AlumniOrbitalShowcase;
