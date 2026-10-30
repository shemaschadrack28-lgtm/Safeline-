/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safeline — Phase 4: The Financial Intelligence & Advisory Wizard Section
 * 
 * 1. Financial Health Scorecard (0–100) across 5 Pillars
 * 2. "What-If?" Stress Scenario Simulator (Hypothetical Shocks)
 * 3. Debt Freedom Optimizer (Snowball vs Avalanche + Accelerator Slider)
 * 4. Cash Flow Runway Forecaster (30–180 Days forward trajectory)
 * 5. Actionable Guided Playbooks (Recovery, Caution, Growth)
 */

import React, { useMemo, useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Compass, 
  HelpCircle, 
  Sparkles, 
  Sliders, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Layers, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  ArrowRight,
  ShieldAlert,
  Flame,
  Award,
  BookOpen,
  ArrowUpRight,
  Target
} from 'lucide-react';
import { 
  Account, 
  Bill, 
  BudgetCategory, 
  CalculationExplanation, 
  DebtRecord, 
  InflationAdjustedGoal, 
  SafetyState, 
  ScenarioShockInput, 
  Transaction, 
  UserSettings 
} from '../types/finance';
import { 
  calculateCashFlowRunway, 
  calculateDebtPayoffComparison, 
  calculateFinancialHealthScore, 
  generateFinancialPlaybook, 
  simulateScenarioStress 
} from '../services/wizardEngine';
import { calculateSafetyLine, formatMoney } from '../services/financialEngine';

interface WizardSectionProps {
  accounts: Account[];
  categories: BudgetCategory[];
  bills: Bill[];
  debts: DebtRecord[];
  transactions: Transaction[];
  goals: InflationAdjustedGoal[];
  settings: UserSettings;
  onOpenFormula: (explanation: CalculationExplanation) => void;
  onNavigateToTab?: (tab: string) => void;
}

type WizardSubTab = 'diagnostic' | 'stress_test' | 'debt_optimizer' | 'runway_forecast' | 'playbooks';

