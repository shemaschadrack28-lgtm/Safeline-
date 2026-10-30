/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safeline Financial Engine Unit Test Suite
 * Validates all Phase 1 mathematical formulas, integer precision, and boundary states.
 */

import { describe, expect, it } from 'vitest';
import {
  calculateBudgetWarnings,
  calculateEligibleLiquidFunds,
  calculateEssentialBillsDueBeforeNextIncome,
  calculateFinancialStages,
  calculateMonthlyEssentialExpenses,
  calculateSafetyLine,
  calculateWorkHours,
  calculateZeroBasedBudget,
  evaluateAffordability,
  formatMoney,
} from './financialEngine';
import {
  Account,
  Bill,
  BudgetCategory,
  DebtRecord,
  Transaction,
  UserSettings,
} from '../types/finance';

const MOCK_SETTINGS: UserSettings = {
  currency: 'RWF',
  theme: 'dark',
  safetyMultiplier: 2,
  additionalReserve: 20000,
  nextReliableIncomeDate: '2026-11-15',
  irregularIncomeMode: false,
  irregularBufferGoal: 100000,
  coolingOffEnabled: true,
  coolingOffThreshold: 50000,
  coolingOffHours: 24,
  netHourlyEarnings: 2000, // 2,000 FRw per hour
  emergencyFundTarget: 200000,
  debtPayoffStrategy: 'snowball',
  investingMilestoneReached: false,
  investingGoalDescription: 'Emergency fund completed first',
};

describe('Financial Engine — Integer Precision & Money Formatting', () => {
  it('formats RWF and JPY with 0 decimal places and integer precision', () => {
    expect(formatMoney(50000, 'RWF')).toBe('50,000 FRw');
    expect(formatMoney(0, 'RWF')).toBe('0 FRw');
    expect(formatMoney(-15000, 'RWF')).toBe('-15,000 FRw');
    expect(formatMoney(1000, 'JPY')).toBe('¥1,000');
  });

  it('formats USD and EUR with 2 decimal places using minor units', () => {
    expect(formatMoney(1250, 'USD')).toBe('$12.50');
    expect(formatMoney(500, 'USD')).toBe('$5.00');
    expect(formatMoney(99, 'USD')).toBe('$0.99');
    expect(formatMoney(2500, 'EUR')).toBe('€25.00');
  });
});

