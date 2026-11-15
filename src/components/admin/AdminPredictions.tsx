import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Prediction,
  PredictionCategory,
  PredictionStatus
} from '../../types';
import {
  Plus,
  Search,
  Play,
  Pause,
  Lock,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  Clock,
  Radio,
  RefreshCw,
  Zap,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  isClosingTimePassed,
  isMarketBettingOpen,
  toLocalDatetimeInputValue,
  formatCountdownToClose
} from '../../utils/marketTiming';
import {
  buildLiveCricketSessionAnalysis,
  type CricketMarketSuggestion
} from '../../utils/cricketSessionOdds';

interface AdminPredictionsProps {
  initialCreateOpen?: boolean;
  onClearInitialCreate?: () => void;
}

const CATEGORIES: PredictionCategory[] = [
  'Cricket',
  'Movies',
  'Football',
  'Basketball',
  'Tennis',
  'Esports',
  'Crypto & Finance'
];

export const AdminPredictions: React.FC<AdminPredictionsProps> = ({
  initialCreateOpen,
  onClearInitialCreate
}) => {
  const {
    predictions,
    createPrediction,
    updatePrediction,
    setPredictionStatus,
    deletePrediction,
    settlePrediction,
    bets,
    nowMs,
    liveCricketMatches,
    cricketStreamConnected,
    cricketLoading,
    activeCricketDetail,
    cricketDetailLoading,
    refreshCricketMatches,
    selectCricketMatchForDetail
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PredictionStatus>('all');
  const [liveMatchFilter, setLiveMatchFilter] = useState<'in' | 'pre' | 'all'>('in');
  const [liveMatchSearch, setLiveMatchSearch] = useState('');
  const [quickPublishingId, setQuickPublishingId] = useState<string | null>(null);
  const [createNotice, setCreateNotice] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(!!initialCreateOpen);
  const [editPred, setEditPred] = useState<Prediction | null>(null);
  const [reopenAfterEdit, setReopenAfterEdit] = useState<boolean>(false);
  const [settlePred, setSettlePred] = useState<Prediction | null>(null);
  const [deletePred, setDeletePred] = useState<Prediction | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  // Create/Edit Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<PredictionCategory>('Cricket');
  const [yesOdds, setYesOdds] = useState<number>(1.85);
  const [noOdds, setNoOdds] = useState<number>(2.10);
  const [minBet, setMinBet] = useState<number>(500);
  const [maxBet, setMaxBet] = useState<number>(100000);
  const [closingTime, setClosingTime] = useState<string>(
    toLocalDatetimeInputValue(new Date(Date.now() + 24 * 3600 * 1000))
  );
  const [description, setDescription] = useState('');
  const [cricketMatchId, setCricketMatchId] = useState<string>('');
  const [cricketLeagueId, setCricketLeagueId] = useState<string>('');
  const [formError, setFormError] = useState('');

  // Settlement Form State
  const [settleOutcome, setSettleOutcome] = useState<'YES' | 'NO' | 'VOID'>('YES');
  const [settleResult, setSettleResult] = useState<{ winners: number; payout: number } | null>(null);

  // Filtered Predictions
  const filteredPredictions = predictions.filter(p => {
    const autoPaused = p.status === 'open' && isClosingTimePassed(p.closingTime, nowMs);
    if (statusFilter === 'open' && !isMarketBettingOpen(p, nowMs)) return false;
    if (statusFilter === 'paused' && p.status !== 'paused' && !autoPaused) return false;
    if ((statusFilter === 'closed' || statusFilter === 'settled') && p.status !== statusFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchT = p.title.toLowerCase().includes(q);
      const matchS = p.subtitle.toLowerCase().includes(q);
      const matchC = p.category.toLowerCase().includes(q);
      if (!matchT && !matchS && !matchC) return false;
    }
    return true;
  });

  const liveRunningMatches = liveCricketMatches.filter(m => m.status === 'in');
  const upcomingCricketMatches = liveCricketMatches.filter(m => m.status === 'pre');
  const modalCricketMatches = (
    liveMatchFilter === 'in'
      ? liveRunningMatches
      : liveMatchFilter === 'pre'
        ? upcomingCricketMatches
        : liveCricketMatches
  ).filter(m => {
    if (!liveMatchSearch.trim()) return true;
    const q = liveMatchSearch.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.shortName.toLowerCase().includes(q) ||
      m.leagueName.toLowerCase().includes(q)
    );
  });

  const selectedLiveMatch = liveCricketMatches.find(m => m.id === cricketMatchId) || null;
  const selectedMatchAnalysis = selectedLiveMatch
    ? buildLiveCricketSessionAnalysis(
        selectedLiveMatch,
        activeCricketDetail?.match.id === selectedLiveMatch.id ? activeCricketDetail : null
      )
    : null;

  const handleOpenCreate = () => {
    setTitle('');
    setSubtitle('');
    setCategory('Cricket');
    setYesOdds(1.85);
    setNoOdds(2.10);
    setMinBet(500);
    setMaxBet(100000);
    setClosingTime(toLocalDatetimeInputValue(new Date(Date.now() + 24 * 3600 * 1000)));
    setDescription('');
    setCricketMatchId('');
    setCricketLeagueId('');
    setFormError('');
    setCreateNotice(null);
    setLiveMatchSearch('');
    setLiveMatchFilter(liveRunningMatches.length > 0 ? 'in' : 'all');
    void refreshCricketMatches();
    setShowCreateModal(true);
  };

  const handleSelectCricketMatch = (matchId: string) => {
    setCricketMatchId(matchId);
    setCreateNotice(null);
    if (!matchId) {
      setCricketLeagueId('');
      void selectCricketMatchForDetail(null);
      return;
    }
    const found = liveCricketMatches.find(m => m.id === matchId);
    if (found) {
      setCricketLeagueId(found.leagueId);
      setCategory('Cricket');
      void selectCricketMatchForDetail(found);
      const analysis = buildLiveCricketSessionAnalysis(found);
      const firstSuggestion = analysis.suggestions[0];
      if (firstSuggestion) {
        setTitle(firstSuggestion.title);
        setSubtitle(firstSuggestion.subtitle);
        setYesOdds(firstSuggestion.yesOdds);
        setNoOdds(firstSuggestion.noOdds);
        setClosingTime(
          toLocalDatetimeInputValue(
            new Date(Date.now() + firstSuggestion.closingMinutesFromNow * 60 * 1000)
          )
        );
        setDescription(firstSuggestion.description);
      } else if (!subtitle.trim()) {
        setSubtitle(`${found.shortName} · ${found.format}`);
      }
    }
  };

  const handleApplySuggestion = (s: CricketMarketSuggestion) => {
    setCategory('Cricket');
    setTitle(s.title);
    setSubtitle(s.subtitle);
    setYesOdds(s.yesOdds);
    setNoOdds(s.noOdds);
    setClosingTime(
      toLocalDatetimeInputValue(new Date(Date.now() + s.closingMinutesFromNow * 60 * 1000))
    );
    setDescription(s.description);
    setFormError('');
    setCreateNotice(`Loaded "${s.label}" (${s.yesOdds.toFixed(2)}x / ${s.noOdds.toFixed(2)}x) into form below.`);
  };

  const handleQuickPublishSuggestion = async (s: CricketMarketSuggestion) => {
    if (!selectedLiveMatch) return;
    setFormError('');
    setCreateNotice(null);
    setQuickPublishingId(s.id);
    const closingIso = new Date(Date.now() + s.closingMinutesFromNow * 60 * 1000).toISOString();
    const res = await createPrediction({
      title: s.title,
      subtitle: s.subtitle,
      category: 'Cricket',
      yesOdds: s.yesOdds,
      noOdds: s.noOdds,
      minBet: Number(minBet) >= 500 && Number(minBet) < 100000 ? Number(minBet) : 500,
      maxBet: Number(maxBet) > Number(minBet) && Number(maxBet) <= 100000 ? Number(maxBet) : 100000,
      closingTime: closingIso,
      status: 'open',
      description: s.description,
      cricketMatchId: selectedLiveMatch.id,
      cricketLeagueId: selectedLiveMatch.leagueId
    });
    setQuickPublishingId(null);
    if (res.success) {
      setCreateNotice(`Published "${s.label}" live for users (${s.yesOdds.toFixed(2)}x YES / ${s.noOdds.toFixed(2)}x NO).`);
    } else {
      setFormError(res.error || 'Failed to publish live prediction');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('Prediction question is required');
      return;
    }
    if (yesOdds <= 1 || noOdds <= 1) {
      setFormError('Odds must be strictly greater than 1.00');
      return;
    }
    if (minBet < 500 || maxBet > 100000 || maxBet <= minBet) {
      setFormError('Bet limits must be between 500 and 100,000 coins (with Max > Min)');
      return;
    }
    const closingDate = new Date(closingTime);
    if (Number.isNaN(closingDate.getTime())) {
      setFormError('Please select a valid closing date and time');
      return;
    }
    if (closingDate.getTime() <= Date.now()) {
      setFormError('Market closing date & time must be in the future');
      return;
    }

    const res = await createPrediction({
      title: title.trim(),
      subtitle: subtitle.trim() || 'Official Match Prediction',
      category,
      yesOdds: Number(yesOdds),
      noOdds: Number(noOdds),
      minBet: Number(minBet),
      maxBet: Number(maxBet),
      closingTime: closingDate.toISOString(),
      status: 'open',
      description: description.trim(),
      ...(cricketMatchId ? { cricketMatchId, cricketLeagueId } : {})
    });

    if (res.success) {
      setShowCreateModal(false);
      onClearInitialCreate?.();
    } else {
      setFormError(res.error || 'Failed to create prediction');
    }
  };

  const handleOpenEdit = (p: Prediction, options?: { reopen?: boolean; reason?: string }) => {
    setEditPred(p);
    setReopenAfterEdit(!!options?.reopen);
    setTitle(p.title);
    setSubtitle(p.subtitle);
    setCategory(p.category);
    setYesOdds(p.yesOdds);
    setNoOdds(p.noOdds);
    setMinBet(p.minBet);
    setMaxBet(p.maxBet);
    setClosingTime(toLocalDatetimeInputValue(p.closingTime));
    setDescription(p.description || '');
    setCricketMatchId(p.cricketMatchId || '');
    setCricketLeagueId(p.cricketLeagueId || '');
    setFormError(options?.reason || '');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPred) return;
    setFormError('');

    if (!title.trim()) {
      setFormError('Prediction question is required');
      return;
    }
    if (yesOdds <= 1 || noOdds <= 1) {
      setFormError('Odds must be strictly greater than 1.00');
      return;
    }
    if (minBet < 500 || maxBet > 100000 || maxBet <= minBet) {
      setFormError('Bet limits must be between 500 and 100,000 coins (with Max > Min)');
      return;
    }
    const closingDate = new Date(closingTime);
    if (Number.isNaN(closingDate.getTime())) {
      setFormError('Please select a valid closing date and time');
      return;
    }
    if (reopenAfterEdit && closingDate.getTime() <= Date.now()) {
      setFormError('Extend the closing date & time into the future to reopen betting');
      return;
    }

    const nextStatus: PredictionStatus =
      reopenAfterEdit
        ? 'open'
        : editPred.status === 'open' && closingDate.getTime() <= Date.now()
          ? 'paused'
          : editPred.status;

    const res = await updatePrediction(editPred.id, {
      title: title.trim(),
      subtitle: subtitle.trim() || 'Official Match Prediction',
      category,
      yesOdds: Number(yesOdds),
      noOdds: Number(noOdds),
      minBet: Number(minBet),
      maxBet: Number(maxBet),
      closingTime: closingDate.toISOString(),
      status: nextStatus,
      description: description.trim(),
      cricketMatchId: cricketMatchId || undefined,
      cricketLeagueId: cricketLeagueId || undefined
    });

    if (res.success) {
      setEditPred(null);
      setReopenAfterEdit(false);
    } else {
      setFormError(res.error || 'Failed to save prediction');
    }
  };

  const handleOpenSettle = (p: Prediction) => {
    setSettlePred(p);
    setSettleOutcome('YES');
    setSettleResult(null);
  };

  const handleConfirmSettlement = async () => {
    if (!settlePred) return;

    const res = await settlePrediction(settlePred.id, settleOutcome);
    if (res.success) {
      setSettleResult({
        winners: res.winnersCount,
        payout: res.totalPayout
      });

      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // Confetti fallback
      }
    } else {
      setDeleteNotice(res.error || 'Failed to settle prediction');
      setTimeout(() => setDeleteNotice(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex flex-wrap items-center gap-2">
            <span>Prediction Markets &amp; Settlement</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
              {predictions.length} Total Markets
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Create, manage, pause, and settle YES/NO prediction markets across Cricket, Movies, Football, and more.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              handleOpenCreate();
              setLiveMatchFilter('in');
            }}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 font-bold text-xs flex items-center gap-2 whitespace-nowrap shrink-0 transition cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-[#14e071]" />
            <span>Live Cricket ({liveRunningMatches.length} Running)</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 whitespace-nowrap shrink-0 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create New Prediction
          </button>
        </div>
      </div>

      {/* Delete Notice Banner */}
      {deleteNotice && (
        <div className="p-3.5 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{deleteNotice}</span>
          </div>
          <button
            onClick={() => setDeleteNotice(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search prediction question..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          {(['all', 'open', 'paused', 'closed', 'settled'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg capitalize transition ${
                statusFilter === st
                  ? 'bg-slate-800 text-amber-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Predictions Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Prediction Details</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Odds (YES / NO)</th>
                <th className="px-4 py-3.5">Limits</th>
                <th className="px-4 py-3.5">Volume & Bets</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredPredictions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No predictions found.
                  </td>
                </tr>
              ) : (
                filteredPredictions.map(pred => {
                  const predBets = bets.filter(b => b.predictionId === pred.id);
                  const isSettled = pred.status === 'settled';
                  const isExpired = isClosingTimePassed(pred.closingTime, nowMs);
                  const isAutoPaused = pred.status === 'open' && isExpired;
                  const isOpen = isMarketBettingOpen(pred, nowMs);
                  const isPaused = pred.status === 'paused' || isAutoPaused;
                  const isClosed = pred.status === 'closed';

                  return (
                    <tr key={pred.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3.5 max-w-sm">
                        <div className="font-bold text-white text-xs">{pred.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">{pred.subtitle}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>
                            Closes: {new Date(pred.closingTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {!isSettled && (
                            <span className={`font-semibold ${isExpired ? 'text-amber-400' : 'text-emerald-400'}`}>
                              · {formatCountdownToClose(pred.closingTime, nowMs)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold text-[11px] border border-slate-700">
                          {pred.category}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[11px]">
                            Y: {pred.yesOdds.toFixed(2)}x
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold text-[11px]">
                            N: {pred.noOdds.toFixed(2)}x
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-400">
                        {pred.minBet.toLocaleString()} - {pred.maxBet.toLocaleString()} 🪙
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-mono font-bold text-white">
                          🪙 {(pred.totalYesVolume + pred.totalNoVolume).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {predBets.length} registered slips
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isOpen && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                            OPEN
                          </span>
                        )}
                        {isPaused && (
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                              {isAutoPaused ? 'AUTO-PAUSED' : 'PAUSED'}
                            </span>
                            {isExpired && (
                              <span className="text-[10px] text-amber-300/80">
                                Closing time passed
                              </span>
                            )}
                          </div>
                        )}
                        {isClosed && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 text-[10px] font-bold">
                            CLOSED
                          </span>
                        )}
                        {isSettled && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">
                            SETTLED: {pred.outcome}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* SETTLE BUTTON */}
                          {!isSettled ? (
                            <button
                              onClick={() => handleOpenSettle(pred)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow"
                            >
                              <Trophy className="w-3.5 h-3.5" />
                              Settle
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-medium px-2 py-1">
                              Settled ✓
                            </span>
                          )}

                          {/* Pause / Resume */}
                          {!isSettled && (
                            <button
                              onClick={() => {
                                if (isOpen) {
                                  setPredictionStatus(pred.id, 'paused');
                                } else if (isExpired) {
                                  handleOpenEdit(pred, {
                                    reopen: true,
                                    reason:
                                      'Closing date & time has already passed. Extend the closing date & time into the future to reopen betting.'
                                  });
                                } else {
                                  setPredictionStatus(pred.id, 'open');
                                }
                              }}
                              title={
                                isOpen
                                  ? 'Pause Betting'
                                  : isExpired
                                    ? 'Extend Closing Time to Resume'
                                    : 'Resume Betting'
                              }
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                            >
                              {isOpen ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                            </button>
                          )}

                          {/* Close Betting */}
                          {!isSettled && !isClosed && (
                            <button
                              onClick={() => setPredictionStatus(pred.id, 'closed')}
                              title="Close Betting"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit */}
                          {!isSettled && (
                            <button
                              onClick={() => handleOpenEdit(pred)}
                              title="Edit Prediction"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Prediction (Always available to Admin) */}
                          <button
                            onClick={() => setDeletePred(pred)}
                            title="Delete Prediction"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PREDICTION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-400" />
                  Create New Prediction Market
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pick any live running cricket match to see real-time Match Winner &amp; Session odds, or build a custom market.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  void selectCricketMatchForDetail(null);
                  onClearInitialCreate?.();
                }}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Live Running Cricket Matches & Session Odds Panel */}
              <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#14e071]" />
                    <span className="font-bold text-sm text-white">Live Running Matches &amp; Session Odds</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          cricketStreamConnected ? 'bg-[#14e071] animate-pulse' : 'bg-amber-400'
                        }`}
                      />
                      {cricketStreamConnected ? 'Live Stream' : 'Syncing'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                      {[
                        { id: 'in' as const, label: `Live (${liveRunningMatches.length})` },
                        { id: 'pre' as const, label: `Upcoming (${upcomingCricketMatches.length})` },
                        { id: 'all' as const, label: `All (${liveCricketMatches.length})` }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setLiveMatchFilter(tab.id)}
                          className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition cursor-pointer ${
                            liveMatchFilter === tab.id
                              ? 'bg-[#14e071] text-[#04130b]'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => void refreshCricketMatches()}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${cricketLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Search Matches */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={liveMatchSearch}
                      onChange={e => setLiveMatchSearch(e.target.value)}
                      placeholder="Filter live matches or series..."
                      className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                    />
                  </div>
                  {cricketMatchId && (
                    <button
                      type="button"
                      onClick={() => handleSelectCricketMatch('')}
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold whitespace-nowrap cursor-pointer"
                    >
                      Clear Selected Match
                    </button>
                  )}
                </div>

                {/* Live Match List */}
                {modalCricketMatches.length === 0 ? (
                  <div className="py-5 text-center text-slate-400 text-[11px] border border-dashed border-slate-800 rounded-xl">
                    {cricketLoading
                      ? 'Loading live cricket matches...'
                      : liveMatchFilter === 'in'
                        ? 'No live running matches found in this filter right now. Switch to Upcoming or All above, or create a custom market below.'
                        : 'No matching cricket fixtures found.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {modalCricketMatches.map(m => {
                      const isSelected = cricketMatchId === m.id;
                      const previewAnalysis = buildLiveCricketSessionAnalysis(m);
                      const mw = previewAnalysis.suggestions[0];
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleSelectCricketMatch(m.id)}
                          className={`p-3 rounded-xl border text-left space-y-1.5 transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-950/35 border-[#14e071] ring-1 ring-[#14e071]/40'
                              : 'bg-slate-900/90 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-[10px]">
                            <span className="text-slate-400 truncate">
                              {m.leagueName} · {m.format}
                            </span>
                            <span
                              className={`font-bold shrink-0 ${
                                m.status === 'in'
                                  ? 'text-[#14e071]'
                                  : m.status === 'pre'
                                    ? 'text-amber-400'
                                    : 'text-slate-400'
                              }`}
                            >
                              {m.status === 'in' ? 'LIVE' : m.statusText}
                            </span>
                          </div>

                          <div className="space-y-0.5 text-[11px]">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`font-bold truncate ${m.homeTeam.isBatting ? 'text-[#14e071]' : 'text-white'}`}>
                                {m.homeTeam.shortName || m.homeTeam.name}
                              </span>
                              <span className="font-mono font-bold text-slate-200 shrink-0">
                                {m.homeTeam.score || '—'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className={`font-bold truncate ${m.awayTeam.isBatting ? 'text-[#14e071]' : 'text-white'}`}>
                                {m.awayTeam.shortName || m.awayTeam.name}
                              </span>
                              <span className="font-mono font-bold text-slate-200 shrink-0">
                                {m.awayTeam.score || '—'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-[10px]">
                            <span className="text-slate-400 truncate">{m.statusSummary}</span>
                            {mw && (
                              <span className="font-mono text-emerald-300 font-bold shrink-0">
                                {mw.yesOdds.toFixed(2)}x / {mw.noOdds.toFixed(2)}x
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Selected Match Live Match & Session Odds Board */}
                {selectedLiveMatch && selectedMatchAnalysis && (
                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>{selectedLiveMatch.name}</span>
                          <span className="text-[11px] font-normal text-slate-400">
                            {selectedLiveMatch.format} · {selectedLiveMatch.venue}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-2">
                          <span>{selectedLiveMatch.statusSummary}</span>
                          {selectedMatchAnalysis.currentRunRate !== null && (
                            <>
                              <span>·</span>
                              <span className="text-[#14e071]">
                                CRR {selectedMatchAnalysis.currentRunRate.toFixed(2)}
                              </span>
                            </>
                          )}
                          {selectedMatchAnalysis.requiredRunRate !== null && (
                            <>
                              <span>·</span>
                              <span className="text-amber-300">
                                RRR {selectedMatchAnalysis.requiredRunRate.toFixed(2)}
                              </span>
                            </>
                          )}
                          {selectedMatchAnalysis.projectedTotal !== null && (
                            <>
                              <span>·</span>
                              <span className="text-sky-300">
                                Proj {selectedMatchAnalysis.projectedTotal}
                              </span>
                            </>
                          )}
                          {cricketDetailLoading && <span className="text-slate-500">· Syncing scorecard...</span>}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {selectedMatchAnalysis.suggestions.map(s => (
                        <div
                          key={s.id}
                          className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-2.5"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-[10px]">
                              <span className="font-bold text-[#14e071] uppercase tracking-wide flex items-center gap-1">
                                <Layers className="w-3 h-3" />
                                {s.kind} · {s.label}
                              </span>
                              <span className="font-mono text-slate-400 shrink-0">
                                Win Prob {s.yesProbPct}%
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-white leading-snug">
                              {s.title}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {s.liveContext}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold">
                                YES {s.yesOdds.toFixed(2)}x
                              </span>
                              <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 font-bold">
                                NO {s.noOdds.toFixed(2)}x
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleApplySuggestion(s)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] whitespace-nowrap cursor-pointer"
                              >
                                Fill Form
                              </button>
                              <button
                                type="button"
                                disabled={quickPublishingId === s.id}
                                onClick={() => void handleQuickPublishSuggestion(s)}
                                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-slate-950 font-bold text-[11px] flex items-center gap-1 whitespace-nowrap cursor-pointer"
                              >
                                <Zap className="w-3 h-3" />
                                {quickPublishingId === s.id ? 'Publishing...' : 'Publish Live'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {createNotice && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{createNotice}</span>
                  </div>
                )}
              </div>

              {/* Question */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">
                  Prediction Question *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Will India win today's cricket match?"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-white font-medium outline-none"
                />
              </div>

              {/* Subtitle / Match */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Match / Event Subtitle</label>
                  <input
                    type="text"
                    placeholder="e.g. India vs Australia - 2nd Test"
                    value={subtitle}
                    onChange={e => setSubtitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as PredictionCategory)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* YES & NO Odds Multipliers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-emerald-400 font-semibold block">
                    YES Odds Multiplier *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    max="50"
                    required
                    value={yesOdds}
                    onChange={e => setYesOdds(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-white font-mono font-bold outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-rose-400 font-semibold block">
                    NO Odds Multiplier *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    max="50"
                    required
                    value={noOdds}
                    onChange={e => setNoOdds(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl px-3 py-2 text-white font-mono font-bold outline-none"
                  />
                </div>
              </div>

              {/* Min & Max stakes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Minimum Bet (Coins)</label>
                  <input
                    type="number"
                    min="500"
                    max="100000"
                    value={minBet}
                    onChange={e => setMinBet(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Maximum Bet (Coins)</label>
                  <input
                    type="number"
                    min="500"
                    max="100000"
                    value={maxBet}
                    onChange={e => setMaxBet(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono outline-none"
                  />
                </div>
              </div>

              {/* Closing time */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Market Closing Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={closingTime}
                  onChange={e => setClosingTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-slate-400 block">Resolution Criteria / Rules Description</label>
                <textarea
                  rows={2}
                  placeholder="Official resolution source, rule clarification, tie/washout condition..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    onClearInitialCreate?.();
                  }}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold uppercase tracking-wider shadow-lg shadow-amber-950/40"
                >
                  Publish Prediction Market
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editPred && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                Edit Prediction Market
              </h3>
              <button
                onClick={() => {
                  setEditPred(null);
                  setReopenAfterEdit(false);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Question:</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Subtitle / Match:</label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={e => setSubtitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Category:</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as PredictionCategory)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {liveCricketMatches.length > 0 && (
                <div>
                  <label className="text-emerald-400 font-semibold block mb-1">
                    Link to Live Cricket Match (Optional):
                  </label>
                  <select
                    value={cricketMatchId}
                    onChange={e => handleSelectCricketMatch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="">— No live match link —</option>
                    {liveCricketMatches.map(m => (
                      <option key={m.id} value={m.id}>
                        [{m.status === 'in' ? 'LIVE' : m.status === 'pre' ? 'UPCOMING' : 'DONE'}] {m.shortName} · {m.leagueName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-emerald-400 font-semibold block mb-1">YES Odds:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    max="50"
                    required
                    value={yesOdds}
                    onChange={e => setYesOdds(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-rose-400 font-semibold block mb-1">NO Odds:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    max="50"
                    required
                    value={noOdds}
                    onChange={e => setNoOdds(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl px-3 py-2 text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Min Bet (Coins):</label>
                  <input
                    type="number"
                    min="500"
                    max="100000"
                    value={minBet}
                    onChange={e => setMinBet(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Max Bet (Coins):</label>
                  <input
                    type="number"
                    min="500"
                    max="100000"
                    value={maxBet}
                    onChange={e => setMaxBet(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Resolution Criteria / Description:</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold">Market Closing Date & Time *</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setClosingTime(toLocalDatetimeInputValue(new Date(Date.now() + 3600 * 1000)));
                        setFormError('');
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-[10px] cursor-pointer"
                    >
                      +1h from now
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClosingTime(toLocalDatetimeInputValue(new Date(Date.now() + 24 * 3600 * 1000)));
                        setFormError('');
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-[10px] cursor-pointer"
                    >
                      +24h from now
                    </button>
                  </div>
                </div>
                <input
                  type="datetime-local"
                  required
                  value={closingTime}
                  onChange={e => {
                    setClosingTime(e.target.value);
                    setFormError('');
                  }}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-white outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Betting automatically pauses once this date & time is reached.
                </p>
              </div>

              {editPred.status !== 'open' && (
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reopenAfterEdit}
                    onChange={e => setReopenAfterEdit(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <span>Reopen betting immediately after saving (requires future closing time)</span>
                </label>
              )}

              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditPred(null);
                    setReopenAfterEdit(false);
                  }}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold uppercase tracking-wider cursor-pointer"
                >
                  {reopenAfterEdit ? 'Save & Reopen Betting' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTLEMENT RESOLUTION MODAL */}
      {settlePred && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-xs">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/90">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Settle & Resolve Prediction</h3>
              </div>
              <button onClick={() => setSettlePred(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {settleResult ? (
              /* Success Settlement Receipt */
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div>
                  <h4 className="text-xl font-bold text-white">Market Settled Successfully!</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Winning coins have been automatically distributed to winners' wallets.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Winning Outcome:</span>
                    <span className="font-bold text-emerald-400">{settleOutcome} WON</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Winning Players:</span>
                    <span className="font-bold text-white">{settleResult.winners} users</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800">
                    <span className="font-bold text-emerald-400">Total Coins Payout:</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      🪙 {settleResult.payout.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSettlePred(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Settle form */
              <div className="p-5 space-y-4">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Market Being Settled:</div>
                  <h4 className="font-bold text-white text-sm">{settlePred.title}</h4>
                  <div className="text-slate-400 text-[11px]">{settlePred.subtitle}</div>
                </div>

                {/* Outcome selector */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold block">Select Official Winning Outcome:</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSettleOutcome('YES')}
                      className={`py-3 rounded-xl font-bold border-2 transition ${
                        settleOutcome === 'YES'
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 ring-2 ring-emerald-500/20'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      <div className="text-sm">YES</div>
                      <span className="text-[10px] text-slate-400 font-mono">({settlePred.yesOdds.toFixed(2)}x)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettleOutcome('NO')}
                      className={`py-3 rounded-xl font-bold border-2 transition ${
                        settleOutcome === 'NO'
                          ? 'border-rose-500 bg-rose-950/40 text-rose-300 ring-2 ring-rose-500/20'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      <div className="text-sm">NO</div>
                      <span className="text-[10px] text-slate-400 font-mono">({settlePred.noOdds.toFixed(2)}x)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettleOutcome('VOID')}
                      className={`py-3 rounded-xl font-bold border-2 transition ${
                        settleOutcome === 'VOID'
                          ? 'border-amber-500 bg-amber-950/40 text-amber-300 ring-2 ring-amber-500/20'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      <div className="text-sm">VOID</div>
                      <span className="text-[10px] text-slate-400">Refund All</span>
                    </button>
                  </div>
                </div>

                {/* Settlement Impact Breakdown */}
                {(() => {
                  const affectedBets = bets.filter(b => b.predictionId === settlePred.id && b.result === 'pending');
                  const winningBets = settleOutcome === 'VOID' 
                    ? affectedBets 
                    : affectedBets.filter(b => b.choice === settleOutcome);
                  
                  const totalPayoutEst = settleOutcome === 'VOID'
                    ? winningBets.reduce((s, b) => s + b.amount, 0)
                    : winningBets.reduce((s, b) => s + b.potentialWinnings, 0);

                  return (
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Total Active User Predictions:</span>
                        <span className="font-mono text-white font-bold">{affectedBets.length} slips</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Winning Slips:</span>
                        <span className="font-mono text-emerald-400 font-bold">{winningBets.length} slips</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-slate-800">
                        <span className="font-bold text-white">Estimated Automated Payout:</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          🪙 {totalPayoutEst.toLocaleString()} Coins
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Settlement is irreversible. Winners' wallets will be credited immediately.</span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSettlePred(null)}
                    className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSettlement}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider shadow-lg shadow-emerald-950/40"
                  >
                    Confirm & Distribute Payouts
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELETE PREDICTION CONFIRMATION MODAL */}
      {deletePred && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-xs">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/90">
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">Delete Prediction Market</h3>
              </div>
              <button 
                onClick={() => setDeletePred(null)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-500 flex justify-between">
                  <span>{deletePred.category}</span>
                  <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                    deletePred.status === 'open' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    deletePred.status === 'settled' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {deletePred.status.toUpperCase()}
                  </span>
                </div>
                <h4 className="font-bold text-white text-sm leading-snug">{deletePred.title}</h4>
                <div className="text-slate-400 text-[11px] truncate">{deletePred.subtitle}</div>
              </div>

              {(() => {
                const targetBets = bets.filter(b => b.predictionId === deletePred.id);
                const pendingBets = targetBets.filter(b => b.result === 'pending');
                const pendingVolume = pendingBets.reduce((sum, b) => sum + b.amount, 0);

                return (
                  <div className="space-y-3">
                    {pendingBets.length > 0 ? (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5 text-amber-300">
                        <div className="font-bold flex items-center gap-1.5 text-xs">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                          <span>Active Bets Found ({pendingBets.length} registered slips)</span>
                        </div>
                        <p className="text-[11px] text-amber-200/90 leading-relaxed">
                          There are currently <strong>{pendingBets.length} active player bet(s)</strong> totaling <strong>{pendingVolume.toLocaleString()} coins</strong> on this market.
                          Deleting this prediction will <strong>automatically cancel all slips and refund {pendingVolume.toLocaleString()} coins</strong> back to the respective players' wallets immediately.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 text-[11px] leading-relaxed">
                        {deletePred.status === 'settled' ? (
                          <span>This market is already settled ({deletePred.outcome} won). Deleting it will permanently remove it from the prediction registry.</span>
                        ) : (
                          <span>No active player bets are registered on this market. It will be removed immediately.</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              <p className="text-slate-400 text-[11px]">
                Are you sure you want to permanently delete this prediction market?
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDeletePred(null)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await deletePrediction(deletePred.id);
                    if (res.success) {
                      if (res.refundedCount && res.refundedCount > 0) {
                        setDeleteNotice(
                          `Market deleted. Automatically cancelled and refunded ${res.refundedTotal} coins across ${res.refundedCount} active bet slips.`
                        );
                      } else {
                        setDeleteNotice('Prediction market permanently deleted.');
                      }
                      setTimeout(() => setDeleteNotice(null), 5000);
                    } else {
                      setDeleteNotice(res.error || 'Failed to delete prediction');
                      setTimeout(() => setDeleteNotice(null), 5000);
                    }
                    setDeletePred(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase tracking-wider shadow-lg shadow-rose-950/40 transition cursor-pointer"
                >
                  Confirm Delete Market
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
