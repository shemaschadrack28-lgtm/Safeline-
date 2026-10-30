/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safeline — Phase 2: Value of Money & Inflation Engine
 * Deterministic calculations for personal inflation, NISR benchmarks, purchasing power decay,
 * future RWF value, and inflation-adjusted financial goals.
 */

import {
  BudgetCategory,
  CalculationExplanation,
  CalculationResult,
  CurrencyCode,
  FutureValueResult,
  InflationAdjustedGoal,
  NISRInflationBenchmark,
  PersonalInflationResult,
  PurchasingPowerPoint,
  PurchasingPowerProjection,
  Transaction,
} from '../types/finance';

const ENGINE_VERSION = '2.0.0-phase2';

/**
 * Official NISR (National Institute of Statistics of Rwanda) CPI Benchmark Reference Data
 * Grounded in latest official CPI publications.
 */
export const OFFICIAL_NISR_BENCHMARK: NISRInflationBenchmark = {
  periodDate: 'September 2026',
  source: 'National Institute of Statistics of Rwanda (NISR) Consumer Price Index (CPI)',
  headlineCpiPercent: 5.6,
  urbanCpiPercent: 5.8,
  ruralCpiPercent: 5.3,
  categoryRatesPercent: {
    'Food & Non-Alcoholic Beverages': 6.8,
    'Housing, Water, Electricity, Gas & other fuels': 4.5,
    'Transport': 5.2,
    'Restaurants & Hotels': 5.5,
    'Health': 4.2,
    'Education': 3.8,
    'Clothing & Footwear': 4.0,
    'Furnishings & Household Equipment': 4.4,
    'Communication': 1.8,
    'Recreation & Culture': 3.9,
    'Miscellaneous Goods & Services': 4.6,
  },
  notes: 'Official year-on-year headline CPI change reported by NISR for Rwanda.',
};

/**
 * Helper: Map a user's category name or group to the most relevant NISR CPI basket component
 */
export function mapCategoryToNisrRate(
  categoryName: string,
  categoryGroup: string,
  benchmark: NISRInflationBenchmark = OFFICIAL_NISR_BENCHMARK
): { nisrCategory: string; ratePercent: number } {
  const name = categoryName.toLowerCase();

  if (name.includes('food') || name.includes('market') || name.includes('grocer') || name.includes('supermarket') || name.includes('meat') || name.includes('bread')) {
    return { nisrCategory: 'Food & Non-Alcoholic Beverages', ratePercent: benchmark.categoryRatesPercent['Food & Non-Alcoholic Beverages'] };
  }
  if (name.includes('rent') || name.includes('hous') || name.includes('water') || name.includes('electr') || name.includes('reg') || name.includes('wasac') || name.includes('gas') || name.includes('utilit')) {
    return { nisrCategory: 'Housing, Water, Electricity, Gas & other fuels', ratePercent: benchmark.categoryRatesPercent['Housing, Water, Electricity, Gas & other fuels'] };
  }
  if (name.includes('transport') || name.includes('moto') || name.includes('taxi') || name.includes('bus') || name.includes('fuel') || name.includes('petrol') || name.includes('car')) {
    return { nisrCategory: 'Transport', ratePercent: benchmark.categoryRatesPercent['Transport'] };
  }
  if (name.includes('coffee') || name.includes('dining') || name.includes('restaurant') || name.includes('lunch') || name.includes('bar')) {
    return { nisrCategory: 'Restaurants & Hotels', ratePercent: benchmark.categoryRatesPercent['Restaurants & Hotels'] };
  }
  if (name.includes('health') || name.includes('medic') || name.includes('doctor') || name.includes('pharmacy') || name.includes('clinic')) {
    return { nisrCategory: 'Health', ratePercent: benchmark.categoryRatesPercent['Health'] };
  }
  if (name.includes('school') || name.includes('cert') || name.includes('tuition') || name.includes('educat') || name.includes('course')) {
    return { nisrCategory: 'Education', ratePercent: benchmark.categoryRatesPercent['Education'] };
  }
  if (name.includes('cloth') || name.includes('shoe') || name.includes('wear') || name.includes('tailor')) {
    return { nisrCategory: 'Clothing & Footwear', ratePercent: benchmark.categoryRatesPercent['Clothing & Footwear'] };
  }
  if (name.includes('internet') || name.includes('data') || name.includes('phone') || name.includes('airtime') || name.includes('momo fee')) {
    return { nisrCategory: 'Communication', ratePercent: benchmark.categoryRatesPercent['Communication'] };
  }
  if (name.includes('entertainment') || name.includes('stream') || name.includes('movie') || name.includes('hobby') || name.includes('gym')) {
    return { nisrCategory: 'Recreation & Culture', ratePercent: benchmark.categoryRatesPercent['Recreation & Culture'] };
  }

  // Fallback by group
  if (categoryGroup === 'needs') {
    return { nisrCategory: 'Headline CPI (General Basket)', ratePercent: benchmark.headlineCpiPercent };
  }
  if (categoryGroup === 'fun') {
    return { nisrCategory: 'Recreation & Culture', ratePercent: benchmark.categoryRatesPercent['Recreation & Culture'] };
  }

  return { nisrCategory: 'Miscellaneous Goods & Services', ratePercent: benchmark.categoryRatesPercent['Miscellaneous Goods & Services'] };
}

