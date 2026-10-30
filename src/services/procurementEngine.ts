/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safeline — Phase 3: Shopping, Procurement and Projects Engine
 * Deterministic financial calculations for unit-price comparison, shopping list spending caps,
 * supplier quote comparison, and Bill of Quantities (BoQ) with inflation adjustments.
 */

import {
  BoQLineItem,
  CalculationExplanation,
  CalculationResult,
  CurrencyCode,
  ProjectBoQ,
  StandardUnit,
  SupplierQuote,
  UnitPriceComparisonCandidate,
  UnitPriceComparisonResult,
  ShoppingList,
} from '../types/finance';

const ENGINE_VERSION = '3.0.0-phase3';

/**
 * Normalizes units to their base unit (e.g. g -> kg, ml -> liter)
 */
export function normalizeUnitAndQuantity(
  quantity: number,
  unit: StandardUnit
): { baseUnit: string; baseQuantity: number } {
  const q = Math.max(0.0001, quantity);

  switch (unit) {
    case 'g':
      return { baseUnit: 'kg', baseQuantity: q / 1000 };
    case 'kg':
      return { baseUnit: 'kg', baseQuantity: q };
    case 'ml':
      return { baseUnit: 'liter', baseQuantity: q / 1000 };
    case 'liter':
      return { baseUnit: 'liter', baseQuantity: q };
    case 'bag':
    case 'box':
    case 'meter':
    case 'piece':
    default:
      return { baseUnit: unit, baseQuantity: q };
  }
}

/**
 * Feature B (Phase 3): Unit-Price Comparison
 * Calculates normalized price per base unit and identifies best value
 */
export function compareUnitPrices(
  candidates: UnitPriceComparisonCandidate[],
  currency: CurrencyCode = 'RWF'
): CalculationResult<UnitPriceComparisonResult[]> {
  if (candidates.length === 0) {
    return {
      value: [],
      explanation: {
        metricName: 'Unit-Price Comparison',
        formulaVersion: ENGINE_VERSION,
        formula: 'Unit Price = Package Price ÷ Normalized Base Quantity',
        inputs: { candidatesCount: 0 },
        currency,
        computationDate: new Date().toISOString(),
        missingDataNotes: ['No candidates provided for comparison.'],
      },
    };
  }

  // 1. Calculate price per base unit for each
  const evaluated = candidates.map((c) => {
    const { baseUnit, baseQuantity } = normalizeUnitAndQuantity(c.quantity, c.unit);
    const pricePerBaseUnitMinor = Math.round(c.packagePriceMinor / baseQuantity);

    return {
      candidateId: c.id,
      label: c.label,
      vendor: c.vendor,
      packagePriceMinor: Math.round(c.packagePriceMinor),
      normalizedQuantityBase: Math.round(baseQuantity * 1000) / 1000,
      baseUnit,
      pricePerBaseUnitMinor,
      isBestValue: false,
      savingsVsHighestPercent: 0,
      savingsVsHighestMinor: 0,
    };
  });

  // Find lowest and highest price per base unit
  let lowestIndex = 0;
  let highestPrice = evaluated[0].pricePerBaseUnitMinor;

  for (let i = 0; i < evaluated.length; i++) {
    if (evaluated[i].pricePerBaseUnitMinor < evaluated[lowestIndex].pricePerBaseUnitMinor) {
      lowestIndex = i;
    }
    if (evaluated[i].pricePerBaseUnitMinor > highestPrice) {
      highestPrice = evaluated[i].pricePerBaseUnitMinor;
    }
  }

  evaluated[lowestIndex].isBestValue = true;

  // Calculate savings vs highest
  for (const item of evaluated) {
    if (highestPrice > 0) {
      const diff = highestPrice - item.pricePerBaseUnitMinor;
      item.savingsVsHighestMinor = Math.max(0, diff);
      item.savingsVsHighestPercent = Math.round((diff / highestPrice) * 100);
    }
  }

  // Sort ascending by pricePerBaseUnitMinor
  evaluated.sort((a, b) => a.pricePerBaseUnitMinor - b.pricePerBaseUnitMinor);

  const explanation: CalculationExplanation = {
    metricName: 'Unit-Price Comparison & Savings',
    formulaVersion: ENGINE_VERSION,
    formula: 'Price Per Base Unit = Package Price ÷ Base Quantity; Savings % = (Highest Unit Price − Item Unit Price) ÷ Highest Unit Price',
    inputs: {
      candidatesCount: candidates.length,
      bestVendor: evaluated[0].vendor,
      cheapestUnitPriceMinor: evaluated[0].pricePerBaseUnitMinor,
      highestUnitPriceMinor: highestPrice,
      baseUnit: evaluated[0].baseUnit,
    },
    currency,
    computationDate: new Date().toISOString(),
    caveats: ['Estimates, not financial advice. Normalizes package weights and volumes for true apples-to-apples comparison.'],
  };

  return { value: evaluated, explanation };
}

