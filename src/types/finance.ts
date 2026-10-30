/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safeline — Personal Finance & Financial Intelligence
 * Domain Entities & Calculation Types
 */

export type CurrencyCode = 'RWF' | 'USD' | 'EUR' | 'GBP' | 'KES' | 'UGX' | 'TZS' | 'JPY';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  decimals: number; // RWF and JPY = 0; USD, EUR, KES = 2
  name: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  RWF: { code: 'RWF', symbol: 'FRw', decimals: 0, name: 'Rwandan Franc' },
  USD: { code: 'USD', symbol: '$', decimals: 2, name: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '€', decimals: 2, name: 'Euro' },
  GBP: { code: 'GBP', symbol: '£', decimals: 2, name: 'British Pound' },
  KES: { code: 'KES', symbol: 'KSh', decimals: 2, name: 'Kenyan Shilling' },
  UGX: { code: 'UGX', symbol: 'USh', decimals: 0, name: 'Ugandan Shilling' },
  TZS: { code: 'TZS', symbol: 'TSh', decimals: 0, name: 'Tanzanian Shilling' },
  JPY: { code: 'JPY', symbol: '¥', decimals: 0, name: 'Japanese Yen' },
};

export type BudgetGroup = 'needs' | 'goals' | 'fun' | 'savings';

export type BudgetPeriod = 'monthly' | 'weekly';

export interface BudgetCategory {
  id: string;
  name: string;
  group: BudgetGroup;
  allocatedAmount: number; // stored in integer minor units
  period: BudgetPeriod;
  isEssential: boolean;
  notes?: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'posted' | 'pending' | 'reversed';

export interface Transaction {
  id: string;
  accountId: string;
  date: string; // ISO 8601 YYYY-MM-DD
  amount: number; // positive integer minor units
  type: TransactionType;
  status: TransactionStatus;
  categoryId: string;
  description: string;
  toAccountId?: string; // used when type === 'transfer'
  isFee?: boolean;
  isRefund?: boolean;
  isIrregular?: boolean; // flags irregular/variable income
  isExpectedOnly?: boolean; // drafts/expected income not yet received
  createdAt: string;
}

export type AccountType = 'mobile_money' | 'bank_checking' | 'bank_savings' | 'cash' | 'debt' | 'investment';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number; // integer minor units
  currency: CurrencyCode;
  isLiquid: boolean; // whether eligible for Safeline L (liquid reserve)
  institution?: string;
  updatedAt: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number; // integer minor units
  dueDate: string; // ISO string or YYYY-MM-DD
  isEssential: boolean; // essential obligations feed Safety Floor F
  isPaid: boolean;
  categoryId: string;
  frequency: 'monthly' | 'weekly' | 'one-time' | 'quarterly';
  notes?: string;
}

export interface DebtRecord {
  id: string;
  name: string;
  lender: string;
  principalRemaining: number; // integer minor units
  accruedInterest: number; // integer minor units
  fees: number; // integer minor units
  annualInterestRatePercent: number; // e.g. 18.5
  minimumMonthlyPayment: number; // integer minor units
  dueDateDay: number; // day of month 1-31
  isEssential: boolean; // required minimum debt payments feed Essential Expenses E
}

export interface CoolingOffItem {
  id: string;
  description: string;
  categoryId: string;
  amount: number; // integer minor units
  initiatedAt: string; // ISO timestamp
  durationHours: number; // default 24h, 48h, etc.
  status: 'active' | 'waited' | 'dismissed' | 'proceeded';
  notes?: string;
}

export type RepaymentStrategy = 'snowball' | 'avalanche' | 'custom';

export interface UserSettings {
  currency: CurrencyCode;
  theme: 'dark' | 'light';
  // Financial Safety Line Model
  safetyMultiplier: number; // M: months of essential expenses target (default 3)
  additionalReserve: number; // R: additional safety reserve in integer minor units
  nextReliableIncomeDate: string | null; // ISO YYYY-MM-DD
  // Irregular Income Mode
  irregularIncomeMode: boolean;
  irregularBufferGoal: number; // integer minor units target
  // Spending Guardrails
  coolingOffEnabled: boolean;
  coolingOffThreshold: number; // integer minor units (e.g. 50,000 RWF)
  coolingOffHours: number; // e.g. 24 or 48 hours
  // Cost in Work Hours
  netHourlyEarnings: number | null; // integer minor units per hour (null if unconfigured)
  workingHoursBasisNotes?: string;
  // Financial Stages
  emergencyFundTarget: number; // integer minor units
  debtPayoffStrategy: RepaymentStrategy;
  investingMilestoneReached: boolean;
  investingGoalDescription: string;
}

