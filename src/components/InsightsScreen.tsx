/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safeline — Insights & Core Money Control Hub (Phase 1)
 * 1. Zero-Based Budgeting
 * 2. Irregular Income Mode & Buffer Goal
 * 3. Spending Guardrails & "Can I afford this?" Simulator
 * 4. Financial Stage Tracker (Emergency, Debt, Investing)
 * 5. Transparent Mathematical Formulas
 */

import React, { useState } from 'react';
import { 
  Layers, 
  Wallet, 
  ShieldAlert, 
  Compass, 
  HelpCircle, 
  Clock, 
  Sparkles, 
  Plus, 
  Edit3, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  ArrowRight,
  Calculator,
  X,
  Lock,
  Hourglass,
  Scale,
  ShoppingCart
} from 'lucide-react';
import { 
  Account, 
  Bill, 
  BudgetCategory, 
  BudgetGroup, 
  BudgetPeriod, 
  CalculationExplanation, 
  CoolingOffItem, 
  DebtRecord, 
  InflationAdjustedGoal, 
  PriceMemoryRecord,
  ProjectBoQ,
  ShoppingList,
  SupplierQuote,
  Transaction, 
  UserSettings 
} from '../types/finance';
import { 
  calculateBudgetWarnings, 
  calculateFinancialStages, 
  calculateSafetyLine, 
  calculateWorkHours, 
  calculateZeroBasedBudget, 
  evaluateAffordability, 
  formatMoney 
} from '../services/financialEngine';
import { InflationSection } from './InflationSection';
import { ProcurementSection } from './ProcurementSection';
import { WizardSection } from './WizardSection';

interface InsightsScreenProps {
  accounts: Account[];
  categories: BudgetCategory[];
  bills: Bill[];
  debts: DebtRecord[];
  transactions: Transaction[];
  coolingOffItems: CoolingOffItem[];
  goals: InflationAdjustedGoal[];
  settings: UserSettings;
  priceMemory: PriceMemoryRecord[];
  shoppingLists: ShoppingList[];
  supplierQuotes: SupplierQuote[];
  projectBoQs: ProjectBoQ[];
  onUpdateCategoryAllocation: (categoryId: string, newAllocation: number) => void;
  onAddCategory: (category: Omit<BudgetCategory, 'id'>) => void;
  onToggleIrregularMode: (enabled: boolean) => void;
  onUpdateBufferGoal: (goalMinor: number) => void;
  onStartCoolingOff: (item: Omit<CoolingOffItem, 'id' | 'initiatedAt' | 'status'>) => void;
  onUpdateCoolingOffStatus: (id: string, status: CoolingOffItem['status']) => void;
  onAddGoal: (goal: InflationAdjustedGoal) => void;
  onUpdateGoal: (goalId: string, updated: Partial<InflationAdjustedGoal>) => void;
  onDeleteGoal: (goalId: string) => void;
  onAddPriceRecord: (record: PriceMemoryRecord) => void;
  onAddShoppingList: (list: ShoppingList) => void;
  onUpdateShoppingList: (listId: string, updated: Partial<ShoppingList>) => void;
  onConvertShoppingListToTransaction: (list: ShoppingList, accountId: string) => void;
  onAddSupplierQuote: (quote: SupplierQuote) => void;
  onAddProjectBoQ: (boq: ProjectBoQ) => void;
  onOpenFormula: (explanation: CalculationExplanation) => void;
}

type InsightTab = 'wizard' | 'zero_budget' | 'affordability' | 'irregular_income' | 'stages' | 'value_of_money' | 'procurement';

