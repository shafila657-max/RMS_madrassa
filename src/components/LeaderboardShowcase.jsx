import React, { useState } from 'react';
import { ArrowLeft, Crown, Search, Star, Trophy, User } from 'lucide-react';

const filterTabs = [
  { id: 'all', label: 'All' },
  { id: 'week', label: 'This Week' },
  { id: 'friends', label: 'Friends' },
];

const podiumTheme = {
  1: {
    // 🥇 Rank 1 Gold Column: 3D Beveled Top Inset, crisp border alignment, rich color separation
    block: 'bg-gradient-to-b from-amber-300 via-amber-400 to-yellow-500 text-stone-950 border border-amber-200/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),0_8px_20px_rgba(0,0,0,0.3)]',
    ring: 'border-2 border-amber-300',
    badge: 'bg-stone-950 text-amber-300 border border-amber-400/60 font-black',
    score: 'text-stone-950 font-black',
    nameColor: 'text-stone-950 font-extrabold',
    classColor: 'text-stone-900/90 font-bold',
    avatarShell: 'bg-stone-950 border-2 border-amber-300',
    avatarSize: 'w-28 h-28 sm:w-32 sm:h-32',
    blockHeight: 'h-[19rem] sm:h-[21rem]',
    bottomPad: 'pb-6',
    titleSize: 'text-base sm:text-lg',
    scoreSize: 'text-2xl sm:text-4xl',
  },
  2: {
    // 🥈 Rank 2 Silver Column: 3D Beveled Top Inset, crisp white border alignment
    block: 'bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 text-slate-950 border border-white/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_6px_16px_rgba(0,0,0,0.2)]',
    ring: 'border-2 border-sky-400',
    badge: 'bg-slate-950 text-sky-300 border border-sky-400/60 font-black',
    score: 'text-sky-950 font-black',
    nameColor: 'text-slate-950 font-extrabold',
    classColor: 'text-slate-800 font-bold',
    avatarShell: 'bg-slate-950 border-2 border-sky-400',
    avatarSize: 'w-20 h-20 sm:w-24 sm:h-24',
    blockHeight: 'h-[14rem] sm:h-[16rem]',
    bottomPad: 'pb-5',
    titleSize: 'text-sm sm:text-base',
    scoreSize: 'text-xl sm:text-3xl',
  },
  3: {
    // 🥉 Rank 3 Bronze Column: 3D Beveled Top Inset, crisp warm border alignment
    block: 'bg-gradient-to-b from-amber-700 via-amber-800 to-stone-900 text-white border border-amber-500/50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.25),0_6px_16px_rgba(0,0,0,0.25)]',
    ring: 'border-2 border-amber-400',
    badge: 'bg-amber-400 text-stone-950 border border-amber-300/60 font-black',
    score: 'text-amber-300 font-black',
    nameColor: 'text-white font-extrabold',
    classColor: 'text-amber-200/90 font-semibold',
    avatarShell: 'bg-stone-950 border-2 border-amber-400',
    avatarSize: 'w-20 h-20 sm:w-24 sm:h-24',
    blockHeight: 'h-[12rem] sm:h-[13.5rem]',
    bottomPad: 'pb-5',
    titleSize: 'text-sm sm:text-base',
    scoreSize: 'text-xl sm:text-3xl',
  },
};

const listTheme = {
  score: 'text-emerald-700',
  rank: 'text-amber-500',
};

const AvatarCircle = ({ student, size, ringClass, shellClass }) => (
  <div className={`rounded-full ${ringClass} ${size} overflow-hidden ${shellClass}`}>
    {student.photo_url ? (
      <img src={student.photo_url} alt={student.full_name} className="h-full w-full object-cover" />
    ) : (
      <div className="flex h-full w-full items-center justify-center">
        <User className="h-8 w-8 text-slate-500" />
      </div>
    )}
  </div>
);

const AvatarSquare = ({ student }) => (
  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-slate-100 shadow-sm">
    {student.photo_url ? (
      <img src={student.photo_url} alt={student.full_name} className="h-full w-full object-cover" />
    ) : (
      <div className="flex h-full w-full items-center justify-center">
        <User className="h-5 w-5 text-slate-400" />
      </div>
    )}
  </div>
);

