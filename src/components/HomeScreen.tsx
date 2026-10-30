/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safeline — Home Screen
 * Concise financial overview, Aurora Shield Safety Line, and active budget warnings.
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  ArrowUpRight, 
  Wallet, 
  Sparkles,
  HelpCircle,
  Clock,
  Shield,
  Layers,
  TrendingUp,
  ShoppingCart
} from 'lucide-react';
import { 
  Account, 
  Bill, 
  BudgetCategory, 
  CalculationExplanation, 
  DebtRecord, 
  Transaction, 
  UserSettings 
} from '../types/finance';
import { 
  calculateBudgetWarnings, 
  calculateEligibleLiquidFunds, 
  calculateSafetyLine, 
  calculateZeroBasedBudget, 
  formatMoney 
} from '../services/financialEngine';
import { calculatePersonalInflation } from '../services/inflationEngine';
import { NavTab } from './Navigation';

interface HomeScreenProps {
  accounts: Account[];
  categories: BudgetCategory[];
  bills: Bill[];
  debts: DebtRecord[];
  transactions: Transaction[];
  settings: UserSettings;
  onNavigate: (tab: NavTab) => void;
  onOpenFormula: (explanation: CalculationExplanation) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  accounts,
  categories,
  bills,
  debts,
  transactions,
  settings,
  onNavigate,
  onOpenFormula,
}) => {
  const currency = settings.currency;

  // 1. Authoritative Safety Line Calculation
  const safetyLineResult = calculateSafetyLine({
    accounts,
    categories,
    bills,
    debts,
    transactions,
    settings,
  });
  const safety = safetyLineResult.value;

  // 2. Authoritative Zero-Based Budget
  const budgetResult = calculateZeroBasedBudget({
    categories,
    transactions,
    accounts,
    settings,
    period: 'monthly',
  });
  const budget = budgetResult.value;

  // 3. Spending Guardrails — Warnings
  const warnings = calculateBudgetWarnings(categories, transactions, 'monthly');

  // 4. Personal Inflation Tracker (Phase 2)
  const personalInfResult = calculatePersonalInflation(categories, transactions);
  const personalInf = personalInfResult.value;

  // Quick State styling
  const stateBadge = {
    Safe: {
      color: 'text-[#10B981] bg-[#10B981]/15 border-[#10B981]/30',
      icon: ShieldCheck,
      label: 'Safe',
    },
    Caution: {
      color: 'text-amber-400 bg-amber-400/15 border-amber-400/30',
      icon: AlertTriangle,
      label: 'Caution',
    },
    Recovery: {
      color: 'text-rose-400 bg-rose-400/15 border-rose-400/30',
      icon: AlertOctagon,
      label: 'Recovery Mode',
    },
  }[safety.state];

  const StateIcon = stateBadge.icon;

  // Percentage of liquid funds vs Safety Target S
  const targetPercent = safety.S > 0 ? Math.min(150, Math.round((safety.L / safety.S) * 100)) : 100;
  const floorPercent = safety.S > 0 ? Math.round((safety.F / safety.S) * 100) : 50;

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Aurora Shield Top Safety Card */}
      <section className="bg-gradient-to-b from-[#0F2747] to-[#0B1328] border border-slate-700/80 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        {/* Ambient background glow */}
        <div 
          className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-[#10B981]/10 blur-3xl pointer-events-none" 
          aria-hidden="true" 
        />

        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Personal Financial Safety Line
              </span>
              <button
                onClick={() => onOpenFormula(safetyLineResult.explanation)}
                className="text-slate-400 hover:text-white transition-colors"
                title="View mathematical formula & inputs"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F0F9FF] font-mono tabular-nums">
                {formatMoney(safety.L, currency)}
              </h1>
              <span className="text-xs text-slate-400">Liquid Funds (L)</span>
            </div>
          </div>

          {/* Safety Status Pill */}
          <div className={`px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1.5 shrink-0 ${stateBadge.color}`}>
            <StateIcon className="w-4 h-4" />
            <span>{stateBadge.label}</span>
          </div>
        </div>

        {/* Visual Safety Line Gauge */}
        <div className="my-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
            <span className="font-mono">Floor F: {formatMoney(safety.F, currency)}</span>
            <span className="font-mono text-[#C6F432]">Target S: {formatMoney(safety.S, currency)}</span>
          </div>
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden relative border border-slate-700/60">
            {/* Safety Floor Marker */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10"
              style={{ left: `${Math.min(100, floorPercent)}%` }}
              title={`Safety Floor F: ${formatMoney(safety.F, currency)}`}
            />
            {/* Current Liquid Fill */}
            <div 
              className={`h-full transition-all duration-500 rounded-full ${
                safety.state === 'Safe'
                  ? 'bg-gradient-to-r from-[#14B8A6] to-[#10B981]'
                  : safety.state === 'Caution'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, (safety.L / (safety.S || 1)) * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
            <span>Essential coverage: {safety.E > 0 ? `${(safety.L / safety.E).toFixed(1)} months` : '—'}</span>
            <span className="font-mono">30-day Low (P): {formatMoney(safety.P, currency)}</span>
          </div>
        </div>

        {/* State Reason Narrative */}
        <div className="p-3 rounded-xl bg-[#0B1328]/70 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {safety.stateReason}
            <span className="block mt-1 text-[11px] text-slate-400">
              Estimates, not financial advice. Floor F is a resilience benchmark, not locked money.
            </span>
          </p>
        </div>

        {/* 4 Key Engine Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800/80">
          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Monthly Needs (E)</span>
            <span className="font-mono text-xs font-semibold text-slate-200">
              {formatMoney(safety.E, currency)}
            </span>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Bills Due (U)</span>
            <span className="font-mono text-xs font-semibold text-slate-200">
              {formatMoney(safety.U, currency)}
            </span>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Reserve (R)</span>
            <span className="font-mono text-xs font-semibold text-slate-200">
              {formatMoney(safety.R, currency)}
            </span>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Safety Target (S)</span>
            <span className="font-mono text-xs font-semibold text-[#10B981]">
              {formatMoney(safety.S, currency)}
            </span>
          </div>
        </div>
      </section>

      {/* Feature 1: Zero-Based Budget Quick Hub */}
      <section className="bg-[#0F2747]/70 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#10B981]" />
            <h2 className="text-base font-bold text-white">Zero-Based Budget</h2>
          </div>
          <button
            onClick={() => onNavigate('insights')}
            className="text-xs font-semibold text-[#14B8A6] hover:text-[#C6F432] transition-colors flex items-center gap-1"
          >
            <span>Manage Allocations</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Unassigned Money Highlight */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          budget.unassignedMoney > 0
            ? 'bg-[#10B981]/10 border-[#10B981]/30'
            : budget.unassignedMoney === 0
            ? 'bg-slate-900/80 border-slate-700'
            : 'bg-rose-950/20 border-rose-800/40'
        }`}>
          <div>
            <span className="text-xs text-slate-400 block">
              {budget.unassignedMoney > 0 ? 'Money Remaining to Assign' : budget.unassignedMoney === 0 ? 'Fully Allocated' : 'Over-Allocated'}
            </span>
            <span className={`text-xl font-extrabold font-mono tabular-nums ${
              budget.unassignedMoney > 0 ? 'text-[#C6F432]' : budget.unassignedMoney === 0 ? 'text-[#10B981]' : 'text-rose-400'
            }`}>
              {formatMoney(budget.unassignedMoney, currency)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Total Allocated</span>
            <span className="font-mono text-xs font-semibold text-slate-200">
              {formatMoney(budget.totalAllocated, currency)} / {formatMoney(budget.availableBudgetMoney, currency)}
            </span>
          </div>
        </div>

        {/* 4 Groups Mini Visualizer */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
          {(['needs', 'goals', 'fun', 'savings'] as const).map((grp) => {
            const data = budget.allocationsByGroup[grp];
            const groupLabels = {
              needs: '1. Needs',
              goals: '2. Goals',
              fun: '3. Fun',
              savings: '4. Savings / Reserve',
            };
            return (
              <div key={grp} className="bg-[#0B1328] p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block font-medium capitalize">
                  {groupLabels[grp]}
                </span>
                <span className="font-mono text-xs font-bold text-slate-100 block mt-0.5">
                  {formatMoney(data.allocated, currency)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Spent: {formatMoney(data.spent, currency)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature 3: Spending Guardrails Warnings (if any) */}
      {warnings.length > 0 && (
        <section className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-4 shadow-lg space-y-2">
          <div className="flex items-center gap-2 text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <h3 className="text-sm font-bold">Spending Guardrail Alerts</h3>
          </div>
          <p className="text-xs text-amber-200/80">
            Supportive warnings triggered by posted transactions:
          </p>
          <div className="space-y-2 pt-1">
            {warnings.map((w) => (
              <div 
                key={w.categoryId}
                className="bg-[#0B1328] p-3 rounded-xl border border-amber-800/50 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-slate-100">{w.categoryName}</span>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Spent {formatMoney(w.spentPosted, currency)} of {formatMoney(w.limit, currency)} limit
                    {w.spentPending > 0 && ` (${formatMoney(w.spentPending, currency)} pending)`}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
                    w.severity === 'EXCEEDED_100' ? 'bg-rose-900/60 text-rose-300' : 'bg-amber-900/60 text-amber-300'
                  }`}>
                    {w.percentageUsed}% Used
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                    {formatMoney(w.remaining, currency)} left
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quick Launchers: Affordability Checker + Irregular Mode status */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Can I afford this? Banner */}
        <div 
          onClick={() => onNavigate('insights')}
          className="bg-gradient-to-r from-[#0F2747] to-[#0B1328] border border-slate-700/70 hover:border-[#10B981]/50 transition-colors p-4 rounded-2xl cursor-pointer shadow-md group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C6F432]" />
              <h3 className="text-sm font-bold text-white group-hover:text-[#10B981] transition-colors">
                "Can I Afford This?"
              </h3>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Test a planned purchase before spending. Simulates budget impact, Safety Line status, and work-hours cost.
          </p>
        </div>

        {/* Irregular Income Mode status */}
        <div 
          onClick={() => onNavigate('insights')}
          className="bg-[#0F2747]/60 border border-slate-800 hover:border-slate-700 transition-colors p-4 rounded-2xl cursor-pointer shadow-md group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#14B8A6]" />
              <h3 className="text-sm font-bold text-white">
                {settings.irregularIncomeMode ? 'Irregular Income Mode (Active)' : 'Standard Income Mode'}
              </h3>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {settings.irregularIncomeMode 
              ? `Buffer Goal: ${formatMoney(settings.irregularBufferGoal, currency)}. Budgeting strictly confirmed received income.`
              : 'Standard recurring income budgeting. Switch to Irregular Mode in Settings if income is unpredictable.'}
          </p>
        </div>

        {/* Value of Money & Inflation Card (Phase 2) */}
        <div 
          onClick={() => onNavigate('insights')}
          className="bg-[#0F2747]/60 border border-slate-800 hover:border-[#C6F432]/50 transition-colors p-4 rounded-2xl cursor-pointer shadow-md group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#C6F432]" />
              <h3 className="text-sm font-bold text-white group-hover:text-[#10B981] transition-colors">
                Value of Money: {personalInf.personalInflationPercent}%
              </h3>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {personalInf.headline}. NISR 5.6% benchmark with 1–10 yr purchasing power projections.
          </p>
        </div>

        {/* Shopping, Procurement & Projects Card (Phase 3) */}
        <div 
          onClick={() => onNavigate('insights')}
          className="bg-[#0F2747]/60 border border-slate-800 hover:border-amber-400/50 transition-colors p-4 rounded-2xl cursor-pointer shadow-md group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                Shopping & Projects Hub
              </h3>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Shop price memory, unit-price compare, shopping trip spending caps, supplier quotes & BoQs.
          </p>
        </div>
      </section>

      {/* Account Balances */}
      <section className="bg-[#0F2747]/50 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
            Liquid Accounts & Reserves
          </span>
          <button
            onClick={() => onNavigate('activity')}
            className="text-xs text-[#14B8A6] hover:text-white transition-colors font-medium"
          >
            View History
          </button>
        </div>
        <div className="space-y-2">
          {accounts.map((acc) => (
            <div key={acc.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B1328]/60 border border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 text-xs font-bold">
                  {acc.institution ? acc.institution[0] : 'A'}
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">{acc.name}</span>
                  <span className="text-[10px] text-slate-400">
                    {acc.institution || 'Direct Account'} · {acc.isLiquid ? 'Eligible Liquid' : 'Non-Liquid'}
                  </span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-slate-100">
                {formatMoney(acc.balance, acc.currency)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Offline Notice */}
      <div className="text-center text-[11px] text-slate-400 pt-2 pb-4">
        Safeline · Stored on device · Offline capable · Estimates, not financial advice.
      </div>
    </div>
  );
};
