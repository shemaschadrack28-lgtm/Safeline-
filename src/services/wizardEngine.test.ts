/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Unit tests for Phase 4: The Financial Wizard Engine
 */

import { describe, expect, it } from 'vitest';
import { 
  calculateCashFlowRunway, 
  calculateDebtPayoffComparison, 
  calculateFinancialHealthScore, 
  generateFinancialPlaybook, 
  simulateScenarioStress 
} from './wizardEngine';
import { 
  Account, 
  Bill, 
  BudgetCategory, 
  DebtRecord, 
  InflationAdjustedGoal, 
  Transaction, 
  UserSettings 
} from '../types/finance';

const mockSettings: UserSettings = {
  currency: 'RWF',
  theme: 'dark',
  bufferMonthsMultiplier: 3,
  additionalReserveAmount: 50000,
  irregularIncomeMode: false,
  irregularBufferGoal: 200000,
  hourlyWageMinor: 2500,
  workingHoursPerDay: 8,
};

const mockAccounts: Account[] = [
  { id: 'acc_1', name: 'M-MoMo Liquid', type: 'mobile_money', balance: 350000, isLiquid: true, currency: 'RWF' },
  { id: 'acc_2', name: 'Bank of Kigali Checking', type: 'bank', balance: 250000, isLiquid: true, currency: 'RWF' },
  { id: 'acc_3', name: 'SACCO Shares Reserve', type: 'savings', balance: 500000, isLiquid: false, currency: 'RWF' },
];

const mockCategories: BudgetCategory[] = [
  { id: 'cat_rent', name: 'Rent', group: 'needs', allocatedAmount: 120000, period: 'monthly', isEssential: true },
  { id: 'cat_food', name: 'Food', group: 'needs', allocatedAmount: 80000, period: 'monthly', isEssential: true },
  { id: 'cat_fun', name: 'Recreation', group: 'fun', allocatedAmount: 30000, period: 'monthly', isEssential: false },
];

const mockBills: Bill[] = [
  { id: 'b_1', name: 'Electricity Utility', amount: 15000, dueDate: '2026-11-15', isEssential: true, isPaid: false, categoryId: 'cat_rent' },
];

const mockDebts: DebtRecord[] = [
  { id: 'd_1', creditor: 'Device Loan', principal: 100000, interestRatePercent: 18.0, minimumPayment: 15000, dueDate: '2026-11-20', category: 'personal' },
  { id: 'd_2', creditor: 'Supplier Credit', principal: 50000, interestRatePercent: 24.0, minimumPayment: 10000, dueDate: '2026-11-25', category: 'business' },
];

const mockTransactions: Transaction[] = [
  { id: 't_inc', accountId: 'acc_1', amount: 450000, type: 'income', status: 'posted', categoryId: 'cat_rent', date: '2026-10-25', description: 'Salary' },
  { id: 't_exp1', accountId: 'acc_1', amount: 50000, type: 'expense', status: 'posted', categoryId: 'cat_food', date: '2026-10-26', description: 'Market' },
];

const mockGoals: InflationAdjustedGoal[] = [
  {
    id: 'g_1',
    name: 'SACCO Capital',
    targetDate: '2027-10-30',
    horizonYears: 1.0,
    nominalTargetMinor: 300000,
    annualInflationPercent: 5.6,
    inflationAdjustedTargetMinor: 316800,
    additionalFundingNeededMinor: 16800,
    currentBalanceMinor: 150000,
    nominalMonthlyNeededMinor: 25000,
    inflationAdjustedMonthlyNeededMinor: 26400,
    progressPercent: 50,
  },
];

describe('Phase 4: Wizard Engine — Financial Health Scorecard', () => {
  it('calculates deterministic financial health score between 0 and 100 with 5 pillars', () => {
    const { value, explanation } = calculateFinancialHealthScore({
      accounts: mockAccounts,
      categories: mockCategories,
      bills: mockBills,
      debts: mockDebts,
      transactions: mockTransactions,
      goals: mockGoals,
      settings: mockSettings,
    });

    expect(value.overallScore).toBeGreaterThanOrEqual(0);
    expect(value.overallScore).toBeLessThanOrEqual(100);
    expect(['fortified', 'resilient', 'caution', 'critical']).toContain(value.tier);

    // Verify all 5 pillars
    expect(value.pillars.liquidity.maxScore).toBe(25);
    expect(value.pillars.debt.maxScore).toBe(20);
    expect(value.pillars.savings.maxScore).toBe(20);
    expect(value.pillars.inflationResilience.maxScore).toBe(15);
    expect(value.pillars.budgetDiscipline.maxScore).toBe(20);

    const sumPillars = value.pillars.liquidity.score +
      value.pillars.debt.score +
      value.pillars.savings.score +
      value.pillars.inflationResilience.score +
      value.pillars.budgetDiscipline.score;
    expect(value.overallScore).toBe(sumPillars);

    expect(value.prioritizedActions.length).toBeGreaterThan(0);
    expect(explanation.formula).toContain('Overall Score');
  });
});