const RankedRow = ({ student, rank, isHighlighted }) => (
  <div className={`flex items-center gap-3 px-4 py-4 ${isHighlighted ? 'bg-emerald-50/70' : 'bg-white'}`}>
    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
      <Star className={`absolute inset-0 h-9 w-9 fill-current drop-shadow-sm ${listTheme.rank}`} />
      <span className="relative text-[10px] font-black text-slate-950">#{rank}</span>
    </div>

    <AvatarSquare student={student} />

    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium leading-snug text-slate-900 sm:text-base">
        {student.full_name}
      </p>
      <p className="mt-0.5 text-[10px] text-slate-500">
        {student.class_level}
        {isHighlighted ? ' · Your child' : ''}
      </p>
    </div>

    <div className={`shrink-0 text-right text-base font-black sm:text-lg ${listTheme.score}`}>
      {student.totalPoints}
    </div>
  </div>
);

const PodiumColumn = ({ student, rank, dense = false }) => {
  if (!student) return <div className="min-h-[1px]" />;

  const theme = podiumTheme[rank];
  const isChampion = rank === 1;
  const avatarOffset = dense ? (isChampion ? '-top-12 sm:-top-14' : '-top-10 sm:-top-12') : (isChampion ? '-top-14 sm:-top-16' : '-top-11 sm:-top-13');
  const crownOffset = dense ? '-top-7' : '-top-8';

  return (
    <div className="relative flex h-full items-end justify-center overflow-visible">
      <div className={`relative w-full ${theme.blockHeight}`}>
        <div className={`absolute inset-x-0 bottom-0 h-full rounded-t-[2rem] rounded-b-none ${theme.block}`} />

        <div className={`absolute left-1/2 ${avatarOffset} z-20 -translate-x-1/2`}>
          {isChampion && (
            <div className={`absolute left-1/2 ${crownOffset} -translate-x-1/2`}>
              <Crown className="h-6 w-6 fill-current text-amber-400" />
            </div>
          )}

          <div className="relative">
            <AvatarCircle
              student={student}
              size={theme.avatarSize}
              ringClass={theme.ring}
              shellClass={theme.avatarShell}
            />
            <div
              className={`absolute left-1/2 bottom-0 flex h-7 w-7 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full text-[10px] font-black ${theme.badge}`}
            >
              #{rank}
            </div>
          </div>
        </div>

        <div className={`relative flex h-full flex-col items-center justify-end px-2 sm:px-3 ${theme.bottomPad} pt-14 sm:pt-16 text-center`}>
          <div className="flex h-10 sm:h-12 items-center justify-center w-full px-1 overflow-hidden">
            <p className={`${theme.nameColor} text-xs sm:text-sm md:text-base font-extrabold line-clamp-2 leading-snug sm:leading-tight text-balance text-center`}>
              {student.full_name}
            </p>
          </div>
          <p className={`mt-0.5 sm:mt-1 ${theme.scoreSize} ${theme.score}`}>
            {student.totalPoints}
          </p>
          <p className={`mt-0.5 truncate text-[10px] sm:text-[11px] ${theme.classColor}`}>
            {student.class_name || student.class_level || 'Madrasa Student'}
          </p>
        </div>
      </div>
    </div>
  );
};