/**
 * Standard Result wrapper for all financial calculations
 * Every figure is accompanied by its full audit explanation
 */
export interface CalculationExplanation {
  metricName: string;
  formulaVersion: string;
  formula: string;
  inputs: Record<string, string | number | boolean | null>;
  currency: CurrencyCode;
  period?: string;
  sourceRecordCounts?: Record<string, number>;
  computationDate: string;
  missingDataNotes?: string[];
  caveats?: string[];
}

export interface CalculationResult<T> {
  value: T;
  explanation: CalculationExplanation;
}

export type SafetyState = 'Safe' | 'Caution' | 'Recovery';

export interface SafetyLineResult {
  L: number; // Eligible liquid funds
  E: number; // Monthly essential expenses (including minimum debt payments)
  U: number; // Essential bills due before next reliable income (not in E)
  R: number; // Additional reserve
  F: number; // Safety Floor = E + U
  S: number; // Safety Target = E * M + U + R
  P: number; // Lowest projected balance over 30 days
  state: SafetyState;
  stateReason: string;
}

export interface ZeroBasedBudgetResult {
  availableBudgetMoney: number;
  totalAllocated: number;
  unassignedMoney: number;
  isOverAllocated: boolean;
  allocationsByGroup: Record<BudgetGroup, {
    allocated: number;
    spent: number;
    remaining: number;
  }>;
  categoryBreakdown: Array<{
    category: BudgetCategory;
    allocated: number;
    spent: number;
    pendingSpent: number;
    remaining: number;
    percentageSpent: number;
  }>;
}

export interface BudgetWarning {
  categoryId: string;
  categoryName: string;
  budgetGroup: BudgetGroup;
  limit: number;
  spentPosted: number;
  spentPending: number;
  totalSpent: number;
  remaining: number;
  percentageUsed: number;
  severity: 'WARNING_80' | 'EXCEEDED_100';
  message: string;
}

export type AffordabilityStatus = 
  | 'WITHIN_BUDGET'
  | 'AFFORDABLE_REDUCES_MARGIN'
  | 'OUTSIDE_BUDGET'
  | 'RISK_CROSSING_SAFETY_FLOOR'
  | 'INSUFFICIENT_INFORMATION';

export interface AffordabilityEvaluation {
  status: AffordabilityStatus;
  statusLabel: string;
  headline: string;
  canAfford: boolean;
  cost: number;
  categoryId: string;
  categoryName: string;
  categoryRemainingBefore: number;
  categoryRemainingAfter: number;
  liquidBefore: number;
  liquidAfter: number;
  safetyFloor: number;
  safetyTarget: number;
  safetyStateBefore: SafetyState;
  safetyStateAfter: SafetyState;
  workHoursCost: number | null;
  reasons: string[];
  advisoryNote: string;
  explanation: CalculationExplanation;
}

export interface FinancialStageSummary {
  stage1: {
    name: string;
    target: number;
    currentBalance: number;
    remaining: number;
    progressPercentage: number | null;
    isComplete: boolean;
    hasTarget: boolean;
  };
  stage2: {
    name: string;
    totalPrincipal: number;
    totalAccruedInterest: number;
    totalFees: number;
    totalRequiredMonthly: number;
    debtCount: number;
    strategy: RepaymentStrategy;
    isDebtFree: boolean;
  };
  stage3: {
    name: string;
    isUnlocked: boolean; // follows Stage 1 & 2 progress
    milestoneAchieved: boolean;
    goalDescription: string;
  };
}

// ==========================================
// PHASE 2 — VALUE OF MONEY TYPES
// ==========================================

export interface NISRInflationBenchmark {
  periodDate: string; // e.g. "September 2026"
  source: string; // "National Institute of Statistics of Rwanda (NISR)"
  headlineCpiPercent: number; // e.g. 5.6
  urbanCpiPercent: number; // e.g. 5.8
  ruralCpiPercent: number; // e.g. 5.3
  categoryRatesPercent: Record<string, number>;
  notes: string;
}

