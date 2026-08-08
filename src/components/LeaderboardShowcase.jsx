import React, { useState } from 'react';
import { ArrowLeft, Crown, Search, Star, Trophy, User } from 'lucide-react';

const filterTabs = [
  { id: 'all', label: 'All' },
  { id: 'week', label: 'This Week' },
  { id: 'friends', label: 'Friends' },
];

const podiumTheme = {
  1: {
    block: 'bg-gradient-to-b from-slate-200 to-slate-300 text-slate-950 shadow-[0_18px_40px_rgba(0,0,0,0.18)]',
    ring: 'border-amber-400',
    badge: 'bg-amber-400 text-amber-950',
    score: 'text-amber-500',
    avatarShell: 'bg-slate-950 border-amber-400',
    avatarSize: 'w-28 h-28 sm:w-32 sm:h-32',
    blockHeight: 'h-[19rem] sm:h-[21rem]',
    bottomPad: 'pb-6',
    titleSize: 'text-base sm:text-lg',
    scoreSize: 'text-2xl sm:text-4xl',
  },
  2: {
    block: 'bg-slate-700/90 text-white shadow-[0_14px_30px_rgba(0,0,0,0.16)]',
    ring: 'border-sky-400',
    badge: 'bg-sky-400 text-slate-950',
    score: 'text-sky-300',
    avatarShell: 'bg-slate-950 border-sky-400',
    avatarSize: 'w-20 h-20 sm:w-24 sm:h-24',
    blockHeight: 'h-[14rem] sm:h-[16rem]',
    bottomPad: 'pb-5',
    titleSize: 'text-sm sm:text-base',
    scoreSize: 'text-xl sm:text-3xl',
  },
  3: {
    block: 'bg-slate-700/90 text-white shadow-[0_14px_30px_rgba(0,0,0,0.16)]',
    ring: 'border-emerald-400',
    badge: 'bg-emerald-400 text-slate-950',
    score: 'text-emerald-300',
    avatarShell: 'bg-slate-950 border-emerald-400',
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
  <div className={`rounded-full border-4 ${ringClass} ${size} overflow-hidden shadow-lg ${shellClass}`}>
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
              <Crown className="h-6 w-6 fill-current text-amber-400 drop-shadow-sm" />
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
              className={`absolute left-1/2 bottom-0 flex h-7 w-7 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full text-[10px] font-black shadow-md ${theme.badge}`}
            >
              #{rank}
            </div>
          </div>
        </div>

        <div className={`relative flex h-full flex-col items-center justify-end px-3 ${theme.bottomPad} pt-16 text-center sm:px-4`}>
          <p className={`font-medium text-white ${theme.titleSize} truncate`}>
            {student.full_name}
          </p>
          <p className={`mt-1 font-black ${theme.scoreSize} ${theme.score}`}>
            {student.totalPoints}
          </p>
          <p className="mt-1 truncate text-[10px] text-white/55">
            {student.class_level}
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
  showScreenHeader = true,
  showRankedList = true,
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
  const rankedList = standings.slice(3);

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

      <section className={`relative z-10 overflow-hidden ${isScreen ? 'bg-[linear-gradient(180deg,#dff7ee_0%,#c9eadb_46%,#b4d1c5_100%)] px-4 pb-20 pt-6 sm:pb-24 sm:pt-8' : 'bg-[linear-gradient(180deg,#eff9f5_0%,#d9eee4_100%)] px-4 pb-20 pt-4 sm:pb-20'}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.45),transparent_35%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.32),transparent_28%)]" />
        <div className={`relative mx-auto max-w-md sm:max-w-2xl ${isScreen ? 'pt-28 sm:pt-32' : 'pt-20 sm:pt-24'}`}>
          <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
            <PodiumColumn student={podium[2]} rank={2} dense={!isScreen} />
            <PodiumColumn student={podium[1]} rank={1} dense={!isScreen} />
            <PodiumColumn student={podium[3]} rank={3} dense={!isScreen} />
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
            {rankedList.map((student, index) => {
              const rank = index + 4;
              const isHighlighted = highlighted.has(student.id);
              return (
                <div
                  key={student.id}
                  className={`flex items-center gap-3 px-4 py-4 ${isHighlighted ? 'bg-emerald-50/70' : 'bg-white'}`}
                >
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
                      {isHighlighted ? ' · Your student' : ''}
                    </p>
                  </div>

                  <div className={`shrink-0 text-right text-base font-black sm:text-lg ${listTheme.score}`}>
                    {student.totalPoints}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>}
    </div>
  );

  if (isScreen) {
    return (
      <div className="w-full overflow-hidden">
        <div className="mx-auto flex w-full max-w-md flex-col overflow-hidden bg-slate-50 sm:max-w-2xl">
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
