/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safeline — Phase 2: Value of Money Unit Test Suite
 * Validates personal inflation tracker, NISR benchmarks, purchasing power projections,
 * future RWF value calculator, and inflation-adjusted goal prices.
 */

import { describe, expect, it } from 'vitest';
import { 
  calculateFutureValue, 
  calculateInflationAdjustedGoal, 
  calculatePersonalInflation, 
  calculatePurchasingPowerProjections, 
  mapCategoryToNisrRate, 
  OFFICIAL_NISR_BENCHMARK 
} from './inflationEngine';
import { BudgetCategory, Transaction } from '../types/finance';

describe('Phase 2 — NISR Benchmark & Category Mapping', () => {
  it('correctly provides official NISR headline rate and categories', () => {
    expect(OFFICIAL_NISR_BENCHMARK.headlineCpiPercent).toBe(5.6);
    expect(OFFICIAL_NISR_BENCHMARK.urbanCpiPercent).toBe(5.8);
    expect(OFFICIAL_NISR_BENCHMARK.categoryRatesPercent['Food & Non-Alcoholic Beverages']).toBe(6.8);
    expect(OFFICIAL_NISR_BENCHMARK.categoryRatesPercent['Transport']).toBe(5.2);
  });

  it('maps user category names to corresponding NISR components', () => {
    const foodMap = mapCategoryToNisrRate('Kimironko Market Groceries', 'needs');
    expect(foodMap.nisrCategory).toBe('Food & Non-Alcoholic Beverages');
    expect(foodMap.ratePercent).toBe(6.8);

    const transportMap = mapCategoryToNisrRate('Moto Taxi Fares', 'needs');
    expect(transportMap.nisrCategory).toBe('Transport');
    expect(transportMap.ratePercent).toBe(5.2);

    const housingMap = mapCategoryToNisrRate('Apartment Rent', 'needs');
    expect(housingMap.nisrCategory).toBe('Housing, Water, Electricity, Gas & other fuels');
    expect(housingMap.ratePercent).toBe(4.5);
  });
});

describe('Phase 2 — Personal Inflation Tracker', () => {
  const categories: BudgetCategory[] = [
    { id: 'cat_food', name: 'Food & Groceries', group: 'needs', allocatedAmount: 100000, period: 'monthly', isEssential: true },
    { id: 'cat_rent', name: 'Apartment Rent', group: 'needs', allocatedAmount: 100000, period: 'monthly', isEssential: true },
  ];

  it('calculates weighted personal inflation rate accurately from spending records', () => {
    // 60,000 spent on Food (rate 6.8%)
    // 40,000 spent on Rent (rate 4.5%)
    // Total = 100,000
    // Weight Food = 0.60 -> contribution = 0.60 * 6.8% = 4.08%
    // Weight Rent = 0.40 -> contribution = 0.40 * 4.5% = 1.80%
    // Expected personal rate = 4.08 + 1.80 = 5.88% -> 5.9%
    const transactions: Transaction[] = [
      { id: 't1', accountId: 'a1', date: '2026-10-01', amount: 60000, type: 'expense', status: 'posted', categoryId: 'cat_food', description: 'Food', createdAt: '2026-10-01' },
      { id: 't2', accountId: 'a1', date: '2026-10-02', amount: 40000, type: 'expense', status: 'posted', categoryId: 'cat_rent', description: 'Rent', createdAt: '2026-10-02' },
    ];

    const res = calculatePersonalInflation(categories, transactions);
    expect(res.value.totalSpendingMinor).toBe(100000);
    expect(res.value.personalInflationPercent).toBe(5.9);
    expect(res.value.categoryBreakdown).toHaveLength(2);
  });

  it('handles single category spending giving 100% weight to that category', () => {
    const transactions: Transaction[] = [
      { id: 't1', accountId: 'a1', date: '2026-10-01', amount: 50000, type: 'expense', status: 'posted', categoryId: 'cat_food', description: 'Food', createdAt: '2026-10-01' },
    ];

    const res = calculatePersonalInflation(categories, transactions);
    expect(res.value.personalInflationPercent).toBe(6.8); // 100% food rate
  });

  it('uses budget allocation weights as a proxy when no posted expense history exists', () => {
    const res = calculatePersonalInflation(categories, []);
    // 100k food (6.8%) + 100k rent (4.5%) = 50% each -> 3.4 + 2.25 = 5.65% -> 5.7%
    expect(res.value.personalInflationPercent).toBe(5.7);
    expect(res.explanation.inputs.isBudgetProxyUsed).toBe(true);
  });
});