export interface PersonalInflationResult {
  personalInflationPercent: number;
  nisrBenchmarkPercent: number;
  differencePercent: number; // positive = personal inflation higher than benchmark
  totalSpendingMinor: number;
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    spendingMinor: number;
    weightPercent: number;
    categoryInflationRatePercent: number;
    contributionPercent: number;
  }>;
  headline: string;
  analysisNotes: string[];
}

export interface PurchasingPowerPoint {
  years: number;
  nominalValue: number;
  realPurchasingPower: number;
  purchasingPowerLossMinor: number;
  retentionPercent: number;
}

export interface PurchasingPowerProjection {
  initialAmountMinor: number;
  inflationRatePercent: number;
  points: PurchasingPowerPoint[];
}

export interface FutureValueResult {
  presentCostMinor: number;
  inflationRatePercent: number;
  years: number;
  futureCostMinor: number;
  additionalCostMinor: number;
  purchasingPowerFactor: number; // 1 / (1 + r)^t
}

export interface InflationAdjustedGoal {
  id: string;
  name: string;
  targetDate: string; // ISO date
  horizonYears: number;
  nominalTargetMinor: number;
  annualInflationPercent: number;
  inflationAdjustedTargetMinor: number;
  additionalFundingNeededMinor: number;
  currentBalanceMinor: number;
  nominalMonthlyNeededMinor: number;
  inflationAdjustedMonthlyNeededMinor: number;
  progressPercent: number;
}

// ========================================================
// PHASE 3 — SHOPPING, PROCUREMENT AND PROJECTS TYPES
// ========================================================

export type StandardUnit = 'kg' | 'g' | 'liter' | 'ml' | 'piece' | 'bag' | 'box' | 'meter';

export interface PriceMemoryRecord {
  id: string;
  itemName: string;
  shopName: string;
  categoryId: string;
  priceMinor: number;
  quantity: number;
  unit: StandardUnit;
  unitPriceMinor: number; // normalized price per base unit (e.g. per kg or per liter)
  recordedDate: string; // ISO date YYYY-MM-DD
  notes?: string;
}

export interface UnitPriceComparisonCandidate {
  id: string;
  label: string;
  vendor: string;
  packagePriceMinor: number;
  quantity: number;
  unit: StandardUnit;
}

export interface UnitPriceComparisonResult {
  candidateId: string;
  label: string;
  vendor: string;
  packagePriceMinor: number;
  normalizedQuantityBase: number; // e.g. 0.5 for 500g in kg
  baseUnit: string; // e.g. 'kg' or 'liter' or 'piece'
  pricePerBaseUnitMinor: number;
  isBestValue: boolean;
  savingsVsHighestPercent: number;
  savingsVsHighestMinor: number;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: StandardUnit;
  estimatedPriceMinor: number;
  actualPriceMinor?: number;
  isChecked: boolean;
  preferredShop?: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  targetStore?: string;
  spendingCapMinor: number;
  categoryId: string;
  items: ShoppingListItem[];
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  completedAt?: string;
}

export interface SupplierQuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPriceMinor: number;
  totalPriceMinor: number;
}

export interface SupplierQuote {
  id: string;
  projectId: string;
  supplierName: string;
  deliveryDays: number;
  deliveryFeeMinor: number;
  itemsTotalMinor: number;
  totalQuoteMinor: number;
  warrantyPeriod?: string;
  notes?: string;
  isRecommended?: boolean;
}

export type BoQSection = 'material' | 'labor' | 'equipment' | 'transport' | 'contingency';

export interface BoQLineItem {
  id: string;
  section: BoQSection;
  description: string;
  quantity: number;
  unit: string;
  unitRateMinor: number;
  totalCostMinor: number;
  notes?: string;
}

export interface ProjectBoQ {
  id: string;
  name: string;
  description: string;
  category: 'construction' | 'agriculture' | 'renovation' | 'equipment' | 'other';
  startDate: string;
  durationMonths: number;
  contingencyPercent: number; // e.g. 10%
  inflationAnnualPercent: number; // e.g. 5.6%
  items: BoQLineItem[];
  subtotalMinor: number;
  contingencyMinor: number;
  nominalTotalMinor: number;
  inflationAdjustedTotalMinor: number;
  inflationBufferMinor: number;
}