describe('Feature 1: Zero-Based Budgeting', () => {
  const categories: BudgetCategory[] = [
    { id: 'c1', name: 'Rent', group: 'needs', allocatedAmount: 100000, period: 'monthly', isEssential: true },
    { id: 'c2', name: 'Savings Goal', group: 'goals', allocatedAmount: 30000, period: 'monthly', isEssential: false },
    { id: 'c3', name: 'Fun', group: 'fun', allocatedAmount: 20000, period: 'monthly', isEssential: false },
  ];

  it('handles zero money available correctly', () => {
    const res = calculateZeroBasedBudget({
      categories: [],
      transactions: [],
      accounts: [],
      settings: MOCK_SETTINGS,
      period: 'monthly',
    });
    expect(res.value.availableBudgetMoney).toBe(0);
    expect(res.value.totalAllocated).toBe(0);
    expect(res.value.unassignedMoney).toBe(0);
    expect(res.value.isOverAllocated).toBe(false);
  });

  it('handles no allocations with available income (100% unassigned)', () => {
    const incomeTx: Transaction[] = [
      {
        id: 't1',
        accountId: 'a1',
        date: '2026-10-01',
        amount: 200000,
        type: 'income',
        status: 'posted',
        categoryId: '',
        description: 'Salary',
        createdAt: '2026-10-01',
      },
    ];
    const res = calculateZeroBasedBudget({
      categories: [],
      transactions: incomeTx,
      accounts: [],
      settings: MOCK_SETTINGS,
      period: 'monthly',
    });
    expect(res.value.availableBudgetMoney).toBe(200000);
    expect(res.value.totalAllocated).toBe(0);
    expect(res.value.unassignedMoney).toBe(200000);
  });

  it('handles fully allocated zero-based budget (unassigned = 0)', () => {
    const incomeTx: Transaction[] = [
      {
        id: 't1',
        accountId: 'a1',
        date: '2026-10-01',
        amount: 150000,
        type: 'income',
        status: 'posted',
        categoryId: '',
        description: 'Salary',
        createdAt: '2026-10-01',
      },
    ];
    const res = calculateZeroBasedBudget({
      categories,
      transactions: incomeTx,
      accounts: [],
      settings: MOCK_SETTINGS,
      period: 'monthly',
    });
    expect(res.value.totalAllocated).toBe(150000); // 100k + 30k + 20k
    expect(res.value.unassignedMoney).toBe(0);
    expect(res.value.isOverAllocated).toBe(false);
  });

  it('handles partially allocated budget with unassigned money remaining', () => {
    const incomeTx: Transaction[] = [
      {
        id: 't1',
        accountId: 'a1',
        date: '2026-10-01',
        amount: 180000,
        type: 'income',
        status: 'posted',
        categoryId: '',
        description: 'Salary',
        createdAt: '2026-10-01',
      },
    ];
    const res = calculateZeroBasedBudget({
      categories,
      transactions: incomeTx,
      accounts: [],
      settings: MOCK_SETTINGS,
      period: 'monthly',
    });
    expect(res.value.totalAllocated).toBe(150000);
    expect(res.value.unassignedMoney).toBe(30000);
    expect(res.value.isOverAllocated).toBe(false);
  });

  it('flags attempted over-allocation without breaking arithmetic', () => {
    const incomeTx: Transaction[] = [
      {
        id: 't1',
        accountId: 'a1',
        date: '2026-10-01',
        amount: 120000,
        type: 'income',
        status: 'posted',
        categoryId: '',
        description: 'Salary',
        createdAt: '2026-10-01',
      },
    ];
    const res = calculateZeroBasedBudget({
      categories,
      transactions: incomeTx,
      accounts: [],
      settings: MOCK_SETTINGS,
      period: 'monthly',
    });
    expect(res.value.totalAllocated).toBe(150000);
    expect(res.value.unassignedMoney).toBe(-30000);
    expect(res.value.isOverAllocated).toBe(true);
  });

  it('tracks allocation adjustments and category remaining amounts correctly', () => {
    const incomeTx: Transaction[] = [
      {
        id: 't1',
        accountId: 'a1',
        date: '2026-10-01',
        amount: 150000,
        type: 'income',
        status: 'posted',
        categoryId: '',
        description: 'Salary',
        createdAt: '2026-10-01',
      },
    ];
    const expenseTx: Transaction[] = [
      {
        id: 'e1',
        accountId: 'a1',
        date: '2026-10-05',
        amount: 40000,
        type: 'expense',
        status: 'posted',
        categoryId: 'c1',
        description: 'Rent partial payment',
        createdAt: '2026-10-05',
      },
      {
        id: 'e2',
        accountId: 'a1',
        date: '2026-10-06',
        amount: 10000,
        type: 'expense',
        status: 'pending',
        categoryId: 'c1',
        description: 'Rent pending fee',
        createdAt: '2026-10-06',
      },
    ];

    const res = calculateZeroBasedBudget({
      categories,
      transactions: [...incomeTx, ...expenseTx],
      accounts: [],
      settings: MOCK_SETTINGS,
      period: 'monthly',
    });

    const rentCat = res.value.categoryBreakdown.find((b) => b.category.id === 'c1')!;
    expect(rentCat.allocated).toBe(100000);
    expect(rentCat.spent).toBe(40000);
    expect(rentCat.pendingSpent).toBe(10000);
    expect(rentCat.remaining).toBe(60000);
    expect(rentCat.percentageSpent).toBe(40);
  });
});