/**
 * Feature 1 & 2 (Phase 2): Personal Inflation Tracker
 * Computes user's actual personal inflation rate based on their spending weights across categories
 * Formula: Personal Inflation = Σ (w_i × Inflation_i) where w_i = Category Spending ÷ Total Spending
 */
export function calculatePersonalInflation(
  categories: BudgetCategory[],
  transactions: Transaction[],
  benchmark: NISRInflationBenchmark = OFFICIAL_NISR_BENCHMARK
): CalculationResult<PersonalInflationResult> {
  // Aggregate posted expenses by category
  const categorySpendingMap: Record<string, number> = {};
  let totalSpendingMinor = 0;

  for (const cat of categories) {
    categorySpendingMap[cat.id] = 0;
  }

  for (const t of transactions) {
    if (t.type === 'expense' && t.status === 'posted') {
      const amount = Math.round(t.amount);
      totalSpendingMinor += amount;
      if (categorySpendingMap[t.categoryId] !== undefined) {
        categorySpendingMap[t.categoryId] += amount;
      } else {
        categorySpendingMap[t.categoryId] = (categorySpendingMap[t.categoryId] || 0) + amount;
      }
    }
  }

  // If no spending records exist, use category allocated budget as proxy weighting
  let isBudgetProxyUsed = false;
  if (totalSpendingMinor === 0) {
    isBudgetProxyUsed = true;
    for (const cat of categories) {
      const alloc = Math.max(0, Math.round(cat.allocatedAmount));
      categorySpendingMap[cat.id] = alloc;
      totalSpendingMinor += alloc;
    }
  }

  const breakdown: PersonalInflationResult['categoryBreakdown'] = [];
  let weightedInflationSum = 0;

  for (const cat of categories) {
    const spending = categorySpendingMap[cat.id] || 0;
    const weight = totalSpendingMinor > 0 ? (spending / totalSpendingMinor) : 0;
    const { nisrCategory, ratePercent } = mapCategoryToNisrRate(cat.name, cat.group, benchmark);
    const contribution = weight * ratePercent;

    weightedInflationSum += contribution;

    breakdown.push({
      categoryId: cat.id,
      categoryName: `${cat.name} (${nisrCategory})`,
      spendingMinor: spending,
      weightPercent: Math.round(weight * 1000) / 10, // 1 decimal e.g. 35.4%
      categoryInflationRatePercent: ratePercent,
      contributionPercent: Math.round(contribution * 100) / 100,
    });
  }

  // Sort descending by spending weight
  breakdown.sort((a, b) => b.spendingMinor - a.spendingMinor);

  // If total spending is still 0 (no categories and no spending), default to benchmark
  const personalRate = totalSpendingMinor > 0 
    ? Math.round(weightedInflationSum * 10) / 10 
    : benchmark.headlineCpiPercent;

  const diff = Math.round((personalRate - benchmark.headlineCpiPercent) * 10) / 10;

  let headline = `Your personal inflation is ${personalRate}%`;
  const analysisNotes: string[] = [];

  if (diff > 0.3) {
    headline += ` (${diff}% higher than NISR headline benchmark of ${benchmark.headlineCpiPercent}%)`;
    analysisNotes.push(`Your spending is concentrated in categories experiencing above-average price rises (e.g. food or transport).`);
  } else if (diff < -0.3) {
    headline += ` (${Math.abs(diff)}% lower than NISR headline benchmark of ${benchmark.headlineCpiPercent}%)`;
    analysisNotes.push(`Your spending profile is less exposed to rapid price rises than the national average.`);
  } else {
    headline += ` (closely tracks NISR headline benchmark of ${benchmark.headlineCpiPercent}%)`;
    analysisNotes.push(`Your spending distribution closely mirrors the national CPI basket.`);
  }

  if (isBudgetProxyUsed) {
    analysisNotes.push('Calculated using your budget allocation weights as a baseline because no posted expense history was found.');
  }

  const result: PersonalInflationResult = {
    personalInflationPercent: personalRate,
    nisrBenchmarkPercent: benchmark.headlineCpiPercent,
    differencePercent: diff,
    totalSpendingMinor,
    categoryBreakdown: breakdown,
    headline,
    analysisNotes,
  };

  const explanation: CalculationExplanation = {
    metricName: 'Personal Inflation Rate',
    formulaVersion: ENGINE_VERSION,
    formula: 'Personal Inflation = Σ (w_i × Inflation_i) where w_i = Category Spending ÷ Total Spending',
    inputs: {
      personalRate,
      nisrHeadlineRate: benchmark.headlineCpiPercent,
      totalSpendingMinor,
      categoriesCount: categories.length,
      isBudgetProxyUsed,
      source: benchmark.source,
    },
    currency: 'RWF',
    computationDate: new Date().toISOString(),
    caveats: [
      'Estimates, not financial advice.',
      'Grounded in official National Institute of Statistics of Rwanda (NISR) CPI weights and indices.',
    ],
  };

  return { value: result, explanation };
}