export const InsightsScreen: React.FC<InsightsScreenProps> = ({
  accounts,
  categories,
  bills,
  debts,
  transactions,
  coolingOffItems,
  goals,
  settings,
  priceMemory,
  shoppingLists,
  supplierQuotes,
  projectBoQs,
  onUpdateCategoryAllocation,
  onAddCategory,
  onToggleIrregularMode,
  onUpdateBufferGoal,
  onStartCoolingOff,
  onUpdateCoolingOffStatus,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onAddPriceRecord,
  onAddShoppingList,
  onUpdateShoppingList,
  onConvertShoppingListToTransaction,
  onAddSupplierQuote,
  onAddProjectBoQ,
  onOpenFormula,
}) => {
  const currency = settings.currency;
  const [activeTab, setActiveTab] = useState<InsightTab>('zero_budget');
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>('monthly');

  // Edit category modal state
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  const [editAllocAmount, setEditAllocAmount] = useState('');
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatGroup, setNewCatGroup] = useState<BudgetGroup>('needs');
  const [newCatAmount, setNewCatAmount] = useState('');
  const [newCatIsEssential, setNewCatIsEssential] = useState(true);

  // Affordability simulator state
  const [simCost, setSimCost] = useState('25000');
  const [simCategoryId, setSimCategoryId] = useState(categories[0]?.id || '');

  // Irregular Buffer Goal state
  const [bufferGoalInput, setBufferGoalInput] = useState(String(settings.irregularBufferGoal || 200000));
  const [isEditingBufferGoal, setIsEditingBufferGoal] = useState(false);

  // 1. Authoritative Zero-Based Budget Calculation
  const budgetResult = calculateZeroBasedBudget({
    categories,
    transactions,
    accounts,
    settings,
    period: budgetPeriod,
  });
  const budget = budgetResult.value;

  // 2. Spending Warnings
  const warnings = calculateBudgetWarnings(categories, transactions, budgetPeriod);

  // 3. Affordability Evaluation
  const parsedSimCost = parseFloat(simCost.replace(/,/g, '')) || 0;
  const simCostMinor = currency === 'RWF' || currency === 'JPY' ? Math.round(parsedSimCost) : Math.round(parsedSimCost * 100);
  const affordability = evaluateAffordability({
    purchaseCost: simCostMinor,
    categoryId: simCategoryId,
    accounts,
    categories,
    bills,
    debts,
    transactions,
    settings,
  });

  // 4. Financial Stages
  const stages = calculateFinancialStages({
    accounts,
    debts,
    settings,
  });

  // Active Cooling-Off Items
  const activeCoolingOff = coolingOffItems.filter((i) => i.status === 'active');

  const handleSaveAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const rawNum = parseFloat(editAllocAmount.replace(/,/g, ''));
    if (isNaN(rawNum) || rawNum < 0) return;
    const amountMinor = currency === 'RWF' || currency === 'JPY' ? Math.round(rawNum) : Math.round(rawNum * 100);
    onUpdateCategoryAllocation(editingCategory.id, amountMinor);
    setEditingCategory(null);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const rawNum = parseFloat(newCatAmount.replace(/,/g, ''));
    if (isNaN(rawNum) || rawNum < 0) return;
    const amountMinor = currency === 'RWF' || currency === 'JPY' ? Math.round(rawNum) : Math.round(rawNum * 100);

    onAddCategory({
      name: newCatName.trim() || 'New Category',
      group: newCatGroup,
      allocatedAmount: amountMinor,
      period: budgetPeriod,
      isEssential: newCatIsEssential,
    });

    setNewCatName('');
    setNewCatAmount('');
    setShowAddCategoryModal(false);
  };

  const handleSaveBufferGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const rawNum = parseFloat(bufferGoalInput.replace(/,/g, ''));
    if (isNaN(rawNum) || rawNum < 0) return;
    const amountMinor = currency === 'RWF' || currency === 'JPY' ? Math.round(rawNum) : Math.round(rawNum * 100);
    onUpdateBufferGoal(amountMinor);
    setIsEditingBufferGoal(false);
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Money Control & Insights</h1>
          <p className="text-xs text-slate-400">
            Phase 1 authoritative budgeting, irregular income management, and spending guardrails
          </p>
        </div>

        {/* Period Switcher (for budget) */}
        <div className="flex items-center gap-1 bg-[#0F2747] p-1 rounded-xl border border-slate-700/80 self-start sm:self-auto">
          <button
            onClick={() => setBudgetPeriod('monthly')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              budgetPeriod === 'monthly'
                ? 'bg-[#10B981] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBudgetPeriod('weekly')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              budgetPeriod === 'weekly'
                ? 'bg-[#10B981] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Weekly
          </button>
        </div>
      </div>

      {/* Feature Selector Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800 text-xs scrollbar-none">
        <button
          onClick={() => setActiveTab('wizard')}
          className={`px-3.5 py-2 font-semibold rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'wizard'
              ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
              : 'text-slate-400 hover:text-slate-200 bg-[#0B1328]/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#C6F432]" />
          <span>The Wizard (Intelligence)</span>
        </button>

        <button
          onClick={() => setActiveTab('zero_budget')}
          className={`px-3.5 py-2 font-semibold rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'zero_budget'
              ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
              : 'text-slate-400 hover:text-slate-200 bg-[#0B1328]/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Zero-Based Budget</span>
        </button>

        <button
          onClick={() => setActiveTab('affordability')}
          className={`px-3.5 py-2 font-semibold rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'affordability'
              ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
              : 'text-slate-400 hover:text-slate-200 bg-[#0B1328]/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#C6F432]" />
          <span>"Can I Afford This?"</span>
        </button>

        <button
          onClick={() => setActiveTab('irregular_income')}
          className={`px-3.5 py-2 font-semibold rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'irregular_income'
              ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
              : 'text-slate-400 hover:text-slate-200 bg-[#0B1328]/60'
          }`}
        >
          <Wallet className="w-3.5 h-3.5 text-[#14B8A6]" />
          <span>Irregular Income Mode</span>
        </button>

        <button
          onClick={() => setActiveTab('stages')}
          className={`px-3.5 py-2 font-semibold rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'stages'
              ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
              : 'text-slate-400 hover:text-slate-200 bg-[#0B1328]/60'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-blue-400" />
          <span>Financial Stages</span>
        </button>

        <button
          onClick={() => setActiveTab('value_of_money')}
          className={`px-3.5 py-2 font-semibold rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'value_of_money'
              ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
              : 'text-slate-400 hover:text-slate-200 bg-[#0B1328]/60'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-[#C6F432]" />
          <span>Value of Money (Inflation)</span>
        </button>

        <button
          onClick={() => setActiveTab('procurement')}
          className={`px-3.5 py-2 font-semibold rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'procurement'
              ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
              : 'text-slate-400 hover:text-slate-200 bg-[#0B1328]/60'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
          <span>Shopping & Projects</span>
        </button>
      </div>

      {/* TAB: THE WIZARD (PHASE 4) */}
      {activeTab === 'wizard' && (
        <WizardSection
          accounts={accounts}
          categories={categories}
          bills={bills}
          debts={debts}
          transactions={transactions}
          goals={goals}
          settings={settings}
          onOpenFormula={onOpenFormula}
        />
      )}

      {/* TAB 1: ZERO-BASED BUDGETING */}
      {activeTab === 'zero_budget' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Top Unassigned Banner */}
          <div className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                    Zero-Based Assignment Equation
                  </span>
                  <button
                    onClick={() => onOpenFormula(budgetResult.explanation)}
                    className="text-slate-400 hover:text-white transition-colors"
                    title="Audit equation and inputs"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className={`text-3xl font-extrabold font-mono tabular-nums ${
                    budget.unassignedMoney > 0
                      ? 'text-[#C6F432]'
                      : budget.unassignedMoney === 0
                      ? 'text-[#10B981]'
                      : 'text-rose-400'
                  }`}>
                    {formatMoney(budget.unassignedMoney, currency)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {budget.unassignedMoney > 0
                      ? 'Unassigned (Give every franc a job)'
                      : budget.unassignedMoney === 0
                      ? 'Every franc assigned to a purpose'
                      : 'Over-allocated by this amount'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  Unassigned = Available ({formatMoney(budget.availableBudgetMoney, currency)}) − Total Allocated ({formatMoney(budget.totalAllocated, currency)})
                </p>
              </div>

              <button
                onClick={() => setShowAddCategoryModal(true)}
                className="px-3.5 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </div>

            {/* Over-allocation warning banner */}
            {budget.isOverAllocated && (
              <div className="mt-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Allocations exceed available funds. Adjust allocations down to bring unassigned money to zero.
                </span>
              </div>
            )}
          </div>

          {/* 4 Group Allocation Cards */}
          {(['needs', 'goals', 'fun', 'savings'] as const).map((grp) => {
            const groupMetadata = {
              needs: { title: '1. Needs', desc: 'Rent, food, utilities, transport, required debts' },
              goals: { title: '2. Goals', desc: 'Emergency savings, education, future upgrades' },
              fun: { title: '3. Fun', desc: 'Dining out, coffee, entertainment, discretionary' },
              savings: { title: '4. Savings / Reserve', desc: 'SACCO shares, long-term reserves' },
            }[grp];

            const catsInGroup = budget.categoryBreakdown.filter((b) => b.category.group === grp);
            const groupTotal = budget.allocationsByGroup[grp];

            return (
              <div key={grp} className="bg-[#0F2747]/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-white">{groupMetadata.title}</h3>
                    <p className="text-[11px] text-slate-400">{groupMetadata.desc}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-white block">
                      {formatMoney(groupTotal.allocated, currency)}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Spent: {formatMoney(groupTotal.spent, currency)}
                    </span>
                  </div>
                </div>

                {catsInGroup.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-1">No categories assigned to this group yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {catsInGroup.map((item) => {
                      const isWarning80 = item.percentageSpent >= 80 && item.percentageSpent < 100;
                      const isExceeded100 = item.percentageSpent >= 100;

                      return (
                        <div
                          key={item.category.id}
                          className="bg-[#0B1328] p-3 rounded-xl border border-slate-800/80 space-y-2 hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-200">
                                {item.category.name}
                              </span>
                              {item.category.isEssential && (
                                <span className="text-[9px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.2 rounded">
                                  Essential
                                </span>
                              )}
                              {isWarning80 && (
                                <span className="text-[9px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800 px-1.5 py-0.2 rounded">
                                  80% Cap
                                </span>
                              )}
                              {isExceeded100 && (
                                <span className="text-[9px] font-bold text-rose-300 bg-rose-950/60 border border-rose-800 px-1.5 py-0.2 rounded">
                                  100% Used
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="font-mono text-xs font-bold text-slate-200 block">
                                  {formatMoney(item.remaining, currency)} left
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  of {formatMoney(item.allocated, currency)}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setEditingCategory(item.category);
                                  setEditAllocAmount(String(item.category.allocatedAmount));
                                }}
                                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                                title="Adjust allocation"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden relative">
                            {/* 80% mark */}
                            <div className="absolute top-0 bottom-0 w-0.5 bg-amber-500/50 z-10" style={{ left: '80%' }} />
                            <div
                              className={`h-full rounded-full transition-all ${
                                isExceeded100
                                  ? 'bg-rose-500'
                                  : isWarning80
                                  ? 'bg-amber-400'
                                  : 'bg-[#10B981]'
                              }`}
                              style={{ width: `${Math.min(100, item.percentageSpent)}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span>Spent: {formatMoney(item.spent, currency)} ({item.percentageSpent}%)</span>
                            {item.pendingSpent > 0 && (
                              <span className="text-amber-300">Pending: {formatMoney(item.pendingSpent, currency)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: "CAN I AFFORD THIS?" CHECKER */}
      {activeTab === 'affordability' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C6F432]" />
                  <span>"Can I Afford This?" Checker</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Simulate purchase impact on category budget, Safety Line, and work-hours cost
                </p>
              </div>
              <button
                onClick={() => onOpenFormula(affordability.explanation)}
                className="text-slate-400 hover:text-white"
                title="View simulation formulas"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Input Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Planned Purchase Cost ({currency})
                </label>
                <input
                  type="text"
                  value={simCost}
                  onChange={(e) => setSimCost(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0"
                  className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-base font-mono font-bold text-white focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Target Budget Category
                </label>
                <select
                  value={simCategoryId}
                  onChange={(e) => setSimCategoryId(e.target.value)}
                  className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.group.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Result Verdict Card */}
            <div className={`p-4 rounded-xl border space-y-2.5 ${
              affordability.status === 'WITHIN_BUDGET'
                ? 'bg-[#10B981]/15 border-[#10B981]/40'
                : affordability.status === 'AFFORDABLE_REDUCES_MARGIN'
                ? 'bg-amber-950/20 border-amber-800/40'
                : affordability.status === 'OUTSIDE_BUDGET'
                ? 'bg-rose-950/20 border-rose-800/40'
                : affordability.status === 'RISK_CROSSING_SAFETY_FLOOR'
                ? 'bg-rose-950/30 border-rose-800/60'
                : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  affordability.canAfford
                    ? 'bg-[#10B981]/30 text-[#10B981]'
                    : 'bg-rose-900/40 text-rose-300'
                }`}>
                  {affordability.statusLabel}
                </span>

                {/* Work Hours badge */}
                {affordability.workHoursCost !== null && (
                  <span className="text-xs font-mono font-semibold text-[#C6F432] bg-[#0B1328] px-2.5 py-0.5 rounded-lg border border-slate-800">
                    ⏱ {affordability.workHoursCost} hours of work
                  </span>
                )}
              </div>

              <h3 className="text-base font-extrabold text-white">
                {affordability.headline}
              </h3>

              <ul className="text-xs space-y-1 text-slate-300">
                {affordability.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-[#10B981] font-bold">·</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>

              {/* Safety Line Impact Comparison */}
              <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                <div className="bg-[#0B1328]/80 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">Liquid Before</span>
                  <span className="text-slate-200">{formatMoney(affordability.liquidBefore, currency)}</span>
                </div>
                <div className="bg-[#0B1328]/80 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">Liquid After</span>
                  <span className={`font-bold ${affordability.liquidAfter < affordability.safetyFloor ? 'text-rose-400' : 'text-slate-200'}`}>
                    {formatMoney(affordability.liquidAfter, currency)}
                  </span>
                </div>
                <div className="bg-[#0B1328]/80 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">Safety State</span>
                  <span className={affordability.safetyStateAfter === 'Safe' ? 'text-[#10B981]' : affordability.safetyStateAfter === 'Caution' ? 'text-amber-400' : 'text-rose-400'}>
                    {affordability.safetyStateBefore} → {affordability.safetyStateAfter}
                  </span>
                </div>
                <div className="bg-[#0B1328]/80 p-2 rounded-lg">
                  <span className="text-slate-400 block text-[10px]">Category After</span>
                  <span className={affordability.categoryRemainingAfter < 0 ? 'text-rose-400' : 'text-[#10B981]'}>
                    {formatMoney(affordability.categoryRemainingAfter, currency)}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 pt-1">
                {affordability.advisoryNote}
              </p>
            </div>

            {/* Cooling-Off Recommendation (if large purchase) */}
            {settings.coolingOffEnabled && simCostMinor >= settings.coolingOffThreshold && (
              <div className="p-3.5 bg-[#0B1328] border border-cyan-800/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-cyan-300 text-xs font-semibold">
                    <Hourglass className="w-4 h-4" />
                    <span>Large Purchase Cooling-Off Protection</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Threshold: {formatMoney(settings.coolingOffThreshold, currency)}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  This purchase exceeds your large purchase threshold. Consider giving yourself a {settings.coolingOffHours}-hour pause before completing this decision.
                </p>
                <button
                  onClick={() => {
                    onStartCoolingOff({
                      description: `Planned Purchase (${affordability.categoryName})`,
                      categoryId: simCategoryId,
                      amount: simCostMinor,
                      durationHours: settings.coolingOffHours,
                      notes: 'Initiated from Affordability Checker',
                    });
                  }}
                  className="px-3 py-1.5 bg-[#14B8A6] hover:bg-[#0d9488] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Start {settings.coolingOffHours}h Cooling-Off Timer</span>
                </button>
              </div>
            )}
          </div>

          {/* Active Cooling-Off Items */}
          {activeCoolingOff.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block">
                Active Cooling-Off Decisions ({activeCoolingOff.length})
              </span>
              {activeCoolingOff.map((item) => {
                const initiated = new Date(item.initiatedAt).getTime();
                const totalMs = item.durationHours * 60 * 60 * 1000;
                const elapsedMs = Date.now() - initiated;
                const remainingHours = Math.max(0, Math.ceil((totalMs - elapsedMs) / (60 * 60 * 1000)));

                return (
                  <div key={item.id} className="p-3 bg-[#0F2747] border border-slate-700 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-white block">{item.description}</span>
                      <span className="text-slate-400 text-[11px] font-mono">
                        {formatMoney(item.amount, currency)} · {remainingHours > 0 ? `${remainingHours}h remaining in cooling-off` : 'Cooling period completed'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdateCoolingOffStatus(item.id, 'dismissed')}
                        className="px-2 py-1 bg-slate-800 text-slate-400 hover:text-white rounded text-[11px]"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => onUpdateCoolingOffStatus(item.id, 'proceeded')}
                        className="px-2.5 py-1 bg-[#10B981] text-white rounded text-[11px] font-semibold"
                      >
                        Proceed with Purchase
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: IRREGULAR INCOME MODE */}
      {activeTab === 'irregular_income' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Mode Switch Card */}
          <div className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#14B8A6]" />
                <div>
                  <h2 className="text-base font-bold text-white">Irregular Income Mode</h2>
                  <p className="text-xs text-slate-400">
                    Designed for freelancers, business owners, and variable wage earners
                  </p>
                </div>
              </div>
              <button
                onClick={() => onToggleIrregularMode(!settings.irregularIncomeMode)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors ${
                  settings.irregularIncomeMode
                    ? 'bg-[#10B981] text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {settings.irregularIncomeMode ? 'Active (ON)' : 'Disabled (OFF)'}
              </button>
            </div>

            {/* Core Principle Explainer */}
            <div className="p-3.5 bg-[#0B1328] rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
              <div className="font-semibold text-[#C6F432]">Strict Money Availability Rule:</div>
              <p className="leading-relaxed">
                In Irregular Income Mode, Safeline budgets <strong>only income that has actually been received and posted</strong>. Unposted, pending, or expected invoices are strictly excluded from spendable money.
              </p>
            </div>

            {/* Income breakdown: Posted vs Expected */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="bg-[#0B1328] p-3.5 rounded-xl border border-[#10B981]/30">
                <span className="text-xs font-semibold text-[#10B981] block">Received & Cleared Income</span>
                <span className="font-mono text-xl font-bold text-white block mt-1">
                  {formatMoney(
                    transactions
                      .filter((t) => t.type === 'income' && t.status === 'posted' && !t.isExpectedOnly)
                      .reduce((acc, t) => acc + t.amount, 0),
                    currency
                  )}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Eligible for zero-based allocation
                </span>
              </div>

              <div className="bg-[#0B1328] p-3.5 rounded-xl border border-amber-800/40">
                <span className="text-xs font-semibold text-amber-300 block">Expected / Pending Income</span>
                <span className="font-mono text-xl font-bold text-slate-300 block mt-1">
                  {formatMoney(
                    transactions
                      .filter((t) => t.type === 'income' && (t.status === 'pending' || t.isExpectedOnly))
                      .reduce((acc, t) => acc + t.amount, 0),
                    currency
                  )}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Excluded from current spendable budget
                </span>
              </div>
            </div>

            {/* Income Buffer Fund Goal */}
            <div className="p-4 bg-[#0B1328]/80 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Income Buffer Fund Goal</span>
                  <span className="text-[11px] text-slate-400">
                    A financial cushion to smooth out dry periods between gig payments
                  </span>
                </div>
                <button
                  onClick={() => setIsEditingBufferGoal(!isEditingBufferGoal)}
                  className="text-xs text-[#14B8A6] hover:text-white font-medium"
                >
                  {isEditingBufferGoal ? 'Cancel' : 'Edit Target'}
                </button>
              </div>

              {isEditingBufferGoal ? (
                <form onSubmit={handleSaveBufferGoal} className="flex gap-2">
                  <input
                    type="text"
                    value={bufferGoalInput}
                    onChange={(e) => setBufferGoalInput(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    placeholder="Enter target buffer amount"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#10B981] text-white rounded-lg text-xs font-semibold"
                  >
                    Save
                  </button>
                </form>
              ) : (
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="font-mono text-xs text-slate-300">
                      Target: {formatMoney(settings.irregularBufferGoal, currency)}
                    </span>
                    <span className="font-mono text-xs text-[#10B981] font-bold">
                      {settings.irregularBufferGoal > 0 
                        ? `${Math.min(100, Math.round((calculateSafetyLine({ accounts, categories, bills, debts, transactions, settings }).value.L / settings.irregularBufferGoal) * 100))}% Funded` 
                        : '—'}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="h-full bg-gradient-to-r from-[#14B8A6] to-[#10B981] rounded-full transition-all"
                      style={{ 
                        width: `${Math.min(100, (calculateSafetyLine({ accounts, categories, bills, debts, transactions, settings }).value.L / (settings.irregularBufferGoal || 1)) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FINANCIAL STAGE TRACKER */}
      {activeTab === 'stages' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Stage 1: Emergency Fund */}
          <div className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#10B981]/20 text-[#10B981] flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Stage 1 — Emergency Reserve Fund</h3>
                  <p className="text-[11px] text-slate-400">
                    Your foundational shock-absorber against unexpected events
                  </p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                stages.stage1.isComplete 
                  ? 'bg-[#10B981]/20 text-[#10B981]' 
                  : 'bg-slate-800 text-slate-300'
              }`}>
                {stages.stage1.isComplete ? 'Milestone Complete' : 'In Progress'}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs font-mono">
                <span className="text-slate-300">
                  Current Liquid Funds: {formatMoney(stages.stage1.currentBalance, currency)}
                </span>
                <span className="text-[#C6F432] font-bold">
                  Target: {formatMoney(stages.stage1.target, currency)} ({stages.stage1.progressPercentage ?? 0}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-[#14B8A6] to-[#10B981] rounded-full transition-all"
                  style={{ width: `${Math.min(100, stages.stage1.progressPercentage || 0)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 pt-1">
                Connected to Safety Line L without double counting. Remaining: {formatMoney(stages.stage1.remaining, currency)}.
              </p>
            </div>
          </div>

          {/* Stage 2: Debt Organization */}
          <div className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Stage 2 — Debt Organization & Payoff</h3>
                  <p className="text-[11px] text-slate-400">
                    Eliminate high-interest obligations and reclaim monthly cashflow
                  </p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                stages.stage2.isDebtFree 
                  ? 'bg-[#10B981]/20 text-[#10B981]' 
                  : 'bg-amber-950/60 text-amber-300'
              }`}>
                {stages.stage2.isDebtFree ? 'Debt Free' : `${stages.stage2.debtCount} Active Debts`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
              <div className="bg-[#0B1328] p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Principal Balance</span>
                <span className="font-bold text-white">{formatMoney(stages.stage2.totalPrincipal, currency)}</span>
              </div>
              <div className="bg-[#0B1328] p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Accrued Interest</span>
                <span className="font-bold text-amber-300">{formatMoney(stages.stage2.totalAccruedInterest, currency)}</span>
              </div>
              <div className="bg-[#0B1328] p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Accrued Fees</span>
                <span className="font-bold text-slate-300">{formatMoney(stages.stage2.totalFees, currency)}</span>
              </div>
              <div className="bg-[#0B1328] p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Required Monthly</span>
                <span className="font-bold text-rose-300">{formatMoney(stages.stage2.totalRequiredMonthly, currency)}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Strategy: <strong className="capitalize text-slate-200">{settings.debtPayoffStrategy}</strong>. Debts are tracked deterministically without automated payments.
            </p>
          </div>

          {/* Stage 3: Investing Foundations */}
          <div className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Stage 3 — Investing Foundations</h3>
                  <p className="text-[11px] text-slate-400">
                    Long-term wealth building following your emergency and debt milestones
                  </p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                stages.stage3.isUnlocked
                  ? 'bg-[#10B981]/20 text-[#10B981]'
                  : 'bg-slate-800 text-slate-500 flex items-center gap-1'
              }`}>
                {!stages.stage3.isUnlocked && <Lock className="w-3 h-3" />}
                <span>{stages.stage3.isUnlocked ? 'Unlocked' : 'Prioritize Stages 1 & 2'}</span>
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Goal Focus: {stages.stage3.goalDescription}.
            </p>

            <div className="p-3 bg-[#0B1328] rounded-xl border border-slate-800 text-[11px] text-slate-400">
              Estimates, not financial advice. Safeline does not promise investment returns, execute automatic trades, or transfer user funds.
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: VALUE OF MONEY (PHASE 2) */}
      {activeTab === 'value_of_money' && (
        <InflationSection
          accounts={accounts}
          categories={categories}
          transactions={transactions}
          goals={goals}
          settings={settings}
          onAddGoal={onAddGoal}
          onUpdateGoal={onUpdateGoal}
          onDeleteGoal={onDeleteGoal}
          onOpenFormula={onOpenFormula}
        />
      )}

      {/* TAB 6: SHOPPING, PROCUREMENT AND PROJECTS (PHASE 3) */}
      {activeTab === 'procurement' && (
        <ProcurementSection
          accounts={accounts}
          categories={categories}
          settings={settings}
          priceMemory={priceMemory}
          shoppingLists={shoppingLists}
          supplierQuotes={supplierQuotes}
          projectBoQs={projectBoQs}
          onAddPriceRecord={onAddPriceRecord}
          onAddShoppingList={onAddShoppingList}
          onUpdateShoppingList={onUpdateShoppingList}
          onConvertShoppingListToTransaction={onConvertShoppingListToTransaction}
          onAddSupplierQuote={onAddSupplierQuote}
          onAddProjectBoQ={onAddProjectBoQ}
          onOpenFormula={onOpenFormula}
        />
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0F2747] border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
              <h3 className="text-sm font-bold text-white">Adjust Allocation</h3>
              <button onClick={() => setEditingCategory(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveAllocation} className="space-y-3">
              <div>
                <span className="text-xs text-slate-400 block">{editingCategory.name}</span>
                <span className="text-[11px] text-slate-500 block uppercase font-semibold">{editingCategory.group}</span>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Allocated Amount ({currency})
                </label>
                <input
                  type="text"
                  value={editAllocAmount}
                  onChange={(e) => setEditAllocAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#10B981]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0F2747] border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
              <h3 className="text-sm font-bold text-white">Add Budget Category</h3>
              <button onClick={() => setShowAddCategoryModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Category Name</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Health Insurance, Market Food"
                  required
                  className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Budget Group</label>
                <select
                  value={newCatGroup}
                  onChange={(e) => setNewCatGroup(e.target.value as any)}
                  className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981]"
                >
                  <option value="needs">1. Needs</option>
                  <option value="goals">2. Goals</option>
                  <option value="fun">3. Fun</option>
                  <option value="savings">4. Savings / Reserve</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Allocated Amount ({currency})</label>
                <input
                  type="text"
                  value={newCatAmount}
                  onChange={(e) => setNewCatAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0"
                  required
                  className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#0B1328] rounded-xl border border-slate-800">
                <span className="text-xs text-slate-300">Essential Expense</span>
                <input
                  type="checkbox"
                  checked={newCatIsEssential}
                  onChange={(e) => setNewCatIsEssential(e.target.checked)}
                  className="w-4 h-4 rounded text-[#10B981] bg-slate-900 border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