export const WizardSection: React.FC<WizardSectionProps> = ({
  accounts,
  categories,
  bills,
  debts,
  transactions,
  goals,
  settings,
  onOpenFormula,
}) => {
  const currency = settings.currency;
  const [activeSubTab, setActiveSubTab] = useState<WizardSubTab>('diagnostic');

  // 1. Health Score Calculation
  const healthResult = useMemo(() => {
    return calculateFinancialHealthScore({
      accounts,
      categories,
      bills,
      debts,
      transactions,
      goals,
      settings,
    });
  }, [accounts, categories, bills, debts, transactions, goals, settings]);
  const health = healthResult.value;

  // 2. Safety Line for baseline reference
  const safetyLine = useMemo(() => {
    return calculateSafetyLine({
      accounts,
      categories,
      bills,
      debts,
      transactions,
      settings,
    }).value;
  }, [accounts, categories, bills, debts, transactions, settings]);

  // 3. Scenario Stress Simulation State
  const [emergencyShock, setEmergencyShock] = useState(50000);
  const [incomeShockPct, setIncomeShockPct] = useState(0);
  const [costIncreasePct, setCostIncreasePct] = useState(10);
  const [inflationSurgePct, setInflationSurgePct] = useState(2);

  const scenarioShockInput: ScenarioShockInput = {
    emergencyExpenseMinor: emergencyShock,
    incomeShockPercent: incomeShockPct,
    essentialCostIncreasePercent: costIncreasePct,
    inflationShockPercent: inflationSurgePct,
  };

  const stressResult = useMemo(() => {
    return simulateScenarioStress(
      { accounts, categories, bills, debts, transactions, goals, settings },
      scenarioShockInput
    );
  }, [accounts, categories, bills, debts, transactions, goals, settings, emergencyShock, incomeShockPct, costIncreasePct, inflationSurgePct]);

  // 4. Debt Payoff State
  const [extraDebtMonthly, setExtraDebtMonthly] = useState(15000);
  const debtComparisonResult = useMemo(() => {
    return calculateDebtPayoffComparison(debts, extraDebtMonthly, currency);
  }, [debts, extraDebtMonthly, currency]);
  const debtComp = debtComparisonResult.value;

  // 5. Cash Flow Runway Projection (180 Days)
  const runwayResult = useMemo(() => {
    return calculateCashFlowRunway(
      { accounts, categories, bills, debts, transactions, goals, settings },
      180
    );
  }, [accounts, categories, bills, debts, transactions, goals, settings]);
  const runway = runwayResult.value;

  // 6. Action Playbook (defaults to current Safety State)
  const [selectedPlaybookMode, setSelectedPlaybookMode] = useState<'current' | 'recovery' | 'caution' | 'growth'>('current');
  const activeSafetyState: SafetyState = safetyLine.state;
  const playbook = useMemo(() => {
    const effectiveState = selectedPlaybookMode === 'current' 
      ? activeSafetyState 
      : selectedPlaybookMode === 'recovery' 
      ? 'Recovery' 
      : selectedPlaybookMode === 'caution' 
      ? 'Caution' 
      : 'Safe';
    return generateFinancialPlaybook(health, effectiveState, currency);
  }, [health, activeSafetyState, selectedPlaybookMode, currency]);

  // Track checked actions for user interaction
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});

  const toggleActionDone = (actionId: string) => {
    setCompletedActions((prev) => ({
      ...prev,
      [actionId]: !prev[actionId],
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Wizard Header Hero Banner */}
      <div className="bg-gradient-to-r from-[#0F2747] via-[#0B1328] to-[#0F2747] border border-slate-700/80 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#C6F432]" />
              <h2 className="text-lg font-bold text-white tracking-tight">The Financial Wizard</h2>
              <span className="text-[10px] text-slate-400 font-mono border-l border-slate-700 pl-2">
                Phase 4 Intelligence Engine
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Automated financial diagnostic, hypothetical stress-testing, debt freedom optimization, and guided playbooks based on your verified posted accounts.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto bg-[#0B1328]/80 p-2.5 rounded-xl border border-slate-800">
            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Health Score</span>
              <span className="text-2xl font-black font-mono text-[#C6F432] tabular-nums">
                {health.overallScore}
                <span className="text-xs text-slate-400 font-normal">/100</span>
              </span>
            </div>
            <button
              onClick={() => onOpenFormula(healthResult.explanation)}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Audit health score calculation"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-Tabs / Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 mt-2 border-t border-slate-800/80 text-xs scrollbar-none">
          <button
            onClick={() => setActiveSubTab('diagnostic')}
            className={`px-3 py-1.5 font-semibold rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'diagnostic'
                ? 'bg-[#10B981] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-[#0B1328]/60'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Health Diagnostic</span>
          </button>

          <button
            onClick={() => setActiveSubTab('stress_test')}
            className={`px-3 py-1.5 font-semibold rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'stress_test'
                ? 'bg-[#10B981] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-[#0B1328]/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>What-If? Stress Test</span>
          </button>

          <button
            onClick={() => setActiveSubTab('debt_optimizer')}
            className={`px-3 py-1.5 font-semibold rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'debt_optimizer'
                ? 'bg-[#10B981] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-[#0B1328]/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Debt Freedom Optimizer</span>
          </button>

          <button
            onClick={() => setActiveSubTab('runway_forecast')}
            className={`px-3 py-1.5 font-semibold rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'runway_forecast'
                ? 'bg-[#10B981] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-[#0B1328]/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Cash Flow Runway (180d)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('playbooks')}
            className={`px-3 py-1.5 font-semibold rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'playbooks'
                ? 'bg-[#10B981] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-[#0B1328]/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Action Playbooks</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: HEALTH DIAGNOSTIC & SCORECARD */}
      {activeSubTab === 'diagnostic' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Top Score Summary Card */}
          <div className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-5 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
            <div className="flex items-center gap-4 border-b md:border-b-0 md:border-r border-slate-800 pb-4 md:pb-0 md:pr-4">
              <div className="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-800"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={
                      health.overallScore >= 85
                        ? 'text-[#C6F432]'
                        : health.overallScore >= 65
                        ? 'text-[#10B981]'
                        : health.overallScore >= 45
                        ? 'text-amber-400'
                        : 'text-rose-500'
                    }
                    strokeDasharray={`${health.overallScore}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-xl font-black font-mono text-white block leading-none">
                    {health.overallScore}
                  </span>
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tight">SCORE</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
                  Overall Health Tier
                </span>
                <span className="text-base font-bold text-white block mt-0.5">
                  {health.tierLabel}
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  Evaluated across 5 deterministic pillars
                </span>
              </div>
            </div>

            {/* Strengths & Risks */}
            <div className="space-y-2 border-b md:border-b-0 md:border-r border-slate-800 pb-4 md:pb-0 md:pr-4">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
                Primary Strength
              </span>
              <p className="text-xs text-slate-200 flex items-start gap-1.5 leading-relaxed">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0 mt-0.5" />
                <span>{health.keyStrengths[0]}</span>
              </p>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block pt-1">
                Primary Vulnerability
              </span>
              <p className="text-xs text-slate-200 flex items-start gap-1.5 leading-relaxed">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>{health.keyRisks[0]}</span>
              </p>
            </div>

            {/* Top Priority Action */}
            <div className="space-y-2">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#C6F432] block flex items-center gap-1">
                <Target className="w-3.5 h-3.5" />
                <span>Top Wizard Recommendation</span>
              </span>
              <p className="text-xs text-slate-200 leading-relaxed bg-[#0B1328]/60 p-2.5 rounded-xl border border-slate-800/80">
                {health.prioritizedActions[0] || 'Keep sustaining baseline zero-based allocations.'}
              </p>
              <span className="text-[10px] text-slate-400 block italic">
                Estimates, not financial advice.
              </span>
            </div>
          </div>

          {/* 5 Pillars Detail Cards */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              The 5 Diagnostic Pillars
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.values(health.pillars).map((pillar) => (
                <div
                  key={pillar.name}
                  className="bg-[#0F2747]/60 border border-slate-800 hover:border-slate-700 transition-colors p-4 rounded-xl space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{pillar.name}</span>
                    <span className="font-mono text-xs font-bold text-[#C6F432]">
                      {pillar.score}/{pillar.maxScore} pts ({pillar.percentage}%)
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pillar.status === 'optimal'
                          ? 'bg-[#10B981]'
                          : pillar.status === 'moderate'
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${pillar.percentage}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    <strong className="text-slate-100">{pillar.headline}:</strong> {pillar.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Checklist */}
          <div className="bg-[#0F2747]/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block">
              Prioritized Action Checklist
            </span>
            <div className="space-y-2">
              {health.prioritizedActions.map((action, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleActionDone(`action_${idx}`)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                    completedActions[`action_${idx}`]
                      ? 'bg-[#0B1328]/40 border-[#10B981]/40 text-slate-400 line-through'
                      : 'bg-[#0B1328] border-slate-800/80 hover:border-slate-700 text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                      completedActions[`action_${idx}`]
                        ? 'bg-[#10B981] border-[#10B981] text-white'
                        : 'border-slate-600 bg-slate-900'
                    }`}>
                      {completedActions[`action_${idx}`] && <CheckCircle2 className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-medium">{action}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">Step #{idx + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: "WHAT-IF?" SCENARIO STRESS TESTER */}
      {activeSubTab === 'stress_test' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#C6F432]" />
                  <span>Hypothetical Stress Simulator</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Adjust simulated shocks below to test your financial resilience. Actual account balances remain untouched.
                </p>
              </div>
              <button
                onClick={() => onOpenFormula(stressResult.explanation)}
                className="text-slate-400 hover:text-white transition-colors"
                title="View simulation formulas"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Stress Sliders Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Emergency Shock */}
              <div className="bg-[#0B1328] p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold">1. Emergency Expense Shock</span>
                  <span className="font-mono text-[#C6F432] font-bold">
                    {formatMoney(emergencyShock, currency)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500000"
                  step="10000"
                  value={emergencyShock}
                  onChange={(e) => setEmergencyShock(parseInt(e.target.value, 10))}
                  className="w-full accent-[#10B981] cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block">
                  Simulates sudden medical, car, or home repair costs.
                </span>
              </div>

              {/* Income Shock */}
              <div className="bg-[#0B1328] p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold">2. Monthly Income Drop</span>
                  <span className="font-mono text-amber-400 font-bold">{incomeShockPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={incomeShockPct}
                  onChange={(e) => setIncomeShockPct(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block">
                  Simulates contract reduction or delayed freelance invoices.
                </span>
              </div>

              {/* Essential Cost Surge */}
              <div className="bg-[#0B1328] p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold">3. Essential Cost Surge</span>
                  <span className="font-mono text-[#14B8A6] font-bold">+{costIncreasePct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="5"
                  value={costIncreasePct}
                  onChange={(e) => setCostIncreasePct(parseInt(e.target.value, 10))}
                  className="w-full accent-[#14B8A6] cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block">
                  Simulates rent or basic utility tariff escalations.
                </span>
              </div>

              {/* Inflation Surge */}
              <div className="bg-[#0B1328] p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold">4. Inflation Rate Surge</span>
                  <span className="font-mono text-rose-400 font-bold">+{inflationSurgePct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={inflationSurgePct}
                  onChange={(e) => setInflationSurgePct(parseInt(e.target.value, 10))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block">
                  Simulates rapid market food & transport inflation spikes.
                </span>
              </div>
            </div>

            {/* Simulation Comparison Matrix */}
            <div className="mt-4 p-4 rounded-xl bg-[#0B1328]/90 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-semibold text-slate-400">Post-Shock Verdict:</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    stressResult.value.postShockState === 'Safe'
                      ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                      : stressResult.value.postShockState === 'Caution'
                      ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}>
                    {stressResult.value.postShockState.toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-slate-300 font-mono">
                  {stressResult.value.resilienceVerdict}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2.5 bg-[#0F2747]/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Liquid Funds Lost</span>
                  <span className="text-sm font-bold font-mono text-rose-400">
                    -{formatMoney(stressResult.value.liquidLossMinor, currency)}
                  </span>
                </div>

                <div className="p-2.5 bg-[#0F2747]/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Post-Shock Liquid</span>
                  <span className="text-sm font-bold font-mono text-white">
                    {formatMoney(stressResult.value.postShockLiquidMinor, currency)}
                  </span>
                </div>

                <div className="p-2.5 bg-[#0F2747]/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Safety Floor (F')</span>
                  <span className="text-sm font-bold font-mono text-amber-400">
                    {formatMoney(stressResult.value.postShockSafetyFloorMinor, currency)}
                  </span>
                </div>

                <div className="p-2.5 bg-[#0F2747]/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Runway Days Lost</span>
                  <span className="text-sm font-bold font-mono text-rose-400">
                    -{stressResult.value.runwayLossDays} days ({stressResult.value.postShockRunwayDays} left)
                  </span>
                </div>
              </div>

              {/* Survival Strategies */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs text-slate-300">
                <span className="text-[11px] uppercase font-semibold text-slate-400 block">
                  Stress Mitigation Strategy
                </span>
                {stressResult.value.survivalStrategies.map((strat, i) => (
                  <p key={i} className="flex items-start gap-1.5 leading-relaxed text-slate-300">
                    <span className="text-[#10B981] font-bold">·</span>
                    <span>{strat}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: DEBT FREEDOM OPTIMIZER (SNOWBALL VS AVALANCHE) */}
      {activeSubTab === 'debt_optimizer' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#C6F432]" />
                  <span>Debt Freedom Payoff Optimizer</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Compare mathematical interest minimization (Avalanche) vs psychological momentum (Snowball).
                </p>
              </div>
              <button
                onClick={() => onOpenFormula(debtComparisonResult.explanation)}
                className="text-slate-400 hover:text-white transition-colors"
                title="View debt optimization formulas"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Extra Payment Accelerator Slider */}
            <div className="bg-[#0B1328] p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-[#C6F432]" />
                  <span>Extra Monthly Payment Accelerator</span>
                </span>
                <span className="font-mono text-[#C6F432] font-bold text-sm">
                  +{formatMoney(extraDebtMonthly, currency)}/mo
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100000"
                step="5000"
                value={extraDebtMonthly}
                onChange={(e) => setExtraDebtMonthly(parseInt(e.target.value, 10))}
                className="w-full accent-[#C6F432] cursor-pointer"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Accelerator Impact: Cuts {debtComp.acceleratorImpact.monthsSaved} months</span>
                <span>Saves {formatMoney(debtComp.acceleratorImpact.interestSavedMinor, currency)} interest</span>
              </div>
            </div>

            {/* Side-by-Side Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Avalanche (Mathematically Optimal) */}
              <div className={`p-4 rounded-2xl border transition-colors space-y-3 ${
                debtComp.recommendedStrategy === 'avalanche'
                  ? 'bg-[#0B1328] border-[#10B981]/50 shadow-lg'
                  : 'bg-[#0B1328]/60 border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                    <h4 className="text-sm font-bold text-white">Avalanche (Highest APR First)</h4>
                  </div>
                  {debtComp.recommendedStrategy === 'avalanche' && (
                    <span className="text-[10px] font-bold text-[#10B981] bg-[#10B981]/20 px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Attacks highest interest rates first to mathematically minimize total financing charges.
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Payoff Timeline</span>
                    <span className="text-sm font-bold text-white">{debtComp.avalanche.payoffMonths} months</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Total Interest Paid</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {formatMoney(debtComp.avalanche.totalInterestPaidMinor, currency)}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 font-mono pt-1">
                  Debt-Free Target Date: <strong className="text-white">{debtComp.avalanche.debtFreeDate}</strong>
                </div>
              </div>

              {/* Snowball (Psychological Momentum) */}
              <div className={`p-4 rounded-2xl border transition-colors space-y-3 ${
                debtComp.recommendedStrategy === 'snowball'
                  ? 'bg-[#0B1328] border-[#10B981]/50 shadow-lg'
                  : 'bg-[#0B1328]/60 border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                    <h4 className="text-sm font-bold text-white">Snowball (Lowest Balance First)</h4>
                  </div>
                  {debtComp.recommendedStrategy === 'snowball' && (
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-400/20 px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Attacks smallest balances first for rapid psychological wins and early account closures.
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Payoff Timeline</span>
                    <span className="text-sm font-bold text-white">{debtComp.snowball.payoffMonths} months</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Total Interest Paid</span>
                    <span className="text-sm font-bold text-slate-200">
                      {formatMoney(debtComp.snowball.totalInterestPaidMinor, currency)}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 font-mono pt-1">
                  Debt-Free Target Date: <strong className="text-white">{debtComp.snowball.debtFreeDate}</strong>
                </div>
              </div>
            </div>

            {/* Comparison Highlights Banner */}
            {debtComp.interestSavedWithAvalancheMinor > 0 && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#10B981]/20 to-transparent border border-[#10B981]/40 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <Sparkles className="w-4 h-4 text-[#C6F432]" />
                  <span className="text-slate-200">
                    Avalanche saves <strong className="text-[#C6F432]">{formatMoney(debtComp.interestSavedWithAvalancheMinor, currency)}</strong> more in total interest than Snowball.
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {debtComp.monthsSavedWithAvalanche} mo difference
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: CASH FLOW RUNWAY (180 DAYS) */}
      {activeSubTab === 'runway_forecast' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#10B981]" />
                  <span>180-Day Cash Flow Runway Forecaster</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Forward projection tracking confirmed recurring income, daily essential burn, and scheduled bill spikes.
                </p>
              </div>
              <button
                onClick={() => onOpenFormula(runwayResult.explanation)}
                className="text-slate-400 hover:text-white transition-colors"
                title="View runway formulas"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Runway High-Level Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-[#0B1328] rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Safety Floor Status
                </span>
                <span className={`text-base font-bold font-mono block mt-1 ${
                  runway.daysToFloorBreach === null ? 'text-[#10B981]' : 'text-rose-400'
                }`}>
                  {runway.daysToFloorBreach === null ? 'Protected > 180 Days' : `Breach in ${runway.daysToFloorBreach} Days`}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                  Safety Floor: {formatMoney(runway.safetyFloorMinor, currency)}
                </span>
              </div>

              <div className="p-4 bg-[#0B1328] rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Zero Depletion Point
                </span>
                <span className={`text-base font-bold font-mono block mt-1 ${
                  runway.daysToDepletion === null ? 'text-[#C6F432]' : 'text-rose-400'
                }`}>
                  {runway.daysToDepletion === null ? 'Fully Solvent' : `Zero in ${runway.daysToDepletion} Days`}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                  Starting Liquid: {formatMoney(runway.currentLiquidMinor, currency)}
                </span>
              </div>

              <div className="p-4 bg-[#0B1328] rounded-xl border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Lowest 180-Day Balance
                </span>
                <span className="text-base font-bold font-mono text-white block mt-1">
                  {formatMoney(runway.lowestProjectedBalanceMinor, currency)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                  Occurs on Day {runway.lowestPointDay}
                </span>
              </div>
            </div>

            {/* Weekly Trajectory Preview */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block">
                Forward Weekly Trajectory (Next 12 Weeks)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {runway.weeklySummary.slice(0, 12).map((w) => (
                  <div
                    key={w.weekIndex}
                    className="p-2.5 rounded-xl bg-[#0B1328]/80 border border-slate-800 text-center space-y-1"
                  >
                    <span className="text-[10px] text-slate-400 block uppercase font-mono">
                      Week {w.weekIndex + 1}
                    </span>
                    <span className={`text-xs font-bold font-mono block ${
                      w.projectedBalanceMinor < runway.safetyFloorMinor
                        ? 'text-rose-400'
                        : w.projectedBalanceMinor < runway.safetyTargetMinor
                        ? 'text-amber-400'
                        : 'text-[#10B981]'
                    }`}>
                      {formatMoney(w.projectedBalanceMinor, currency)}
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      {w.startDate.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: GUIDED ACTION PLAYBOOKS */}
      {activeSubTab === 'playbooks' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#10B981]" />
                  <span>The Wizard's Prescriptions: Action Playbooks</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Algorithmic, deterministic action sequences matched to your current Safeline Safety state.
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center gap-1 bg-[#0B1328] p-1 rounded-xl border border-slate-800 text-xs self-start sm:self-auto">
                <button
                  onClick={() => setSelectedPlaybookMode('current')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    selectedPlaybookMode === 'current'
                      ? 'bg-[#10B981] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Live State ({activeSafetyState})
                </button>
                <button
                  onClick={() => setSelectedPlaybookMode('recovery')}
                  className={`px-2 py-1 rounded-lg transition-colors ${
                    selectedPlaybookMode === 'recovery'
                      ? 'bg-rose-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Recovery
                </button>
                <button
                  onClick={() => setSelectedPlaybookMode('caution')}
                  className={`px-2 py-1 rounded-lg transition-colors ${
                    selectedPlaybookMode === 'caution'
                      ? 'bg-amber-400 text-slate-900 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Caution
                </button>
                <button
                  onClick={() => setSelectedPlaybookMode('growth')}
                  className={`px-2 py-1 rounded-lg transition-colors ${
                    selectedPlaybookMode === 'growth'
                      ? 'bg-[#10B981] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Growth
                </button>
              </div>
            </div>

            {/* Playbook Banner */}
            <div className={`p-4 rounded-xl border ${
              playbook.mode === 'recovery'
                ? 'bg-rose-950/30 border-rose-800/60'
                : playbook.mode === 'caution'
                ? 'bg-amber-950/30 border-amber-800/60'
                : 'bg-emerald-950/30 border-emerald-800/60'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  playbook.mode === 'recovery'
                    ? 'bg-rose-500'
                    : playbook.mode === 'caution'
                    ? 'bg-amber-400'
                    : 'bg-[#10B981]'
                }`} />
                <h4 className="text-sm font-bold text-white">{playbook.title}</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{playbook.subtitle}</p>
              <div className="mt-2 text-[11px] text-slate-400 font-mono">
                Objective: <strong className="text-slate-200">{playbook.coreObjective}</strong>
              </div>
            </div>

            {/* Steps List */}
            <div className="space-y-3 pt-1">
              {playbook.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className="p-4 rounded-xl bg-[#0B1328] border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold font-mono">
                        {idx + 1}
                      </span>
                      <h5 className="text-xs font-bold text-white">{step.title}</h5>
                    </div>

                    <div className="flex items-center gap-2">
                      {step.isUrgent && (
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full uppercase">
                          Immediate
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-[#C6F432] font-semibold">
                        ~{formatMoney(step.estimatedImpactMinor, currency)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed pl-7">
                    {step.description}
                  </p>

                  <div className="pl-7 text-[11px] text-slate-400 font-mono">
                    Impact: {step.impactDescription}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center text-[11px] text-slate-400 pt-2 border-t border-slate-800">
              {playbook.warningNotice} · Estimates, not financial advice.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