/**
 * Feature 3 (Phase 2): Purchasing-Power Projections
 * Formula: Real Purchasing Power = Nominal Amount × (1 + r)^(-t)
 * Exact integer arithmetic for minor units.
 */
export function calculatePurchasingPowerProjections(
  initialAmountMinor: number,
  inflationRatePercent: number,
  yearsList: number[] = [1, 3, 5, 10]
): CalculationResult<PurchasingPowerProjection> {
  const r = Math.max(0, inflationRatePercent) / 100;
  const initial = Math.max(0, Math.round(initialAmountMinor));

  const points: PurchasingPowerPoint[] = yearsList.map((years) => {
    // Real Purchasing Power = Nominal / (1 + r)^years
    const factor = Math.pow(1 + r, years);
    const realPurchasingPower = Math.round(initial / factor);
    const purchasingPowerLossMinor = Math.max(0, initial - realPurchasingPower);
    const retentionPercent = initial > 0 ? Math.round((realPurchasingPower / initial) * 100) : 100;

    return {
      years,
      nominalValue: initial,
      realPurchasingPower,
      purchasingPowerLossMinor,
      retentionPercent,
    };
  });

  const result: PurchasingPowerProjection = {
    initialAmountMinor: initial,
    inflationRatePercent,
    points,
  };

  const explanation: CalculationExplanation = {
    metricName: 'Purchasing-Power Decay Projection',
    formulaVersion: ENGINE_VERSION,
    formula: 'Real Value = Nominal Amount ÷ (1 + r)^t; Purchasing Power Loss = Nominal − Real Value',
    inputs: {
      initialAmountMinor: initial,
      annualInflationRatePercent: inflationRatePercent,
      projectionHorizons: yearsList.join(', ') + ' years',
    },
    currency: 'RWF',
    computationDate: new Date().toISOString(),
    caveats: [
      'Estimates, not financial advice.',
      'Assumes constant compounding annual inflation over the selected timeframe.',
    ],
  };

  return { value: result, explanation };
}

/**
 * Feature 4 (Phase 2): Future RWF Value Calculator
 * Formula: Future Cost Needed = Present Cost × (1 + r)^t
 * Formula: Purchasing Power Factor = 1 ÷ (1 + r)^t
 */