/**
 * Feature C (Phase 3): Shopping Lists and Spending Caps
 * Sums list items, monitors spending cap, triggers 80% and 100% cap guardrails
 */
export function calculateShoppingListTotals(
  list: ShoppingList,
  currency: CurrencyCode = 'RWF'
): CalculationResult<{
  totalEstimatedMinor: number;
  totalActualMinor: number;
  activeTotalMinor: number;
  totalCheckedCount: number;
  itemCount: number;
  remainingCapMinor: number;
  isCapExceeded: boolean;
  capUsedPercent: number;
  capWarningSeverity: 'NORMAL' | 'WARNING_80' | 'EXCEEDED_100';
}> {
  let totalEstimatedMinor = 0;
  let totalActualMinor = 0;
  let totalCheckedCount = 0;

  for (const item of list.items) {
    const est = Math.round(item.estimatedPriceMinor || 0);
    const act = item.actualPriceMinor !== undefined ? Math.round(item.actualPriceMinor) : est;

    totalEstimatedMinor += est;
    totalActualMinor += act;

    if (item.isChecked) {
      totalCheckedCount++;
    }
  }

  const activeTotalMinor = totalActualMinor > 0 ? totalActualMinor : totalEstimatedMinor;
  const spendingCapMinor = Math.max(0, Math.round(list.spendingCapMinor || 0));
  const remainingCapMinor = spendingCapMinor - activeTotalMinor;
  const isCapExceeded = spendingCapMinor > 0 && activeTotalMinor > spendingCapMinor;
  const capUsedPercent = spendingCapMinor > 0 ? Math.round((activeTotalMinor / spendingCapMinor) * 100) : 0;

  let capWarningSeverity: 'NORMAL' | 'WARNING_80' | 'EXCEEDED_100' = 'NORMAL';
  if (capUsedPercent >= 100) {
    capWarningSeverity = 'EXCEEDED_100';
  } else if (capUsedPercent >= 80) {
    capWarningSeverity = 'WARNING_80';
  }

  const result = {
    totalEstimatedMinor,
    totalActualMinor,
    activeTotalMinor,
    totalCheckedCount,
    itemCount: list.items.length,
    remainingCapMinor,
    isCapExceeded,
    capUsedPercent,
    capWarningSeverity,
  };

  const explanation: CalculationExplanation = {
    metricName: 'Shopping List Spending Cap Calculation',
    formulaVersion: ENGINE_VERSION,
    formula: 'Active Total = Σ Items; Remaining Cap = Spending Cap − Active Total; Used % = (Active Total ÷ Cap) × 100',
    inputs: {
      spendingCapMinor,
      activeTotalMinor,
      remainingCapMinor,
      capUsedPercent,
      itemCount: list.items.length,
      checkedCount: totalCheckedCount,
    },
    currency,
    computationDate: new Date().toISOString(),
    caveats: ['Estimates, not financial advice. Prevents impulse overspending during market trips.'],
  };

  return { value: result, explanation };
}

/**
 * Feature D (Phase 3): Supplier Quote Comparison
 * Evaluates vendor bids including delivery fees, taxes, and completion speed
 */
export function compareSupplierQuotes(
  quotes: SupplierQuote[],
  currency: CurrencyCode = 'RWF'
): CalculationResult<{
  quotes: SupplierQuote[];
  lowestQuoteMinor: number;
  averageQuoteMinor: number;
  variancePercent: number;
  recommendedQuoteId: string | null;
}> {
  if (quotes.length === 0) {
    return {
      value: {
        quotes: [],
        lowestQuoteMinor: 0,
        averageQuoteMinor: 0,
        variancePercent: 0,
        recommendedQuoteId: null,
      },
      explanation: {
        metricName: 'Supplier Quote Comparison',
        formulaVersion: ENGINE_VERSION,
        formula: 'Total Quote = Items Total + Delivery Fee; Variance = (Highest − Lowest) ÷ Lowest',
        inputs: { quotesCount: 0 },
        currency,
        computationDate: new Date().toISOString(),
      },
    };
  }

  let lowestMinor = Infinity;
  let highestMinor = 0;
  let sumMinor = 0;
  let lowestQuoteId: string | null = null;

  for (const q of quotes) {
    const total = Math.round(q.totalQuoteMinor);
    sumMinor += total;
    if (total < lowestMinor) {
      lowestMinor = total;
      lowestQuoteId = q.id;
    }
    if (total > highestMinor) {
      highestMinor = total;
    }
  }

  const averageQuoteMinor = Math.round(sumMinor / quotes.length);
  const variancePercent = lowestMinor > 0 && lowestMinor !== Infinity
    ? Math.round(((highestMinor - lowestMinor) / lowestMinor) * 100)
    : 0;

  // Mark recommended
  const processedQuotes = quotes.map((q) => ({
    ...q,
    isRecommended: q.id === lowestQuoteId,
  }));

  const result = {
    quotes: processedQuotes,
    lowestQuoteMinor: lowestMinor === Infinity ? 0 : lowestMinor,
    averageQuoteMinor,
    variancePercent,
    recommendedQuoteId: lowestQuoteId,
  };

  const explanation: CalculationExplanation = {
    metricName: 'Supplier Quote Evaluation',
    formulaVersion: ENGINE_VERSION,
    formula: 'Total Quote = Items Total + Delivery Fee; Average = Σ Quotes ÷ Count; Variance % = ((Highest − Lowest) ÷ Lowest) × 100',
    inputs: {
      quotesCount: quotes.length,
      lowestQuoteMinor: result.lowestQuoteMinor,
      averageQuoteMinor,
      variancePercent,
    },
    currency,
    computationDate: new Date().toISOString(),
  };

  return { value: result, explanation };
}