const LeaderboardShowcase = ({
  standings = [],
  highlightIds = [],
  title = 'Leaderboard',
  backLabel = 'Home',
  onBack,
  onSearch,
  variant = 'compact',
  screenTone = 'emerald',
  showScreenHeader = true,
  showRankedList = true,
  // Show only this many places after the podium; highlighted students further down are
  // added at the end with their own rank. Omit to list everyone.
  listLimit,
}) => {
  const [activeTab, setActiveTab] = useState('all');
  const isScreen = variant === 'screen';

  if (!standings.length) return null;

  const highlighted = new Set(highlightIds);

  const podium = {
    1: standings[0] || null,
    2: standings[1] || null,
    3: standings[2] || null,
  };
  const rankOf = (student, index) => student.rank ?? index + 1;
  const withRank = standings.map((student, index) => ({ student, rank: rankOf(student, index) }));
  const rankedList = listLimit == null ? withRank.slice(3) : withRank.slice(3, 3 + listLimit);
  const pinnedBelow = listLimit == null
    ? []
    : withRank.slice(3 + listLimit).filter(({ student }) => highlighted.has(student.id));
  const screenSurface = screenTone === 'neutral'
    ? 'bg-[linear-gradient(180deg,#f5f5f4_0%,#e7e5e4_46%,#d6d3d1_100%)]'
    : screenTone === 'transparent'
      ? 'bg-transparent'
    : 'bg-[linear-gradient(180deg,#dff7ee_0%,#c9eadb_46%,#b4d1c5_100%)]';

  const content = (
    <div className="relative overflow-visible">
      {isScreen && showScreenHeader && (
        <header className="flex items-center justify-between px-4 pb-4 pt-[max(env(safe-area-inset-top),1rem)]">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{backLabel}</span>
          </button>

          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl">
            {title}
          </h1>

          <button
            type="button"
            onClick={onSearch}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100"
            aria-label="Search leaderboard"
          >
            <Search className="h-5 w-5" />
          </button>
        </header>
      )}

      {!isScreen && (
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="flex items-center gap-2 text-slate-600">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold">{title}</span>
          </div>
          <Search className="h-5 w-5 text-slate-400" />
        </div>
      )}

      <section className={`relative z-10 overflow-hidden ${isScreen ? `${screenSurface} px-4 ${showRankedList ? 'pb-20 sm:pb-24' : 'pb-8'} pt-4 sm:pt-6` : 'bg-[linear-gradient(180deg,#eff9f5_0%,#d9eee4_100%)] px-4 pb-20 pt-4 sm:pb-20'}`}>
        <div className={`relative mx-auto max-w-md sm:max-w-2xl ${isScreen ? (showRankedList ? 'pt-28 sm:pt-32' : 'pt-20 sm:pt-24') : 'pt-20 sm:pt-24'}`}>
          <div className="grid grid-cols-3 items-end gap-3 sm:gap-5 px-2 sm:px-4">
            <PodiumColumn student={podium[2]} rank={2} dense={!isScreen} />
            <PodiumColumn student={podium[1]} rank={1} dense={!isScreen} />
            <PodiumColumn student={podium[3]} rank={3} dense={!isScreen} />
          </div>

          {/* Grounded 3D Stage Pedestal Base Table */}
          <div className="relative z-20 -mt-1 rounded-2xl bg-gradient-to-b from-stone-900 via-stone-950 to-black border-t-2 border-amber-400/50 p-3 sm:p-4 text-center shadow-2xl ring-1 ring-stone-800">
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-amber-300 tracking-widest uppercase">
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              <span>RMS Academic Honor Stage</span>
            </div>
          </div>
        </div>
      </section>

      {showRankedList && <section className={`relative z-20 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] ${isScreen ? '-mt-10 sm:-mt-12' : '-mt-8 sm:-mt-10'}`}>
        <div className={`overflow-hidden rounded-t-[2rem] rounded-b-[2rem] bg-white shadow-[0_-18px_50px_rgba(15,23,42,0.15)] ring-1 ring-slate-200 ${!isScreen ? 'mx-auto max-w-md sm:max-w-2xl' : ''}`}>
          <div className="px-4 pt-6">
            <div className="mx-auto flex max-w-sm items-center justify-between rounded-full bg-emerald-700 p-1 shadow-sm">
              {filterTabs.map(tab => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                      active ? 'bg-emerald-600 text-white shadow-sm' : 'text-white/80'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 divide-y divide-slate-200">
            {rankedList.map(({ student, rank }) => (
              <RankedRow key={student.id} student={student} rank={rank} isHighlighted={highlighted.has(student.id)} />
            ))}
            {pinnedBelow.length > 0 && (
              <div className="flex items-center justify-center gap-1 bg-slate-50 py-1.5 text-slate-400" aria-hidden="true">
                <span className="h-1 w-1 rounded-full bg-current" />
                <span className="h-1 w-1 rounded-full bg-current" />
                <span className="h-1 w-1 rounded-full bg-current" />
              </div>
            )}
            {pinnedBelow.map(({ student, rank }) => (
              <RankedRow key={student.id} student={student} rank={rank} isHighlighted />
            ))}
          </div>
        </div>
      </section>}
    </div>
  );

  if (isScreen) {
    return (
      <div className="w-full overflow-hidden">
        <div className={`mx-auto flex w-full max-w-md flex-col overflow-hidden sm:max-w-2xl ${screenTone === 'transparent' ? 'bg-transparent' : 'bg-slate-50'}`}>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-slate-50 shadow-sm">
      {content}
    </div>
  );
};

export default LeaderboardShowcase;
