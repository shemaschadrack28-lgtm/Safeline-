/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safeline — Phase 2: Value of Money & Inflation
 * 1. Personal Inflation Tracker & NISR CPI Benchmark
 * 2. Purchasing-Power Decay Projections
 * 3. Future RWF Value Calculator
 * 4. Inflation-Adjusted Goal Prices
 */

import React, { useState } from 'react';
import { 
  TrendingUp, 
  Scale, 
  Hourglass, 
  Calendar, 
  HelpCircle, 
  Plus, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle,
  X,
  Target,
  ExternalLink
} from 'lucide-react';
import { 
  Account, 
  BudgetCategory, 
  CalculationExplanation, 
  InflationAdjustedGoal, 
  Transaction, 
  UserSettings 
} from '../types/finance';
import { 
  calculateFutureValue, 
  calculateInflationAdjustedGoal, 
  calculatePersonalInflation, 
  calculatePurchasingPowerProjections, 
  OFFICIAL_NISR_BENCHMARK 
} from '../services/inflationEngine';
import { calculateEligibleLiquidFunds, formatMoney } from '../services/financialEngine';

interface InflationSectionProps {
  accounts: Account[];
  categories: BudgetCategory[];
  transactions: Transaction[];
  goals: InflationAdjustedGoal[];
  settings: UserSettings;
  onAddGoal: (goal: InflationAdjustedGoal) => void;
  onUpdateGoal: (goalId: string, updated: Partial<InflationAdjustedGoal>) => void;
  onDeleteGoal: (goalId: string) => void;
  onOpenFormula: (explanation: CalculationExplanation) => void;
}