/**
 * Feature E & F (Phase 3): Bill of Quantities (BoQ) & Project Cost Estimation
 * Computes line items, contingency buffer, and compounds project inflation over duration
 */
export function calculateProjectBoQ(params: {
  id: string;
  name: string;
  description: string;
  category: ProjectBoQ['category'];
  startDate: string;
  durationMonths: number;
  contingencyPercent: number;
  inflationAnnualPercent: number;
  items: Array<{
    id: string;
    section: BoQLineItem['section'];
    description: string;
    quantity: number;
    unit: string;
    unitRateMinor: number;
    notes?: string;
  }>;
  currency?: CurrencyCode;
}): CalculationResult<ProjectBoQ> {
  const {
    id,
    name,
    description,
    category,
    startDate,
    durationMonths,
    contingencyPercent,
    inflationAnnualPercent,
    items,
    currency = 'RWF',
  } = params;

  // 1. Calculate each line item cost: quantity * unitRateMinor
  let subtotalMinor = 0;
  const processedItems: BoQLineItem[] = items.map((item) => {
    const cost = Math.round(item.quantity * item.unitRateMinor);
    subtotalMinor += cost;
    return {
      ...item,
      totalCostMinor: cost,
    };
  });

  // 2. Contingency Calculation
  const contingencyRate = Math.max(0, contingencyPercent) / 100;
  const contingencyMinor = Math.round(subtotalMinor * contingencyRate);

  // 3. Nominal Total = Subtotal + Contingency
  const nominalTotalMinor = subtotalMinor + contingencyMinor;

  // 4. Inflation Adjustment (Phase 2 integration)
  // Horizon in years = durationMonths / 12
  const horizonYears = Math.max(0, durationMonths) / 12;
  const inflationRate = Math.max(0, inflationAnnualPercent) / 100;
  const multiplier = Math.pow(1 + inflationRate, horizonYears);

  const inflationAdjustedTotalMinor = Math.round(nominalTotalMinor * multiplier);
  const inflationBufferMinor = Math.max(0, inflationAdjustedTotalMinor - nominalTotalMinor);

  const project: ProjectBoQ = {
    id,
    name,
    description,
    category,
    startDate,
    durationMonths,
    contingencyPercent,
    inflationAnnualPercent,
    items: processedItems,
    subtotalMinor,
    contingencyMinor,
    nominalTotalMinor,
    inflationAdjustedTotalMinor,
    inflationBufferMinor,
  };

  const explanation: CalculationExplanation = {
    metricName: 'Bill of Quantities (BoQ) & Project Cost Estimation',
    formulaVersion: ENGINE_VERSION,
    formula: 'Line Cost = Quantity × Unit Rate; Subtotal = Σ Line Costs; Contingency = Subtotal × Contingency %; Nominal Total = Subtotal + Contingency; Inflation Adjusted = Nominal Total × (1 + r)^(months / 12)',
    inputs: {
      name,
      lineItemsCount: items.length,
      subtotalMinor,
      contingencyPercent,
      contingencyMinor,
      nominalTotalMinor,
      durationMonths,
      inflationAnnualPercent,
      inflationAdjustedTotalMinor,
      inflationBufferMinor,
    },
    currency,
    computationDate: new Date().toISOString(),
    caveats: [
      'Estimates, not financial advice.',
      'Includes both physical contingency for unforeseen site needs and financial inflation buffering over project duration.',
    ],
  };

  return { value: project, explanation };
}