// ========================================================
// PHASE 4 — THE WIZARD (FINANCIAL INTELLIGENCE ENGINE)
// ========================================================

export interface HealthPillarScore {
  name: string;
  score: number; // out of maxScore
  maxScore: number;
  percentage: number;
  status: 'optimal' | 'moderate' | 'needs_attention';
  headline: string;
  recommendation: string;
}

export interface FinancialHealthScore {
  overallScore: number; // 0 to 100
  tier: 'fortified' | 'resilient' | 'caution' | 'critical';
  tierLabel: string;
  pillars: {
    liquidity: HealthPillarScore;
    debt: HealthPillarScore;
    savings: HealthPillarScore;
    inflationResilience: HealthPillarScore;
    budgetDiscipline: HealthPillarScore;
  };
  keyStrengths: string[];
  keyRisks: string[];
  prioritizedActions: string[];
  calculatedAt: string;
}

export interface ScenarioShockInput {
  incomeShockPercent: number; // 0 to 100% reduction in primary income
  emergencyExpenseMinor: number; // one-off expense in minor units
  inflationShockPercent: number; // additional inflation rate surge
  essentialCostIncreasePercent: number; // e.g. 10% increase in recurring essential expenses
}

export interface ScenarioSimulationResult {
  baselineState: SafetyState;
  postShockState: SafetyState;
  baselineLiquidMinor: number;
  postShockLiquidMinor: number;
  baselineSafetyFloorMinor: number;
  postShockSafetyFloorMinor: number;
  baselineSafetyTargetMinor: number;
  postShockSafetyTargetMinor: number;
  baselineRunwayDays: number;
  postShockRunwayDays: number;
  liquidLossMinor: number;
  runwayLossDays: number;
  isBreachedFloor: boolean;
  resilienceVerdict: string;
  survivalStrategies: string[];
}

export interface DebtPayoffPlan {
  strategy: 'snowball' | 'avalanche';
  title: string;
  description: string;
  payoffMonths: number;
  debtFreeDate: string; // ISO date string
  totalInterestPaidMinor: number;
  totalPaidMinor: number;
  monthlySchedule: Array<{
    monthIndex: number;
    date: string;
    remainingPrincipalMinor: number;
    interestPaidMinor: number;
    principalPaidMinor: number;
  }>;
}

export interface DebtPayoffComparison {
  snowball: DebtPayoffPlan;
  avalanche: DebtPayoffPlan;
  interestSavedWithAvalancheMinor: number;
  monthsSavedWithAvalanche: number;
  recommendedStrategy: 'snowball' | 'avalanche';
  recommendationRationale: string;
  acceleratorImpact: {
    extraMonthlyMinor: number;
    monthsSaved: number;
    interestSavedMinor: number;
  };
}

export interface RunwayDayPoint {
  dayIndex: number;
  date: string;
  projectedBalanceMinor: number;
  isSafetyFloorBreached: boolean;
  isZeroBreached: boolean;
  eventDescription?: string;
}

export interface CashFlowRunwayProjection {
  currentLiquidMinor: number;
  safetyFloorMinor: number;
  safetyTargetMinor: number;
  daysToFloorBreach: number | null; // null if never breached within 180 days
  daysToDepletion: number | null; // null if never depleted within 180 days
  lowestProjectedBalanceMinor: number;
  lowestPointDay: number;
  dailyTrajectory: RunwayDayPoint[];
  weeklySummary: Array<{
    weekIndex: number;
    startDate: string;
    projectedBalanceMinor: number;
  }>;
}

export interface PlaybookStep {
  id: string;
  title: string;
  description: string;
  actionType: 'budget_cut' | 'reserve_transfer' | 'debt_snowball' | 'renegotiate' | 'invest_sacco';
  estimatedImpactMinor: number;
  impactDescription: string;
  isUrgent: boolean;
}

export interface FinancialPlaybook {
  mode: 'recovery' | 'caution' | 'growth';
  title: string;
  subtitle: string;
  coreObjective: string;
  steps: PlaybookStep[];
  warningNotice: string;
}