export const InflationSection: React.FC<InflationSectionProps> = ({
  accounts,
  categories,
  transactions,
  goals,
  settings,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onOpenFormula,
}) => {
  const currency = settings.currency;

  // Liquid funds L
  const liquidFunds = calculateEligibleLiquidFunds(accounts, currency).value;

  // 1. Personal Inflation Calculation
  const personalInfResult = calculatePersonalInflation(categories, transactions, OFFICIAL_NISR_BENCHMARK);
  const personal = personalInfResult.value;

  // 2. Purchasing Power Projections
  const [projectionAmountStr, setProjectionAmountStr] = useState(String(liquidFunds > 0 ? liquidFunds : 100000));
  const parsedProjAmount = parseFloat(projectionAmountStr.replace(/,/g, '')) || 0;
  const projAmountMinor = currency === 'RWF' || currency === 'JPY' ? Math.round(parsedProjAmount) : Math.round(parsedProjAmount * 100);
  const projResult = calculatePurchasingPowerProjections(projAmountMinor, personal.personalInflationPercent, [1, 3, 5, 10]);

  // 3. Future Value Calculator State
  const [fvPresentCostStr, setFvPresentCostStr] = useState('100000');
  const [fvYears, setFvYears] = useState(3);
  const parsedFvCost = parseFloat(fvPresentCostStr.replace(/,/g, '')) || 0;
  const fvCostMinor = currency === 'RWF' || currency === 'JPY' ? Math.round(parsedFvCost) : Math.round(parsedFvCost * 100);
  const fvResult = calculateFutureValue(fvCostMinor, personal.personalInflationPercent, fvYears);

  // 4. Add Goal Modal State
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTargetStr, setNewGoalTargetStr] = useState('500000');
  const [newGoalCurrentStr, setNewGoalCurrentStr] = useState('50000');
  const [newGoalYears, setNewGoalYears] = useState(2);

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const rawTarget = parseFloat(newGoalTargetStr.replace(/,/g, '')) || 0;
    const rawCurrent = parseFloat(newGoalCurrentStr.replace(/,/g, '')) || 0;
    if (rawTarget <= 0) return;

    const targetMinor = currency === 'RWF' || currency === 'JPY' ? Math.round(rawTarget) : Math.round(rawTarget * 100);
    const currentMinor = currency === 'RWF' || currency === 'JPY' ? Math.round(rawCurrent) : Math.round(rawCurrent * 100);

    const targetDate = new Date(Date.now() + newGoalYears * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const calcRes = calculateInflationAdjustedGoal({
      id: `goal_${Date.now()}`,
      name: newGoalName.trim() || 'Savings Goal',
      targetDate,
      nominalTargetMinor: targetMinor,
      currentBalanceMinor: currentMinor,
      annualInflationPercent: personal.personalInflationPercent,
    });

    onAddGoal(calcRes.value);
    setNewGoalName('');
    setShowAddGoalModal(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* SECTION 1: Personal Inflation Tracker & NISR Comparison */}
      <section className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-5 shadow-xl relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Personal Inflation Tracker
              </span>
              <button
                onClick={() => onOpenFormula(personalInfResult.explanation)}
                className="text-slate-400 hover:text-white transition-colors"
                title="View personal inflation formula & weights"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <h2 className="text-3xl font-extrabold text-[#F0F9FF] font-mono tabular-nums">
                {personal.personalInflationPercent}%
              </h2>
              <span className="text-xs text-slate-300">
                Your Weighted Annual Inflation
              </span>
            </div>
          </div>

          {/* Benchmark comparison pill */}
          <div className="bg-[#0B1328] px-3.5 py-1.5 rounded-xl border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 block font-medium">NISR Headline Benchmark</span>
            <span className="font-mono text-xs font-bold text-[#10B981]">
              {OFFICIAL_NISR_BENCHMARK.headlineCpiPercent}% ({OFFICIAL_NISR_BENCHMARK.urbanCpiPercent}% Urban)
            </span>
          </div>
        </div>

        {/* Narrative Analysis */}
        <div className="p-3.5 bg-[#0B1328] rounded-xl border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
          <Scale className="w-4 h-4 text-[#C6F432] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-100">{personal.headline}</p>
            {personal.analysisNotes.map((note, i) => (
              <p key={i} className="text-slate-400 text-[11px] leading-relaxed">{note}</p>
            ))}
          </div>
        </div>

        {/* Category Contribution Breakdown */}
        <div className="space-y-2 pt-1">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block">
            Your Category Spending Weights & Exposure
          </span>
          <div className="space-y-1.5">
            {personal.categoryBreakdown.map((item) => (
              <div 
                key={item.categoryId}
                className="p-2.5 bg-[#0B1328]/70 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <span className="font-semibold text-slate-200 block text-[11px]">{item.categoryName}</span>
                  <span className="text-[10px] text-slate-400">
                    Spent: {formatMoney(item.spendingMinor, currency)} · {item.weightPercent}% of total
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#C6F432] block">
                    {item.categoryInflationRatePercent}% CPI
                  </span>
                  <span className="text-[10px] text-slate-400">
                    +{item.contributionPercent}% impact
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Official Source citation */}
        <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800 flex items-center justify-between">
          <span>Source: {OFFICIAL_NISR_BENCHMARK.source} ({OFFICIAL_NISR_BENCHMARK.periodDate})</span>
          <span>Estimates, not financial advice</span>
        </div>
      </section>

      {/* SECTION 2: Purchasing-Power Projections */}
      <section className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Purchasing-Power Decay Projections
              </span>
              <button
                onClick={() => onOpenFormula(projResult.explanation)}
                className="text-slate-400 hover:text-white"
                title="View decay formula"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              How uninvested cash loses buying power over time at {personal.personalInflationPercent}% annual inflation
            </p>
          </div>

          {/* Amount input */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Simulate:</span>
            <input
              type="text"
              value={projectionAmountStr}
              onChange={(e) => setProjectionAmountStr(e.target.value.replace(/[^0-9.]/g, ''))}
              className="w-32 bg-[#0B1328] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono text-right font-bold focus:outline-none focus:border-[#10B981]"
            />
          </div>
        </div>

        {/* Projection Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {projResult.value.points.map((pt) => (
            <div 
              key={pt.years}
              className="bg-[#0B1328] p-3.5 rounded-xl border border-slate-800 space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white font-mono">
                  {pt.years} {pt.years === 1 ? 'Year' : 'Years'}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                  pt.retentionPercent >= 90 
                    ? 'text-[#10B981] bg-[#10B981]/15' 
                    : pt.retentionPercent >= 75 
                    ? 'text-amber-300 bg-amber-950/60' 
                    : 'text-rose-300 bg-rose-950/60'
                }`}>
                  {pt.retentionPercent}% Power
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block">Real Buying Power</span>
                <span className="font-mono text-sm font-extrabold text-white block">
                  {formatMoney(pt.realPurchasingPower, currency)}
                </span>
              </div>

              <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-rose-400 font-mono">
                Loss: -{formatMoney(pt.purchasingPowerLossMinor, currency)}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-slate-400">
          Formula: Real Value = Nominal ÷ (1 + r)^t. Reflects what today’s {formatMoney(projAmountMinor, currency)} will actually buy in the future.
        </p>
      </section>

      {/* SECTION 3: Future RWF Value Calculator */}
      <section className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C6F432]" />
              <span>Future RWF Value Calculator</span>
            </h3>
            <p className="text-xs text-slate-400">
              Calculate the nominal Rwandan Francs needed in the future to match today's purchase price
            </p>
          </div>
          <button
            onClick={() => onOpenFormula(fvResult.explanation)}
            className="text-slate-400 hover:text-white"
            title="View compound inflation formula"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Present Cost of Item / Service ({currency})
            </label>
            <input
              type="text"
              value={fvPresentCostStr}
              onChange={(e) => setFvPresentCostStr(e.target.value.replace(/[^0-9.]/g, ''))}
              className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-[#10B981]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Time Horizon (Years Ahead)
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 5, 10].map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setFvYears(y)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl font-mono transition-colors ${
                    fvYears === y
                      ? 'bg-[#10B981] text-white shadow-sm'
                      : 'bg-[#0B1328] border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {y}y
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Computed Future Value Card */}
        <div className="bg-[#0B1328] p-4 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Future Price Needed</span>
            <span className="font-mono text-lg font-bold text-[#C6F432] block mt-0.5">
              {formatMoney(fvResult.value.futureCostMinor, currency)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Extra Francs Needed</span>
            <span className="font-mono text-lg font-bold text-amber-300 block mt-0.5">
              +{formatMoney(fvResult.value.additionalCostMinor, currency)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Purchasing Power Multiplier</span>
            <span className="font-mono text-lg font-bold text-slate-200 block mt-0.5">
              ×{(Math.pow(1 + personal.personalInflationPercent / 100, fvYears)).toFixed(3)}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          In {fvYears} {fvYears === 1 ? 'year' : 'years'}, you will need {formatMoney(fvResult.value.futureCostMinor, currency)} to purchase what {formatMoney(fvCostMinor, currency)} buys today at {personal.personalInflationPercent}% annual inflation.
        </p>
      </section>

      {/* SECTION 4: Inflation-Adjusted Goal Prices */}
      <section className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-[#10B981]" />
              <span>Inflation-Adjusted Financial Goals</span>
            </h3>
            <p className="text-xs text-slate-400">
              Future financial targets automatically adjusted for purchasing power preservation
            </p>
          </div>

          <button
            onClick={() => setShowAddGoalModal(true)}
            className="px-3 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Goal</span>
          </button>
        </div>

        <div className="space-y-3">
          {goals.map((g) => {
            const calcRes = calculateInflationAdjustedGoal({
              id: g.id,
              name: g.name,
              targetDate: g.targetDate,
              nominalTargetMinor: g.nominalTargetMinor,
              currentBalanceMinor: g.currentBalanceMinor,
              annualInflationPercent: personal.personalInflationPercent,
            });
            const goalData = calcRes.value;

            return (
              <div 
                key={g.id}
                className="bg-[#0B1328] p-4 rounded-xl border border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">{goalData.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Target: {goalData.targetDate} ({goalData.horizonYears} years horizon)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenFormula(calcRes.explanation)}
                      className="text-slate-400 hover:text-white"
                      title="View goal adjustment formula"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteGoal(g.id)}
                      className="text-slate-500 hover:text-rose-400 text-xs"
                      title="Delete goal"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Target Comparison */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="bg-[#0F2747]/80 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Nominal Target</span>
                    <span className="text-slate-200">{formatMoney(goalData.nominalTargetMinor, currency)}</span>
                  </div>
                  <div className="bg-[#0F2747]/80 p-2 rounded-lg border border-[#10B981]/30">
                    <span className="text-[10px] text-[#10B981] block">Inflation-Adjusted Target</span>
                    <span className="text-white font-bold">{formatMoney(goalData.inflationAdjustedTargetMinor, currency)}</span>
                  </div>
                  <div className="bg-[#0F2747]/80 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Inflation Buffer Needed</span>
                    <span className="text-amber-300 font-semibold">+{formatMoney(goalData.additionalFundingNeededMinor, currency)}</span>
                  </div>
                  <div className="bg-[#0F2747]/80 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Adjusted Monthly Savings</span>
                    <span className="text-[#C6F432] font-bold">{formatMoney(goalData.inflationAdjustedMonthlyNeededMinor, currency)}/mo</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Saved: {formatMoney(goalData.currentBalanceMinor, currency)}</span>
                    <span>{goalData.progressPercent}% of adjusted target</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#14B8A6] to-[#10B981] rounded-full transition-all"
                      style={{ width: `${goalData.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Add Goal Modal */}
      {showAddGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0F2747] border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
              <h3 className="text-sm font-bold text-white">Add Inflation-Protected Goal</h3>
              <button onClick={() => setShowAddGoalModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Goal Name</label>
                <input
                  type="text"
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  placeholder="e.g. SACCO Shares, Land Plot Downpayment"
                  required
                  className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Nominal Target ({currency})</label>
                  <input
                    type="text"
                    value={newGoalTargetStr}
                    onChange={(e) => setNewGoalTargetStr(e.target.value.replace(/[^0-9.]/g, ''))}
                    required
                    className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#10B981]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Already Saved ({currency})</label>
                  <input
                    type="text"
                    value={newGoalCurrentStr}
                    onChange={(e) => setNewGoalCurrentStr(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#10B981]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Horizon (Years)</label>
                <select
                  value={newGoalYears}
                  onChange={(e) => setNewGoalYears(parseInt(e.target.value, 10))}
                  className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981]"
                >
                  <option value={1}>1 Year Horizon</option>
                  <option value={2}>2 Years Horizon</option>
                  <option value={3}>3 Years Horizon</option>
                  <option value={5}>5 Years Horizon</option>
                </select>
              </div>

              <p className="text-[11px] text-slate-400">
                Safeline will automatically compound the target price using your personal inflation rate ({personal.personalInflationPercent}%) to prevent purchasing-power shortfall.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddGoalModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