export function calculateFutureValue(
  presentCostMinor: number,
  inflationRatePercent: number,
  years: number
): CalculationResult<FutureValueResult> {
  const r = Math.max(0, inflationRatePercent) / 100;
  const t = Math.max(0, years);
  const present = Math.max(0, Math.round(presentCostMinor));

  const multiplier = Math.pow(1 + r, t);
  const futureCostMinor = Math.round(present * multiplier);
  const additionalCostMinor = Math.max(0, futureCostMinor - present);
  const purchasingPowerFactor = t > 0 ? 1 / multiplier : 1;

  const result: FutureValueResult = {
    presentCostMinor: present,
    inflationRatePercent,
    years: t,
    futureCostMinor,
    additionalCostMinor,
    purchasingPowerFactor: Math.round(purchasingPowerFactor * 1000) / 1000,
  };

  const explanation: CalculationExplanation = {
    metricName: 'Future Value & Price Inflation Projection',
    formulaVersion: ENGINE_VERSION,
    formula: 'Future Cost = Present Cost × (1 + r)^t; Additional Needed = Future Cost − Present Cost',
    inputs: {
      presentCostMinor: present,
      inflationRatePercent,
      years: t,
      futureCostMinor,
      multiplier: Math.round(multiplier * 1000) / 1000,
    },
    currency: 'RWF',
    computationDate: new Date().toISOString(),
    caveats: [
      'Estimates, not financial advice.',
      'Reflects the nominal Rwandan Francs required in year t to match today’s purchasing power.',
    ],
  };

  return { value: result, explanation };
}

/**
 * Feature 5 (Phase 2): Inflation-Adjusted Goal Prices
 * Adjusts goal target prices for projected inflation over the goal horizon
 * Computes:
 * - Inflation-adjusted target
 * - Extra funding needed
 * - Adjusted monthly contribution
 */
export function calculateInflationAdjustedGoal(params: {
  id: string;
  name: string;
  targetDate: string;
  nominalTargetMinor: number;
  currentBalanceMinor: number;
  annualInflationPercent: number;
}): CalculationResult<InflationAdjustedGoal> {
  const { id, name, targetDate, nominalTargetMinor, currentBalanceMinor, annualInflationPercent } = params;

  const now = new Date();
  const target = new Date(targetDate);
  const diffMs = target.getTime() - now.getTime();
  const totalMonths = Math.max(1, Math.round(diffMs / (30.4375 * 24 * 60 * 60 * 1000)));
  const horizonYears = Math.max(0.1, Math.round((totalMonths / 12) * 10) / 10);

  const nominalTarget = Math.max(0, Math.round(nominalTargetMinor));
  const currentBalance = Math.max(0, Math.round(currentBalanceMinor));
  const r = Math.max(0, annualInflationPercent) / 100;

  // Inflation adjusted target = nominal * (1 + r)^horizonYears
  const inflationAdjustedTargetMinor = Math.round(nominalTarget * Math.pow(1 + r, horizonYears));
  const additionalFundingNeededMinor = Math.max(0, inflationAdjustedTargetMinor - nominalTarget);

  // Monthly needed calculations
  const remainingNominal = Math.max(0, nominalTarget - currentBalance);
  const remainingAdjusted = Math.max(0, inflationAdjustedTargetMinor - currentBalance);

  const nominalMonthlyNeededMinor = Math.round(remainingNominal / totalMonths);
  const inflationAdjustedMonthlyNeededMinor = Math.round(remainingAdjusted / totalMonths);

  const progressPercent = inflationAdjustedTargetMinor > 0 
    ? Math.min(100, Math.round((currentBalance / inflationAdjustedTargetMinor) * 100))
    : 100;

  const result: InflationAdjustedGoal = {
    id,
    name,
    targetDate,
    horizonYears,
    nominalTargetMinor: nominalTarget,
    annualInflationPercent,
    inflationAdjustedTargetMinor,
    additionalFundingNeededMinor,
    currentBalanceMinor: currentBalance,
    nominalMonthlyNeededMinor,
    inflationAdjustedMonthlyNeededMinor,
    progressPercent,
  };

  const explanation: CalculationExplanation = {
    metricName: 'Inflation-Adjusted Goal Price',
    formulaVersion: ENGINE_VERSION,
    formula: 'Adjusted Target = Nominal Target × (1 + r)^t; Monthly Needed = (Adjusted Target − Current Balance) ÷ Months',
    inputs: {
      name,
      horizonYears,
      totalMonths,
      nominalTarget,
      inflationAdjustedTargetMinor,
      additionalFundingNeededMinor,
      currentBalance,
      nominalMonthlyNeededMinor,
      inflationAdjustedMonthlyNeededMinor,
      annualInflationPercent,
    },
    currency: 'RWF',
    computationDate: new Date().toISOString(),
    caveats: [
      'Estimates, not financial advice.',
      'Helps protect your real purchasing power at target completion date.',
    ],
  };

  return { value: result, explanation };
}
