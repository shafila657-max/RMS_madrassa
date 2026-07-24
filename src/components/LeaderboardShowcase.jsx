import React from 'react';
import { Crown, Medal, Trophy, User } from 'lucide-react';

const podium = [
  {
    rank: 3,
    label: 'THIRD',
    card: 'order-1 bg-white/10 border-emerald-400/50',
    badge: 'bg-emerald-400/90 text-emerald-950',
    ring: 'border-emerald-400',
    points: 'text-emerald-300'
  },
  {
    rank: 1,
    label: 'CHAMPION',
    card: 'order-2 bg-gradient-to-b from-amber-500/25 to-white/10 border-amber-400/70',
    badge: 'bg-amber-400 text-amber-950',
    ring: 'border-amber-400',
    points: 'text-amber-300'
  },
  {
    rank: 2,
    label: 'SECOND',
    card: 'order-3 bg-white/10 border-white/15',
    badge: 'bg-slate-300 text-slate-900',
    ring: 'border-sky-400',
    points: 'text-sky-300'
  },
];

const Avatar = ({ student, size = 'w-16 h-16' }) => (
  <div className={`${size} rounded-full bg-stone-800 border-4 overflow-hidden flex items-center justify-center flex-shrink-0`}>
    {student.photo_url ? (
      <img src={student.photo_url} alt={student.full_name} className="w-full h-full object-cover" />
    ) : (
      <User className="w-8 h-8 text-stone-400" />
    )}
  </div>
);

const LeaderboardShowcase = ({ standings = [], highlightIds = [], title = 'Top Performing Students' }) => {
  if (!standings.length) return null;

  const highlighted = new Set(highlightIds);
  const topFive = standings.slice(3, 8);
  const highlightedOutsideTopFive = standings.filter(student =>
    highlighted.has(student.id) && student.rank > 5
  );
  const listRows = [...topFive, ...highlightedOutsideTopFive.filter(student => !topFive.some(row => row.id === student.id))];

  return (
    <div className="rounded-3xl bg-[#171a2d] p-4 sm:p-6 text-white shadow-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-300">Madrasa leaderboard</p>
          <h3 className="font-heading text-xl sm:text-2xl font-bold mt-1">{title}</h3>
        </div>
        <Trophy className="w-6 h-6 text-amber-400" />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end mb-5 pt-4">
        {podium.map(({ rank, label, card, badge, ring, points }) => {
          const student = standings[rank - 1];
          if (!student) return <div key={rank} />;
          const isChampion = rank === 1;
          const stageHeight = isChampion
            ? 'min-h-[250px] sm:min-h-[290px]'
            : rank === 2
            ? 'min-h-[205px] sm:min-h-[235px]'
            : 'min-h-[190px] sm:min-h-[220px]';
          return (
            <div
              key={student.id}
              className={`rounded-2xl border p-3 sm:p-4 text-center min-w-0 shadow-lg ${
                isChampion ? 'pb-6 sm:pb-7' : 'pb-4 sm:pb-5'
              } ${card}`}
              style={{ height: '100%' }}
            >
              <div className={`flex h-full flex-col ${stageHeight}`}>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black ${badge}`}>
                {rank === 1 ? <Crown className="w-3 h-3" /> : <Medal className="w-3 h-3" />} #{rank}
              </span>
              <div className={`flex justify-center ${isChampion ? 'my-4' : 'my-3'}`}>
                <Avatar student={student} size={isChampion ? 'w-20 h-20 sm:w-24 sm:h-24' : 'w-14 h-14 sm:w-16 sm:h-16'} />
              </div>
              <p className={`font-bold truncate ${isChampion ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'}`}>{student.full_name}</p>
              <p className="text-[10px] text-stone-400 truncate mt-1">{student.class_level}</p>
              <p className={`font-black ${isChampion ? 'text-2xl sm:text-3xl mt-3' : 'text-lg sm:text-xl mt-2'} ${points}`}>{student.totalPoints}</p>
              <p className="text-[9px] text-stone-400">points</p>
              </div>
            </div>
          );
        })}
      </div>

      {listRows.length > 0 && (
        <div className="rounded-2xl bg-[#20243b] border border-white/10 px-3 sm:px-5 py-1">
          {listRows.map((student, index) => {
            const isHighlighted = highlighted.has(student.id);
            return (
              <div key={student.id} className={`flex items-center gap-3 py-3 border-b border-white/10 last:border-0 ${isHighlighted ? 'bg-emerald-400/10 -mx-2 px-2 rounded-xl' : ''}`}>
                <span className="w-6 text-center text-sm font-black text-amber-300 flex-shrink-0">#{student.rank}</span>
                <Avatar student={student} size="w-10 h-10" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{student.full_name}</p>
                  <p className="text-[10px] text-stone-400 truncate">{student.class_level}{isHighlighted ? ' · Your student' : ''}</p>
                </div>
                <p className="font-black text-sm sm:text-base text-white whitespace-nowrap">{student.totalPoints}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LeaderboardShowcase;