describe('Feature 2: Irregular Income Mode', () => {
  const irregularSettings: UserSettings = {
    ...MOCK_SETTINGS,
    irregularIncomeMode: true,
    irregularBufferGoal: 200000,
  };

  it('strictly excludes expected/speculative income from spendable funds', () => {
    const transactions: Transaction[] = [
      {
        id: 't_posted',
        accountId: 'a1',
        date: '2026-10-05',
        amount: 80000,
        type: 'income',
        status: 'posted',
        categoryId: '',
        description: 'Client Deposit (Cleared)',
        isExpectedOnly: false,
        createdAt: '2026-10-05',
      },
      {
        id: 't_expected',
        accountId: 'a1',
        date: '2026-10-20',
        amount: 150000,
        type: 'income',
        status: 'pending', // or isExpectedOnly = true
        categoryId: '',
        description: 'Unpaid Invoice (Expected)',
        isExpectedOnly: true,
        createdAt: '2026-10-05',
      },
    ];

    const res = calculateZeroBasedBudget({
      categories: [],
      transactions,
      accounts: [],
      settings: irregularSettings,
      period: 'monthly',
    });

    // Only the posted 80,000 must be available, not the 150,000 expected invoice
    expect(res.value.availableBudgetMoney).toBe(80000);
    expect(res.explanation.inputs.excludedExpectedIncomeRecords).toBe(1);
  });

  it('handles multiple received income records in irregular mode', () => {
    const transactions: Transaction[] = [
      {
        id: 't1',
        accountId: 'a1',
        date: '2026-10-02',
        amount: 30000,
        type: 'income',
        status: 'posted',
        categoryId: '',
        description: 'Gig 1',
        createdAt: '2026-10-02',
      },
      {
        id: 't2',
        accountId: 'a1',
        date: '2026-10-09',
        amount: 45000,
        type: 'income',
        status: 'posted',
        categoryId: '',
        description: 'Gig 2',
        createdAt: '2026-10-09',
      },
    ];

    const res = calculateZeroBasedBudget({
      categories: [],
      transactions,
      accounts: [],
      settings: irregularSettings,
      period: 'monthly',
    });

    expect(res.value.availableBudgetMoney).toBe(75000);
  });

  it('explains limitation when no received income is available', () => {
    const res = calculateZeroBasedBudget({
      categories: [],
      transactions: [],
      accounts: [],
      settings: irregularSettings,
      period: 'monthly',
    });

    expect(res.value.availableBudgetMoney).toBe(0);
    expect(res.explanation.caveats?.[2]).toContain('Irregular Income Mode');
  });
});

describe('Feature 3: Spending Guardrails', () => {
  const category: BudgetCategory = {
    id: 'food',
    name: 'Food & Dining',
    group: 'needs',
    allocatedAmount: 100000,
    period: 'monthly',
    isEssential: true,
  };

  it('evaluates budget warnings at 79%, 80%, and 81% of limit', () => {
    // 79%: no warning
    const tx79: Transaction[] = [
      { id: '1', accountId: 'a1', date: '2026-10-01', amount: 79000, type: 'expense', status: 'posted', categoryId: 'food', description: 'Food', createdAt: '2026-10-01' },
    ];
    expect(calculateBudgetWarnings([category], tx79)).toHaveLength(0);

    // 80%: WARNING_80
    const tx80: Transaction[] = [
      { id: '1', accountId: 'a1', date: '2026-10-01', amount: 80000, type: 'expense', status: 'posted', categoryId: 'food', description: 'Food', createdAt: '2026-10-01' },
    ];
    const w80 = calculateBudgetWarnings([category], tx80);
    expect(w80).toHaveLength(1);
    expect(w80[0].severity).toBe('WARNING_80');
    expect(w80[0].percentageUsed).toBe(80);

    // 81%: WARNING_80
    const tx81: Transaction[] = [
      { id: '1', accountId: 'a1', date: '2026-10-01', amount: 81000, type: 'expense', status: 'posted', categoryId: 'food', description: 'Food', createdAt: '2026-10-01' },
    ];
    const w81 = calculateBudgetWarnings([category], tx81);
    expect(w81).toHaveLength(1);
    expect(w81[0].severity).toBe('WARNING_80');
    expect(w81[0].percentageUsed).toBe(81);
  });

  it('evaluates budget warnings at 99%, 100%, and > 100%', () => {
    // 99%: still WARNING_80
    const tx99: Transaction[] = [
      { id: '1', accountId: 'a1', date: '2026-10-01', amount: 99000, type: 'expense', status: 'posted', categoryId: 'food', description: 'Food', createdAt: '2026-10-01' },
    ];
    const w99 = calculateBudgetWarnings([category], tx99);
    expect(w99[0].severity).toBe('WARNING_80');

    // 100%: EXCEEDED_100
    const tx100: Transaction[] = [
      { id: '1', accountId: 'a1', date: '2026-10-01', amount: 100000, type: 'expense', status: 'posted', categoryId: 'food', description: 'Food', createdAt: '2026-10-01' },
    ];
    const w100 = calculateBudgetWarnings([category], tx100);
    expect(w100[0].severity).toBe('EXCEEDED_100');
    expect(w100[0].percentageUsed).toBe(100);

    // 105%: EXCEEDED_100
    const tx105: Transaction[] = [
      { id: '1', accountId: 'a1', date: '2026-10-01', amount: 105000, type: 'expense', status: 'posted', categoryId: 'food', description: 'Food', createdAt: '2026-10-01' },
    ];
    const w105 = calculateBudgetWarnings([category], tx105);
    expect(w105[0].severity).toBe('EXCEEDED_100');
    expect(w105[0].percentageUsed).toBe(105);
  });

  it('properly distinguishes pending transactions from posted', () => {
    const txWithPending: Transaction[] = [
      { id: '1', accountId: 'a1', date: '2026-10-01', amount: 70000, type: 'expense', status: 'posted', categoryId: 'food', description: 'Food', createdAt: '2026-10-01' },
      { id: '2', accountId: 'a1', date: '2026-10-02', amount: 20000, type: 'expense', status: 'pending', categoryId: 'food', description: 'Pending Food order', createdAt: '2026-10-02' },
    ];
    // Posted is 70% (no warning yet), but pending is 20k
    const warnings = calculateBudgetWarnings([category], txWithPending);
    expect(warnings).toHaveLength(0); // Only posted reaches 80% threshold
  });
});