describe('Phase 2 — Purchasing-Power Projections', () => {
  it('calculates purchasing power decay accurately over 1, 3, 5, 10 years', () => {
    // 100,000 RWF at 5% inflation:
    // Year 1: 100,000 / 1.05 = 95,238 RWF (loss 4,762 RWF, retention 95%)
    // Year 3: 100,000 / (1.05)^3 = 86,384 RWF
    // Year 5: 100,000 / (1.05)^5 = 78,353 RWF
    const res = calculatePurchasingPowerProjections(100000, 5.0, [1, 3, 5]);
    const pts = res.value.points;

    expect(pts[0].years).toBe(1);
    expect(pts[0].realPurchasingPower).toBe(95238);
    expect(pts[0].purchasingPowerLossMinor).toBe(4762);
    expect(pts[0].retentionPercent).toBe(95);

    expect(pts[1].years).toBe(3);
    expect(pts[1].realPurchasingPower).toBe(86384);

    expect(pts[2].years).toBe(5);
    expect(pts[2].realPurchasingPower).toBe(78353);
  });

  it('retains 100% purchasing power if inflation is zero', () => {
    const res = calculatePurchasingPowerProjections(50000, 0, [1, 5]);
    expect(res.value.points[0].realPurchasingPower).toBe(50000);
    expect(res.value.points[0].purchasingPowerLossMinor).toBe(0);
    expect(res.value.points[0].retentionPercent).toBe(100);
  });
});

describe('Phase 2 — Future RWF Value Calculator', () => {
  it('calculates future equivalent cost needed to maintain purchasing power', () => {
    // Present cost 200,000 RWF, 6% inflation, 3 years
    // 200,000 * (1.06)^3 = 238,203 RWF
    // Additional = 38,203 RWF
    const res = calculateFutureValue(200000, 6.0, 3);
    expect(res.value.futureCostMinor).toBe(238203);
    expect(res.value.additionalCostMinor).toBe(38203);
    expect(res.value.purchasingPowerFactor).toBeCloseTo(0.84, 1);
  });

  it('returns present cost when horizon is 0 years', () => {
    const res = calculateFutureValue(150000, 5.5, 0);
    expect(res.value.futureCostMinor).toBe(150000);
    expect(res.value.additionalCostMinor).toBe(0);
  });
});

describe('Phase 2 — Inflation-Adjusted Goal Prices', () => {
  it('calculates inflation-adjusted savings goal target and monthly needed', () => {
    // Target 1,000,000 RWF in 2 years, currently 200,000 saved, 6% inflation
    const targetDate = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const res = calculateInflationAdjustedGoal({
      id: 'g1',
      name: 'SACCO Share Purchase',
      targetDate,
      nominalTargetMinor: 1000000,
      currentBalanceMinor: 200000,
      annualInflationPercent: 6.0,
    });

    const goal = res.value;
    // (1.06)^2 = 1.1236 -> 1,000,000 * 1.1236 = 1,123,600 RWF
    expect(goal.nominalTargetMinor).toBe(1000000);
    expect(goal.inflationAdjustedTargetMinor).toBeGreaterThan(1120000);
    expect(goal.additionalFundingNeededMinor).toBeGreaterThan(120000);
    // Adjusted monthly needed should be higher than nominal monthly needed
    expect(goal.inflationAdjustedMonthlyNeededMinor).toBeGreaterThan(goal.nominalMonthlyNeededMinor);
  });
});
