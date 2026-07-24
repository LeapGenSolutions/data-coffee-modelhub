'use client';

import React, { useState } from 'react';
import { useAppStore, MODELS } from '../../store/useAppStore';
import { useUsageHistory, useRechargeHistory, useRechargeCreditsMutation } from '../../hooks/useBillingData';
import { HistoryType } from '../../types';

export function UsageDashboard() {
  const user = useAppStore((state) => state.user);
  const requestCount = useAppStore((state) => state.requestCount);
  const rechargeStoreCredits = useAppStore((state) => state.rechargeCredits);

  const [activeTab, setActiveTab] = useState<HistoryType>('usage');

  const { data: usageHistory = [] } = useUsageHistory();
  const { data: rechargeHistory = [] } = useRechargeHistory();
  const rechargeMutation = useRechargeCreditsMutation();

  const initialCredits = 100;
  const creditsConsumed = Math.max(0, initialCredits - user.creditsRemaining);
  const dailyCreditUsage = [1.15, 1.92, 1.48, 2.34, 2.05, 3.12, 2.41];
  const maxDailyUsage = Math.max(...dailyCreditUsage);
  const days = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'];

  const modelTotals: Record<string, number> = {};
  usageHistory.forEach((r) => {
    modelTotals[r.model] = (modelTotals[r.model] || 0) + r.inputTokens + r.outputTokens;
  });
  const grandTotalTokens = Object.values(modelTotals).reduce((a, b) => a + b, 0) || 1;

  const handleRecharge = () => {
    rechargeMutation.mutate(25);
    rechargeStoreCredits(25);
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Model', 'Provider', 'Input Tokens', 'Output Tokens', 'Credits', 'Status'];
    const rows = usageHistory.map((r) => [
      r.date,
      r.model,
      r.provider,
      r.inputTokens,
      r.outputTokens,
      r.credits,
      r.status,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelhub-usage-history.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-0 bg-hub-bg p-6 sm:p-8 animate-fade-in">
      <div className="max-w-[1280px] mx-auto space-y-5">
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] sm:text-[26px] font-bold text-hub-text leading-tight mb-1 tracking-tight">
              Usage & billing
            </h1>
            <p className="text-hub-text-sec text-[12px] sm:text-[13px]">
              Monitor model activity, token consumption, credits, and recharge transactions.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleExportCSV}
              className="border border-hub-border bg-hub-panel hover:bg-hub-hover text-hub-text rounded-[9px] px-3.5 py-2 text-[12px] font-semibold transition-all duration-200 shadow-sm active:scale-95"
            >
              Export CSV
            </button>
            <button
              onClick={handleRecharge}
              className="bg-hub-accent hover:bg-hub-accent-hi text-white rounded-[9px] px-4 py-2 text-[12px] font-semibold transition-all duration-200 shadow-md shadow-hub-accent/20 hover:shadow-hub-accent/30 active:scale-95"
            >
              Recharge credits
            </button>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { label: 'Credits remaining', value: user.creditsRemaining.toFixed(2), sub: 'Estimated 12 days remaining' },
            { label: 'Tokens this month', value: new Intl.NumberFormat('en-US').format(user.tokensUsed), sub: '18.4% higher than last month' },
            { label: 'Credits consumed', value: creditsConsumed.toFixed(2), sub: 'Across all providers' },
            { label: 'API requests', value: String(requestCount), sub: '97.8% successful' },
          ].map((card) => (
            <div key={card.label} className="bg-hub-panel/80 backdrop-blur-sm border border-hub-border/80 hover:border-hub-accent/30 rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              <div className="text-[10px] uppercase tracking-wider text-hub-text-muted font-semibold leading-none">{card.label}</div>
              <div className="text-[26px] font-extrabold text-hub-text mt-2 mb-1 leading-none">{card.value}</div>
              <div className="text-[11px] text-hub-text-sec leading-tight">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Analytics & Model Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
          {/* Credit Consumption 7-Day Chart */}
          <div className="lg:col-span-2 bg-hub-panel/80 backdrop-blur-sm border border-hub-border/80 rounded-xl p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-bold text-[14px] text-hub-text leading-none">Credit consumption</h2>
                <span className="text-[11px] text-hub-text-muted">Last 7 days</span>
              </div>
              <span className="text-[10.5px] text-hub-text-muted font-medium">Daily credits used</span>
            </div>

            <div className="flex items-end gap-2.5 h-[170px] pt-3">
              {dailyCreditUsage.map((val, idx) => {
                const heightPct = Math.max(8, (val / maxDailyUsage) * 100);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group">
                    <div className="w-full h-[145px] flex items-end justify-center border-b border-hub-border/60 pb-1">
                      <div
                        className="w-full max-w-[30px] bg-gradient-to-b from-hub-accent-hi to-hub-accent rounded-t-md relative transition-all duration-300 group-hover:brightness-125 group-hover:shadow-lg group-hover:shadow-hub-accent/20"
                        style={{ height: `${heightPct}%` }}
                      >
                        <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#090A0B] border border-hub-border px-2.5 py-1 rounded-md text-[10.5px] font-semibold text-hub-text whitespace-nowrap shadow-xl z-20">
                          {val.toFixed(2)} credits
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-hub-text-muted font-medium">{days[idx]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Usage By Model Progress Bars */}
          <div className="bg-hub-panel/80 backdrop-blur-sm border border-hub-border/80 rounded-xl p-4 shadow-sm">
            <div className="mb-4">
              <h2 className="font-bold text-[14px] text-hub-text leading-none">Usage by model</h2>
              <span className="text-[11px] text-hub-text-muted">Share of token usage</span>
            </div>

            <div className="space-y-4">
              {Object.entries(modelTotals)
                .sort((a, b) => b[1] - a[1])
                .map(([name, total]) => {
                  const model = MODELS.find((m) => m.name === name) || MODELS[0];
                  const pct = Math.round((total / grandTotalTokens) * 100);

                  return (
                    <div key={name} className="grid grid-cols-[120px_1fr_auto] items-center gap-3 border-b border-hub-border/40 pb-2.5 last:border-none">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: model.color }} />
                        <strong className="text-xs font-semibold text-hub-text truncate">{name}</strong>
                      </div>
                      <div className="h-[6px] bg-hub-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-hub-accent rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-hub-text-sec text-right whitespace-nowrap font-medium">
                        {new Intl.NumberFormat('en-US').format(total)} · {pct}%
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Activity History Table Card */}
        <div className="bg-hub-panel/80 backdrop-blur-sm border border-hub-border/80 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="font-bold text-[14px] text-hub-text leading-none">Activity history</h2>
              <span className="text-[11px] text-hub-text-muted">Usage and recharge transactions</span>
            </div>

            <div className="flex items-center gap-1.5 bg-hub-bg/60 p-1 rounded-full border border-hub-border/60">
              <button
                onClick={() => setActiveTab('usage')}
                className={`px-3.5 py-1 rounded-full text-xs transition-all duration-150 ${
                  activeTab === 'usage'
                    ? 'bg-hub-active text-hub-text font-semibold shadow-sm'
                    : 'text-hub-text-sec hover:text-hub-text'
                }`}
              >
                Usage history
              </button>
              <button
                onClick={() => setActiveTab('recharge')}
                className={`px-3.5 py-1 rounded-full text-xs transition-all duration-150 ${
                  activeTab === 'recharge'
                    ? 'bg-hub-active text-hub-text font-semibold shadow-sm'
                    : 'text-hub-text-sec hover:text-hub-text'
                }`}
              >
                Recharge history
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b border-hub-border/60">
                  {activeTab === 'usage' ? (
                    <>
                      <th className="text-[10px] uppercase tracking-wider text-hub-text-muted font-semibold p-3">Date & time</th>
                      <th className="text-[10px] uppercase tracking-wider text-hub-text-muted font-semibold p-3">Model</th>
                      <th className="text-[10px] uppercase tracking-wider text-hub-text-muted font-semibold p-3">Provider</th>
                      <th className="text-[10px] uppercase tracking-wider text-hub-text-muted font-semibold p-3">Input tokens</th>
                      <th className="text-[10px] uppercase tracking-wider text-hub-text-muted font-semibold p-3">Output tokens</th>
                      <th className="text-[10px] uppercase tracking-wider text-hub-text-muted font-semibold p-3">Credits</th>
                      <th className="text-[10px] uppercase tracking-wider text-hub-text-muted font-semibold p-3">Status</th>
                    </>
                  ) : (
                    <>
                      <th className="text-[10px] uppercase tracking-wider text-hub-text-muted font-semibold p-3">Date</th>
                      <th className="text-[10px] uppercase tracking-wider text-hub-text-muted font-semibold p-3">Transaction ID</th>
                      <th className="text-[10px] uppercase tracking-wider text-hub-text-muted font-semibold p-3">Payment method</th>
                      <th className="text-[10px] uppercase tracking-wider text-hub-text-muted font-semibold p-3">Credits added</th>
                      <th className="text-[10px] uppercase tracking-wider text-hub-text-muted font-semibold p-3">Amount</th>
                      <th className="text-[10px] uppercase tracking-wider text-hub-text-muted font-semibold p-3">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {activeTab === 'usage'
                  ? usageHistory.map((row, i) => (
                      <tr key={i} className="border-b border-hub-border/40 hover:bg-hub-hover/50 transition-colors text-xs text-hub-text-sec">
                        <td className="p-3">{row.date}</td>
                        <td className="p-3 font-semibold text-hub-text">{row.model}</td>
                        <td className="p-3">{row.provider}</td>
                        <td className="p-3">{new Intl.NumberFormat('en-US').format(row.inputTokens)}</td>
                        <td className="p-3">{new Intl.NumberFormat('en-US').format(row.outputTokens)}</td>
                        <td className="p-3">{row.credits.toFixed(2)}</td>
                        <td className="p-3">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-[#9DB0FF] bg-[rgba(110,142,247,0.14)] border border-[rgba(110,142,247,0.25)]">
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  : rechargeHistory.map((row, i) => (
                      <tr key={i} className="border-b border-hub-border/40 hover:bg-hub-hover/50 transition-colors text-xs text-hub-text-sec">
                        <td className="p-3">{row.date}</td>
                        <td className="p-3 font-semibold text-hub-text">{row.id}</td>
                        <td className="p-3">{row.method}</td>
                        <td className="p-3 font-bold text-[#7EE2BC]">+ {row.credits}</td>
                        <td className="p-3">{row.amount}</td>
                        <td className="p-3">
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-[#7EE2BC] bg-[rgba(16,163,127,0.14)] border border-[rgba(16,163,127,0.25)]">
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