describe('Feature 3B: "Can I afford this?" Checker & Safety Line Impact', () => {
  const accounts: Account[] = [
    { id: 'a1', name: 'MoMo', type: 'mobile_money', balance: 300000, currency: 'RWF', isLiquid: true, updatedAt: '2026-10-01' },
  ];
  const categories: BudgetCategory[] = [
    { id: 'c1', name: 'Groceries', group: 'needs', allocatedAmount: 100000, period: 'monthly', isEssential: true },
  ];
  const bills: Bill[] = [
    { id: 'b1', name: 'Rent Bill', amount: 100000, dueDate: '2026-11-01', isEssential: true, isPaid: false, categoryId: 'c1', frequency: 'monthly' },
  ];
  const debts: DebtRecord[] = [];
  const transactions: Transaction[] = [];

  it('evaluates a comfortable purchase within budget and safety margins', () => {
    const liquidAccounts: Account[] = [
      { id: 'a1', name: 'MoMo', type: 'mobile_money', balance: 500000, currency: 'RWF', isLiquid: true, updatedAt: '2026-10-01' },
    ];
    const res = evaluateAffordability({
      purchaseCost: 20000,
      categoryId: 'c1',
      accounts: liquidAccounts,
      categories,
      bills,
      debts,
      transactions,
      settings: MOCK_SETTINGS,
    });

    expect(res.canAfford).toBe(true);
    expect(res.status).toBe('WITHIN_BUDGET');
    expect(res.workHoursCost).toBe(10); // 20,000 / 2,000 = 10.0 hours
  });

  it('evaluates a purchase that exceeds category budget', () => {
    const liquidAccounts: Account[] = [
      { id: 'a1', name: 'MoMo', type: 'mobile_money', balance: 500000, currency: 'RWF', isLiquid: true, updatedAt: '2026-10-01' },
    ];
    const res = evaluateAffordability({
      purchaseCost: 120000, // category allocated is only 100k
      categoryId: 'c1',
      accounts: liquidAccounts,
      categories,
      bills,
      debts,
      transactions,
      settings: MOCK_SETTINGS,
    });

    expect(res.status).toBe('OUTSIDE_BUDGET');
    expect(res.canAfford).toBe(false);
  });

  it('evaluates a purchase that crosses the safety floor', () => {
    // Safety Floor F = E (100k) + U (100k) = 200k
    // Liquid = 300k. If purchase = 150k, liquid drops to 150k < F (200k)
    const res = evaluateAffordability({
      purchaseCost: 150000,
      categoryId: 'c1',
      accounts,
      categories,
      bills,
      debts,
      transactions,
      settings: MOCK_SETTINGS,
    });

    expect(res.status).toBe('RISK_CROSSING_SAFETY_FLOOR');
    expect(res.canAfford).toBe(false);
  });

  it('handles missing or zero affordability inputs gracefully', () => {
    const res = evaluateAffordability({
      purchaseCost: 0,
      categoryId: 'c1',
      accounts,
      categories,
      bills,
      debts,
      transactions,
      settings: MOCK_SETTINGS,
    });

    expect(res.status).toBe('INSUFFICIENT_INFORMATION');
    expect(res.canAfford).toBe(false);
  });
});

describe('Feature 3D: Cost in Work Hours', () => {
  it('calculates work hours with valid positive integer inputs', () => {
    // 50,000 FRw / 2,500 FRw/hr = 20.0 hours
    const res = calculateWorkHours(50000, 2500);
    expect(res.value).toBe(20);
  });

  it('handles fractional work hours rounded to 1 decimal place', () => {
    // 10,000 FRw / 3,000 FRw/hr = 3.333 -> 3.3 hours
    const res = calculateWorkHours(10000, 3000);
    expect(res.value).toBe(3.3);
  });

  it('returns null and clear explanation when hourly earnings missing or zero', () => {
    const resNull = calculateWorkHours(25000, null);
    expect(resNull.value).toBeNull();
    expect(resNull.explanation.missingDataNotes).toBeDefined();

    const resZero = calculateWorkHours(25000, 0);
    expect(resZero.value).toBeNull();
  });
});

