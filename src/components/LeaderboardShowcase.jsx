import React, { useState } from 'react';
import { ArrowLeft, Crown, Search, Star, Trophy, User } from 'lucide-react';

const podiumOrder = [2, 1, 3];

const podiumTheme = {
  1: {
    block: 'bg-gradient-to-b from-slate-200 to-slate-300 text-slate-950 shadow-[0_18px_40px_rgba(0,0,0,0.18)]',
    ring: 'border-amber-400',
    badge: 'bg-amber-400 text-amber-950',
    score: 'text-amber-500',
    avatar: 'bg-slate-950 border-amber-400',
    accent: 'bg-amber-400',
    size: 'w-24 h-24 sm:w-28 sm:h-28',
    height: 'h-[17.5rem] sm:h-[19.5rem]',
  },
  2: {
    block: 'bg-slate-700/90 text-white shadow-[0_14px_30px_rgba(0,0,0,0.16)]',
    ring: 'border-sky-400',
    badge: 'bg-sky-400 text-slate-950',
    score: 'text-sky-300',
    avatar: 'bg-slate-950 border-sky-400',
    accent: 'bg-sky-400',
    size: 'w-20 h-20 sm:w-24 sm:h-24',
    height: 'h-[13.5rem] sm:h-[15rem]',
  },
  3: {
    block: 'bg-slate-700/90 text-white shadow-[0_14px_30px_rgba(0,0,0,0.16)]',
    ring: 'border-emerald-400',
    badge: 'bg-emerald-400 text-slate-950',
    score: 'text-emerald-300',
    avatar: 'bg-slate-950 border-emerald-400',
    accent: 'bg-emerald-400',
    size: 'w-20 h-20 sm:w-24 sm:h-24',
    height: 'h-[11.5rem] sm:h-[13rem]',
  },
};

const listTheme = {
  badge: 'text-amber-500',
  score: 'text-emerald-700',
};

const filterTabs = [
  { id: 'all', label: 'All' },
  { id: 'week', label: 'This Week' },
  { id: 'friends', label: 'Friends' },
];

const AvatarCircle = ({ student, size, ringClass }) => (
  <div className={`relative rounded-full border-4 ${ringClass} ${size} overflow-hidden bg-slate-950 shadow-lg`}>
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

const PodiumCard = ({ student, rank }) => {
  if (!student) return <div className="min-h-[1px]" />;

  const theme = podiumTheme[rank];
  const isChampion = rank === 1;
  const avatarOffset = isChampion ? '-top-14 sm:-top-16' : '-top-12 sm:-top-14';

  return (
    <div className="relative flex h-full flex-col items-center justify-end overflow-visible">
      <div className={`absolute left-1/2 ${avatarOffset} z-20 -translate-x-1/2`}>
        {isChampion && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2">
            <Crown className="h-6 w-6 fill-current text-amber-400 drop-shadow-sm" />
          </div>
        )}

        <div className="relative">
          <AvatarCircle student={student} size={theme.size} ringClass={theme.ring} />
          <div
            className={`absolute left-1/2 bottom-0 flex h-7 w-7 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full text-[10px] font-black shadow-md ${theme.badge}`}
          >
            #{rank}
          </div>
        </div>
      </div>

      <div className={`relative w-full ${theme.height} rounded-t-[2rem] rounded-b-none ${theme.block}`}>
        <div className="flex h-full flex-col justify-end px-3 pb-5 pt-14 text-center sm:px-4">
          <p className={`font-medium ${isChampion ? 'text-base sm:text-lg' : 'text-sm sm:text-base'} truncate`}>
            {student.full_name}
          </p>
          <p className={`mt-1 text-2xl font-black sm:text-3xl ${theme.score}`}>
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
}) => {
  const [activeTab, setActiveTab] = useState('all');

  if (!standings.length) return null;

  const highlighted = new Set(highlightIds);
  const podiumStudents = {
    1: standings[0] || null,
    2: standings[1] || null,
    3: standings[2] || null,
  };

  const rankedList = standings.slice(3);

  return (
    <div className="w-full overflow-hidden">
      <div className="mx-auto flex w-full max-w-md flex-col overflow-hidden bg-slate-50 sm:max-w-2xl">
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

        <section className="relative overflow-hidden bg-[linear-gradient(180deg,#dff7ee_0%,#c9eadb_46%,#b4d1c5_100%)] px-4 pb-20 pt-6 sm:pb-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.45),transparent_35%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.32),transparent_28%)]" />
          <div className="relative mx-auto max-w-md sm:max-w-2xl">
            <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
              <div className="flex h-full flex-col justify-end">
                <PodiumCard student={podiumStudents[2]} rank={2} />
              </div>
              <div className="flex h-full flex-col justify-end">
                <PodiumCard student={podiumStudents[1]} rank={1} />
              </div>
              <div className="flex h-full flex-col justify-end">
                <PodiumCard student={podiumStudents[3]} rank={3} />
              </div>
            </div>
          </div>
        </section>

        <section className="-mt-10 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] sm:-mt-12">
          <div className="overflow-hidden rounded-t-[2rem] rounded-b-[2rem] bg-white shadow-[0_-18px_50px_rgba(15,23,42,0.15)] ring-1 ring-slate-200">
            <div className="px-4 pt-4">
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
              {rankedList.length > 0 ? (
                rankedList.map((student, index) => {
                  const rank = index + 4;
                  const isHighlighted = highlighted.has(student.id);
                  return (
                    <div
                      key={student.id}
                      className={`flex items-center gap-3 px-4 py-4 ${
                        isHighlighted ? 'bg-emerald-50/70' : 'bg-white'
                      }`}
                    >
                      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                        <Star className={`absolute inset-0 h-9 w-9 fill-current drop-shadow-sm ${listTheme.badge}`} />
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
                })
              ) : (
                <div className="px-4 py-12 text-center text-sm text-slate-400">
                  No ranked list available
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LeaderboardShowcase;