describe('Phase 4: Wizard Engine — What-If? Scenario Stress Tester', () => {
  it('correctly simulates emergency and inflation shocks on financial buffer', () => {
    const shock = {
      incomeShockPercent: 20,
      emergencyExpenseMinor: 100000,
      inflationShockPercent: 3.5,
      essentialCostIncreasePercent: 10,
    };

    const { value, explanation } = simulateScenarioStress({
      accounts: mockAccounts,
      categories: mockCategories,
      bills: mockBills,
      debts: mockDebts,
      transactions: mockTransactions,
      goals: mockGoals,
      settings: mockSettings,
    }, shock);

    // Post shock liquid should equal baseline liquid minus emergency expense
    expect(value.baselineLiquidMinor).toBe(600000); // 350k + 250k
    expect(value.postShockLiquidMinor).toBe(500000); // 600k - 100k
    expect(value.liquidLossMinor).toBe(100000);

    // Post shock floor should expand due to essential cost increase
    expect(value.postShockSafetyFloorMinor).toBeGreaterThan(value.baselineSafetyFloorMinor);
    expect(value.survivalStrategies.length).toBeGreaterThan(0);
    expect(explanation.caveats[0]).toContain('Estimates, not financial advice.');
  });
});

describe('Phase 4: Wizard Engine — Debt Freedom Optimizer', () => {
  it('compares Snowball vs Avalanche and measures accelerator impact', () => {
    const extraMonthly = 20000;
    const { value, explanation } = calculateDebtPayoffComparison(mockDebts, extraMonthly, 'RWF');

    expect(value.snowball.payoffMonths).toBeGreaterThan(0);
    expect(value.avalanche.payoffMonths).toBeGreaterThan(0);
    // Avalanche pays highest APR (24%) first so it should pay less or equal total interest compared to Snowball
    expect(value.avalanche.totalInterestPaidMinor).toBeLessThanOrEqual(value.snowball.totalInterestPaidMinor);

    expect(value.acceleratorImpact.extraMonthlyMinor).toBe(20000);
    expect(explanation.inputs.length).toBeGreaterThan(0);
  });

  it('handles empty debt list cleanly', () => {
    const { value } = calculateDebtPayoffComparison([], 0, 'RWF');
    expect(value.snowball.payoffMonths).toBe(0);
    expect(value.avalanche.payoffMonths).toBe(0);
    expect(value.snowball.title).toBe('Debt Free');
  });
});

describe('Phase 4: Wizard Engine — Cash Flow Runway Forecaster', () => {
  it('projects 180-day daily balance trajectory and identifies floor status', () => {
    const { value, explanation } = calculateCashFlowRunway({
      accounts: mockAccounts,
      categories: mockCategories,
      bills: mockBills,
      debts: mockDebts,
      transactions: mockTransactions,
      goals: mockGoals,
      settings: mockSettings,
    }, 180);

    expect(value.dailyTrajectory.length).toBe(181); // Day 0 to 180
    expect(value.weeklySummary.length).toBeGreaterThan(20);
    expect(value.currentLiquidMinor).toBe(600000);
    expect(explanation.inputs[0].label).toBe('Starting Liquid L');
  });
});

describe('Phase 4: Wizard Engine — Guided Action Playbooks', () => {
  it('generates recovery, caution, and growth playbooks deterministically', () => {
    const mockHealthScore = calculateFinancialHealthScore({
      accounts: mockAccounts,
      categories: mockCategories,
      bills: mockBills,
      debts: mockDebts,
      transactions: mockTransactions,
      goals: mockGoals,
      settings: mockSettings,
    }).value;

    const recoveryPlaybook = generateFinancialPlaybook(mockHealthScore, 'recovery', 'RWF');
    expect(recoveryPlaybook.mode).toBe('recovery');
    expect(recoveryPlaybook.steps.length).toBeGreaterThanOrEqual(3);
    expect(recoveryPlaybook.steps[0].isUrgent).toBe(true);

    const cautionPlaybook = generateFinancialPlaybook(mockHealthScore, 'caution', 'RWF');
    expect(cautionPlaybook.mode).toBe('caution');

    const growthPlaybook = generateFinancialPlaybook(mockHealthScore, 'safe', 'RWF');
    expect(growthPlaybook.mode).toBe('growth');
  });
});