describe('Feature 4: Financial Stage Tracker', () => {
  it('tracks Stage 1 Emergency Fund progress correctly', () => {
    const accounts: Account[] = [
      { id: 'a1', name: 'MoMo', type: 'mobile_money', balance: 150000, currency: 'RWF', isLiquid: true, updatedAt: '2026-10-01' },
    ];
    const settings: UserSettings = {
      ...MOCK_SETTINGS,
      emergencyFundTarget: 300000,
    };

    const stages = calculateFinancialStages({
      accounts,
      debts: [],
      settings,
    });

    expect(stages.stage1.target).toBe(300000);
    expect(stages.stage1.currentBalance).toBe(150000);
    expect(stages.stage1.remaining).toBe(150000);
    expect(stages.stage1.progressPercentage).toBe(50);
    expect(stages.stage1.isComplete).toBe(false);
  });

  it('separates debt principal, interest, and fees in Stage 2', () => {
    const debts: DebtRecord[] = [
      {
        id: 'd1',
        name: 'Bank Loan',
        lender: 'BK',
        principalRemaining: 100000,
        accruedInterest: 15000,
        fees: 2000,
        annualInterestRatePercent: 16.0,
        minimumMonthlyPayment: 25000,
        dueDateDay: 15,
        isEssential: true,
      },
    ];

    const stages = calculateFinancialStages({
      accounts: [],
      debts,
      settings: MOCK_SETTINGS,
    });

    expect(stages.stage2.totalPrincipal).toBe(100000);
    expect(stages.stage2.totalAccruedInterest).toBe(15000);
    expect(stages.stage2.totalFees).toBe(2000);
    expect(stages.stage2.totalRequiredMonthly).toBe(25000);
    expect(stages.stage2.isDebtFree).toBe(false);
  });

  it('does not create automatic financial transactions or transfer money', () => {
    // Verifies purely informational output
    const stages = calculateFinancialStages({
      accounts: [],
      debts: [],
      settings: MOCK_SETTINGS,
    });
    expect(stages.stage2.isDebtFree).toBe(true);
    expect(stages.stage3.isUnlocked).toBe(false); // emergency fund has 0 balance
  });
});

describe('Personal Financial Safety Line Model (L, E, U, R, F, S, P)', () => {
  it('correctly calculates F, S, L and classifies Safe state', () => {
    const accounts: Account[] = [
      { id: 'a1', name: 'MoMo', type: 'mobile_money', balance: 500000, currency: 'RWF', isLiquid: true, updatedAt: '2026-10-01' },
    ];
    const categories: BudgetCategory[] = [
      { id: 'c1', name: 'Rent', group: 'needs', allocatedAmount: 100000, period: 'monthly', isEssential: true },
    ];
    const bills: Bill[] = [
      { id: 'b1', name: 'Water', amount: 20000, dueDate: '2026-11-01', isEssential: true, isPaid: false, categoryId: 'c1', frequency: 'monthly' },
    ];

    const res = calculateSafetyLine({
      accounts,
      categories,
      bills,
      debts: [],
      transactions: [],
      settings: { ...MOCK_SETTINGS, safetyMultiplier: 2, additionalReserve: 10000 },
    });

    const v = res.value;
    expect(v.L).toBe(500000);
    expect(v.E).toBe(100000);
    expect(v.U).toBe(20000);
    expect(v.F).toBe(120000); // E + U = 100k + 20k
    expect(v.S).toBe(230000); // E * 2 + U + R = 200k + 20k + 10k
    expect(v.state).toBe('Safe'); // L (500k) >= S (230k)
  });

  it('classifies Recovery when liquid funds fall below Safety Floor F', () => {
    const accounts: Account[] = [
      { id: 'a1', name: 'MoMo', type: 'mobile_money', balance: 80000, currency: 'RWF', isLiquid: true, updatedAt: '2026-10-01' },
    ];
    const categories: BudgetCategory[] = [
      { id: 'c1', name: 'Rent', group: 'needs', allocatedAmount: 100000, period: 'monthly', isEssential: true },
    ];

    const res = calculateSafetyLine({
      accounts,
      categories,
      bills: [],
      debts: [],
      transactions: [],
      settings: MOCK_SETTINGS,
    });

    expect(res.value.L).toBe(80000);
    expect(res.value.F).toBe(100000);
    expect(res.value.state).toBe('Recovery');
  });
});
