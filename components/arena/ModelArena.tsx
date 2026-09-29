'use client';

import React, { useState, useRef } from 'react';
import { MOCK_MODELS } from '../../data/mock';
import { AIModel, ArenaEntry, ArenaVoteType } from '../../types';
import { useUserStore } from '../../store/useUserStore';
import { useArenaStore } from '../../store/useArenaStore';
import { streamChatMessage } from '../../services/api';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import {
  SendIcon,
  ArenaIcon,
  CheckIcon,
  SparkleIcon,
  ZapIcon,
  TrophyIcon,
  MedalIcon,
  FlameIcon,
} from '../icons';
import { useToast } from '../ui/Toast';

const PRESET_BATTLES = [
  'Compare Redis vs Dragonfly for high-throughput distributed caching.',
  'Write a TypeScript rate-limiter using token bucket algorithm with tests.',
  'Analyze the trade-offs between REST, GraphQL, and gRPC for microservices.',
  'Explain how Reciprocal Rank Fusion (RRF) works in Hybrid RAG systems.',
];

export function ModelArena() {
  const { apiKeys, deductUsage } = useUserStore();
  const {
    arenaTab,
    setArenaTab,
    isBlindMode,
    setIsBlindMode,
    isRevealed,
    setIsRevealed,
    ratings,
    matchHistory,
    lastMatchResult,
    recordVote,
  } = useArenaStore();

  const toast = useToast();

  const [modelAId, setModelAId] = useState<string>('claude-sonnet');
  const [modelBId, setModelBId] = useState<string>('gemini-flash');
  const [threeColumns, setThreeColumns] = useState<boolean>(false);
  const [modelCId, setModelCId] = useState<string>('gpt-5');

  const [prompt, setPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [userVoted, setUserVoted] = useState<ArenaVoteType | null>(null);

  const [entries, setEntries] = useState<Record<string, ArenaEntry>>({
    slotA: { id: 'slotA', modelId: 'claude-sonnet', status: 'idle', content: '' },
    slotB: { id: 'slotB', modelId: 'gemini-flash', status: 'idle', content: '' },
    slotC: { id: 'slotC', modelId: 'gpt-5', status: 'idle', content: '' },
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getModel = (id: string): AIModel => MOCK_MODELS.find((m) => m.id === id) || MOCK_MODELS[0];

  const handleRunBattle = async (battlePrompt?: string) => {
    const text = (battlePrompt || prompt).trim();
    if (!text || isRunning) return;

    setIsRunning(true);
    setIsRevealed(false);
    setUserVoted(null);
    deductUsage(text, 2.5);

    // If blind mode, randomize models if user hasn't specified
    let targetModelA = modelAId;
    let targetModelB = modelBId;
    if (isBlindMode && Math.random() > 0.5) {
      targetModelA = modelBId;
      targetModelB = modelAId;
    }

    const targetSlots = (!isBlindMode && threeColumns)
      ? [
          { slot: 'slotA', modelId: targetModelA },
          { slot: 'slotB', modelId: targetModelB },
          { slot: 'slotC', modelId: modelCId },
        ]
      : [
          { slot: 'slotA', modelId: targetModelA },
          { slot: 'slotB', modelId: targetModelB },
        ];

    // Reset slots
    setEntries((prev) => {
      const updated = { ...prev };
      targetSlots.forEach(({ slot, modelId }) => {
        updated[slot] = {
          id: slot,
          modelId,
          status: 'streaming',
          content: '',
        };
      });
      return updated;
    });

    // Execute parallel streaming inference
    const promises = targetSlots.map(async ({ slot, modelId }) => {
      try {
        const res = await streamChatMessage(
          {
            prompt: text,
            model: modelId,
            apiKeys,
          },
          (accumulatedText) => {
            setEntries((prev) => ({
              ...prev,
              [slot]: {
                ...prev[slot],
                content: accumulatedText,
                status: 'streaming',
              },
            }));
          }
        );

        const tokenEstimate = Math.max(10, Math.round(res.content.length / 3.8));
        const estimatedCost = (tokenEstimate / 1000) * 0.002;

        setEntries((prev) => ({
          ...prev,
          [slot]: {
            ...prev[slot],
            status: 'completed',
            content: res.content,
            ttftMs: res.ttftMs,
            totalTimeMs: res.totalTimeMs,
            tokenCount: tokenEstimate,
            cost: estimatedCost,
          },
        }));
      } catch (err: any) {
        setEntries((prev) => ({
          ...prev,
          [slot]: {
            ...prev[slot],
            status: 'error',
            error: err?.message || 'Inference error',
          },
        }));
      }
    });

    await Promise.allSettled(promises);
    setIsRunning(false);
    toast.success('Arena responses ready! Vote to update ELO rankings.');
  };

  const handleVote = (vote: ArenaVoteType) => {
    if (isRunning) return;
    setUserVoted(vote);
    const result = recordVote(prompt, entries.slotA.modelId, entries.slotB.modelId, vote);
    toast.success(`Vote recorded! ELO ratings updated.`);
  };

  const isComplete =
    entries.slotA.status === 'completed' && entries.slotB.status === 'completed' && !isRunning;

  // Sorted leaderboard list
  const leaderboardList = Object.values(ratings).sort((a, b) => b.elo - a.elo);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-hub-bg overflow-hidden animate-fade-in">
      {/* Arena Top Header with Tab Switcher */}
      <header className="shrink-0 flex items-center justify-between px-6 h-14 border-b border-hub-border bg-hub-bg/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-hub-accent/15 border border-hub-accent/30 flex items-center justify-center text-hub-accent">
            <ArenaIcon size={16} />
          </div>
          <div>
            <h1 className="text-hub-base font-bold text-hub-text leading-tight flex items-center gap-2">
              Model Arena
              <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-hub-panel border border-hub-border text-hub-text-muted font-mono font-normal">
                Multi-Model Benchmark & ELO
              </span>
            </h1>
          </div>
        </div>

        {/* Tab & Mode Switchers */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-hub-panel p-0.5 rounded-lg border border-hub-border">
            <button
              onClick={() => setArenaTab('battle')}
              className={`px-3 py-1 rounded-[6px] text-xs font-semibold transition-all ${
                arenaTab === 'battle'
                  ? 'bg-hub-accent text-white shadow-sm'
                  : 'text-hub-text-muted hover:text-hub-text'
              }`}
            >
              ⚔️ Battle
            </button>
            <button
              onClick={() => setArenaTab('leaderboard')}
              className={`px-3 py-1 rounded-[6px] text-xs font-semibold transition-all flex items-center gap-1.5 ${
                arenaTab === 'leaderboard'
                  ? 'bg-hub-accent text-white shadow-sm'
                  : 'text-hub-text-muted hover:text-hub-text'
              }`}
            >
              <TrophyIcon size={12} /> Leaderboard
            </button>
          </div>

          {arenaTab === 'battle' && (
            <button
              onClick={() => {
                setIsBlindMode(!isBlindMode);
                setIsRevealed(false);
              }}
              className={`text-xs px-3 py-1.5 rounded-[8px] border font-medium transition-all ${
                isBlindMode
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-hub-panel text-hub-text-sec border-hub-border hover:text-hub-text'
              }`}
            >
              {isBlindMode ? '🎭 Blind A/B Mode (Active)' : '👁️ Direct Mode'}
            </button>
          )}
        </div>
      </header>

      {/* Main Content: Battle or Leaderboard */}
      {arenaTab === 'leaderboard' ? (
        /* ─── Leaderboard View ─── */
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-hub-text flex items-center gap-2">
                <TrophyIcon size={18} className="text-amber-400" />
                Global Model ELO Leaderboard
              </h2>
              <p className="text-xs text-hub-text-muted">
                Calculated via blind side-by-side matches with standard FIDE ELO formula (K=32).
              </p>
            </div>
            <span className="text-xs font-mono text-hub-text-muted bg-hub-panel px-3 py-1.5 rounded-lg border border-hub-border">
              Total Matches Recorded: {matchHistory.length}
            </span>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-hub-panel rounded-xl border border-hub-border overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-hub-border/60 bg-black/20 text-hub-text-muted font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5 w-14 text-center">Rank</th>
                  <th className="p-3.5">Model</th>
                  <th className="p-3.5">Provider</th>
                  <th className="p-3.5 font-mono text-center">ELO Rating</th>
                  <th className="p-3.5 text-center">Record (W-L-T)</th>
                  <th className="p-3.5 text-center">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hub-border/40 text-hub-text-sec">
                {leaderboardList.map((entry, idx) => {
                  const isTop3 = idx < 3;
                  return (
                    <tr
                      key={entry.modelId}
                      className="hover:bg-hub-hover/40 transition-colors text-xs font-medium"
                    >
                      <td className="p-3.5 text-center font-bold">
                        {idx === 0 ? (
                          <span className="text-amber-400 flex items-center justify-center gap-1 font-mono">
                            🥇 #1
                          </span>
                        ) : idx === 1 ? (
                          <span className="text-zinc-300 flex items-center justify-center gap-1 font-mono">
                            🥈 #2
                          </span>
                        ) : idx === 2 ? (
                          <span className="text-amber-600 flex items-center justify-center gap-1 font-mono">
                            🥉 #3
                          </span>
                        ) : (
                          <span className="text-hub-text-muted font-mono">#{idx + 1}</span>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-hub-text">{entry.name}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-hub-hover border border-hub-border/60 text-hub-text">
                          {entry.provider}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-hub-accent text-sm">
                        {entry.elo}
                      </td>
                      <td className="p-3.5 text-center font-mono text-[11.5px]">
                        <span className="text-emerald-400">{entry.wins}W</span> ·{' '}
                        <span className="text-red-400">{entry.losses}L</span> ·{' '}
                        <span className="text-hub-text-muted">{entry.ties}T</span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-2">
                          <span className="font-mono font-bold text-hub-text w-10 text-right">
                            {entry.winRate.toFixed(1)}%
                          </span>
                          <div className="w-16 h-1.5 bg-black/40 rounded-full overflow-hidden border border-hub-border/40">
                            <div
                              className="h-full bg-hub-accent rounded-full transition-all"
                              style={{ width: `${entry.winRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Recent Match Log */}
          {matchHistory.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-hub-text flex items-center gap-2">
                <FlameIcon size={14} className="text-amber-400" />
                Recent Match Results
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {matchHistory.slice(0, 6).map((match) => (
                  <div
                    key={match.id}
                    className="p-3 rounded-xl bg-hub-panel border border-hub-border text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] text-hub-text-muted">
                      <span className="truncate max-w-[240px] italic">"{match.prompt}"</span>
                      <span className="font-mono">{new Date(match.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-hub-border/40 font-semibold">
                      <span className={match.winner === 'modelA' ? 'text-emerald-400' : 'text-hub-text'}>
                        {match.modelAName} ({match.deltaA >= 0 ? `+${match.deltaA}` : match.deltaA})
                      </span>
                      <span className="text-[10px] text-hub-text-muted">vs</span>
                      <span className={match.winner === 'modelB' ? 'text-emerald-400' : 'text-hub-text'}>
                        {match.modelBName} ({match.deltaB >= 0 ? `+${match.deltaB}` : match.deltaB})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ─── Battle View ─── */
        <>
          {/* Quick Prompts Bar */}
          <div className="shrink-0 flex items-center gap-2 px-6 py-2 bg-hub-panel/40 border-b border-hub-border/50 overflow-x-auto text-xs">
            <span className="text-hub-text-muted font-medium shrink-0 flex items-center gap-1">
              <SparkleIcon size={13} /> Quick Prompts:
            </span>
            {PRESET_BATTLES.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPrompt(preset);
                  handleRunBattle(preset);
                }}
                disabled={isRunning}
                className="shrink-0 bg-hub-panel hover:bg-hub-hover text-hub-text-sec hover:text-hub-text border border-hub-border px-2.5 py-1 rounded-full transition-colors truncate max-w-xs disabled:opacity-50"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Voting Action Banner in Blind Mode */}
          {isBlindMode && isComplete && !isRevealed && (
            <div className="shrink-0 px-6 py-3 bg-amber-500/10 border-b border-amber-500/25 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚖️</span>
                <div>
                  <strong className="block text-xs font-bold text-amber-300">
                    Blind Evaluation: Vote for the superior response!
                  </strong>
                  <span className="text-[11px] text-hub-text-muted">
                    Model names will be revealed upon voting and update live ELO rankings.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleVote('modelA')}
                  className="px-3 py-1.5 rounded-lg bg-hub-panel hover:bg-hub-hover border border-hub-border text-xs font-bold text-hub-text transition-all hover:border-hub-accent"
                >
                  👈 Model Alpha is Better
                </button>
                <button
                  onClick={() => handleVote('modelB')}
                  className="px-3 py-1.5 rounded-lg bg-hub-panel hover:bg-hub-hover border border-hub-border text-xs font-bold text-hub-text transition-all hover:border-hub-accent"
                >
                  👉 Model Beta is Better
                </button>
                <button
                  onClick={() => handleVote('tie')}
                  className="px-3 py-1.5 rounded-lg bg-hub-panel hover:bg-hub-hover border border-hub-border text-xs font-medium text-hub-text-muted transition-all"
                >
                  🤝 Tie
                </button>
                <button
                  onClick={() => handleVote('both_bad')}
                  className="px-3 py-1.5 rounded-lg bg-hub-panel hover:bg-hub-hover border border-hub-border text-xs font-medium text-hub-text-muted transition-all"
                >
                  👎 Both Bad
                </button>
              </div>
            </div>
          )}

          {/* Revealed Banner */}
          {isBlindMode && isRevealed && lastMatchResult && (
            <div className="shrink-0 px-6 py-3 bg-emerald-500/10 border-b border-emerald-500/25 flex items-center justify-between animate-fade-in text-xs">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎉</span>
                <div>
                  <strong className="text-emerald-400 font-bold">
                    Models Revealed! Match logged to ELO Leaderboard.
                  </strong>
                  <span className="text-hub-text-muted ml-2">
                    Alpha: <span className="font-bold text-hub-text">{lastMatchResult.modelAName}</span> ({lastMatchResult.deltaA >= 0 ? `+${lastMatchResult.deltaA}` : lastMatchResult.deltaA} ELO) | Beta: <span className="font-bold text-hub-text">{lastMatchResult.modelBName}</span> ({lastMatchResult.deltaB >= 0 ? `+${lastMatchResult.deltaB}` : lastMatchResult.deltaB} ELO)
                  </span>
                </div>
              </div>

              <button
                onClick={() => setArenaTab('leaderboard')}
                className="text-hub-accent hover:underline font-semibold text-xs flex items-center gap-1"
              >
                View Leaderboard →
              </button>
            </div>
          )}

          {/* Split Comparison Columns */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-hub-border overflow-y-auto min-h-0">
            {/* Model A */}
            <ArenaColumn
              slot="slotA"
              title={isBlindMode && !isRevealed ? 'Model Alpha (Blind)' : 'Candidate 1'}
              selectedModelId={entries.slotA.modelId}
              onSelectModel={setModelAId}
              entry={entries.slotA}
              isBlind={isBlindMode && !isRevealed}
              isWinner={userVoted === 'modelA'}
              onVote={() => handleVote('modelA')}
            />

            {/* Model B */}
            <ArenaColumn
              slot="slotB"
              title={isBlindMode && !isRevealed ? 'Model Beta (Blind)' : 'Candidate 2'}
              selectedModelId={entries.slotB.modelId}
              onSelectModel={setModelBId}
              entry={entries.slotB}
              isBlind={isBlindMode && !isRevealed}
              isWinner={userVoted === 'modelB'}
              onVote={() => handleVote('modelB')}
            />

            {/* Model C (Optional 3-way battle in Direct Mode) */}
            {!isBlindMode && threeColumns && (
              <ArenaColumn
                slot="slotC"
                title="Candidate 3"
                selectedModelId={modelCId}
                onSelectModel={setModelCId}
                entry={entries.slotC}
                isBlind={false}
                isWinner={false}
                onVote={() => {}}
              />
            )}
          </div>

          {/* Synchronized Composer */}
          <div className="shrink-0 p-4 border-t border-hub-border bg-hub-panel/80 backdrop-blur-md">
            <div className="max-w-4xl mx-auto flex items-end gap-2 bg-hub-bg border border-hub-border focus-within:border-hub-accent rounded-xl p-3 shadow-lg transition-colors">
              <textarea
                ref={textareaRef}
                rows={1}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleRunBattle();
                  }
                }}
                placeholder="Enter a prompt to run simultaneously across arena models… (Enter to run)"
                className="flex-1 bg-transparent text-hub-sm text-hub-text placeholder:text-hub-text-muted outline-none resize-none max-h-32"
              />
              <button
                onClick={() => handleRunBattle()}
                disabled={!prompt.trim() || isRunning}
                className="h-8 px-4 rounded-lg bg-hub-accent hover:bg-hub-accent-hi text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 transition-all shadow-md active:scale-95 shrink-0"
              >
                {isRunning ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Battling…
                  </>
                ) : (
                  <>
                    <ZapIcon size={13} />
                    Run Battle
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ArenaColumn({
  slot,
  title,
  selectedModelId,
  onSelectModel,
  entry,
  isBlind,
  isWinner,
  onVote,
}: {
  slot: string;
  title: string;
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  entry: ArenaEntry;
  isBlind: boolean;
  isWinner: boolean;
  onVote: () => void;
}) {
  const model = MOCK_MODELS.find((m) => m.id === selectedModelId) || MOCK_MODELS[0];

  return (
    <div
      className={`flex flex-col h-full min-h-0 bg-hub-bg transition-colors ${
        isWinner ? 'bg-hub-accent/5 ring-1 ring-hub-accent/40' : ''
      }`}
    >
      {/* Column Header */}
      <div className="shrink-0 p-3.5 border-b border-hub-border/70 bg-hub-panel/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: isBlind ? '#A8ADB0' : model.color }}
          />

          {isBlind ? (
            <span className="text-xs font-bold text-hub-text font-mono uppercase tracking-wider">
              {title}
            </span>
          ) : (
            <select
              value={selectedModelId}
              onChange={(e) => onSelectModel(e.target.value)}
              className="bg-transparent text-xs font-bold text-hub-text outline-none cursor-pointer hover:text-hub-accent transition-colors"
            >
              {MOCK_MODELS.map((m) => (
                <option key={m.id} value={m.id} className="bg-hub-panel text-hub-text">
                  {m.name} ({m.provider})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          {entry.status === 'streaming' && (
            <span className="text-[10px] text-hub-accent font-semibold flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-hub-accent" /> Streaming
            </span>
          )}
          {entry.status === 'completed' && !isBlind && (
            <button
              onClick={onVote}
              className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border transition-all ${
                isWinner
                  ? 'bg-hub-accent text-white border-hub-accent shadow-sm'
                  : 'border-hub-border text-hub-text-muted hover:border-hub-accent hover:text-hub-text'
              }`}
            >
              {isWinner ? '🏆 Preferred' : 'Vote as Winner'}
            </button>
          )}
        </div>
      </div>

      {/* Latency & Cost Metrics Bar */}
      {entry.status === 'completed' && (
        <div className="shrink-0 px-3.5 py-1.5 bg-hub-bg/90 border-b border-hub-border/40 flex items-center justify-between text-[11px] font-mono text-hub-text-muted">
          <span>
            TTFT: <strong className="text-hub-text">{entry.ttftMs}ms</strong>
          </span>
          <span>
            Total: <strong className="text-hub-text">{((entry.totalTimeMs || 0) / 1000).toFixed(2)}s</strong>
          </span>
          <span>
            Tokens: <strong className="text-hub-text">{entry.tokenCount}</strong>
          </span>
        </div>
      )}

      {/* Output Content */}
      <div className="flex-1 p-4 overflow-y-auto min-h-0 text-hub-sm">
        {entry.status === 'idle' ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-hub-text-muted">
            <span className="text-2xl mb-2 opacity-50">⚖️</span>
            <p className="text-xs">Ready for battle prompt</p>
          </div>
        ) : entry.status === 'error' ? (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {entry.error}
          </div>
        ) : (
          <MarkdownRenderer content={entry.content} />
        )}
      </div>
    </div>
  );
}
