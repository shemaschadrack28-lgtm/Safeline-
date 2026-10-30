/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safeline — Phase 3: Procurement & Projects Unit Test Suite
 * Validates unit-price comparisons, shopping list spending caps, supplier quotes,
 * and Bill of Quantities (BoQ) with inflation adjustment.
 */

import { describe, expect, it } from 'vitest';
import { 
  calculateProjectBoQ, 
  calculateShoppingListTotals, 
  compareSupplierQuotes, 
  compareUnitPrices, 
  normalizeUnitAndQuantity 
} from './procurementEngine';
import { ShoppingList, SupplierQuote, UnitPriceComparisonCandidate } from '../types/finance';

describe('Phase 3 — Unit Normalization', () => {
  it('correctly normalizes grams to kilograms and milliliters to liters', () => {
    expect(normalizeUnitAndQuantity(500, 'g')).toEqual({ baseUnit: 'kg', baseQuantity: 0.5 });
    expect(normalizeUnitAndQuantity(2.5, 'kg')).toEqual({ baseUnit: 'kg', baseQuantity: 2.5 });
    expect(normalizeUnitAndQuantity(750, 'ml')).toEqual({ baseUnit: 'liter', baseQuantity: 0.75 });
    expect(normalizeUnitAndQuantity(2, 'liter')).toEqual({ baseUnit: 'liter', baseQuantity: 2.0 });
    expect(normalizeUnitAndQuantity(10, 'piece')).toEqual({ baseUnit: 'piece', baseQuantity: 10 });
  });
});

describe('Phase 3 — Unit-Price Comparison & Savings', () => {
  it('identifies the best value package and calculates true savings vs highest', () => {
    // Rice comparison:
    // Package A: 500g at 1,500 RWF -> 3,000 RWF/kg
    // Package B: 2kg at 5,000 RWF -> 2,500 RWF/kg (Cheapest)
    // Package C: 5kg at 13,000 RWF -> 2,600 RWF/kg
    const candidates: UnitPriceComparisonCandidate[] = [
      { id: '1', label: 'Small Pouch', vendor: 'Local Kiosk', packagePriceMinor: 1500, quantity: 500, unit: 'g' },
      { id: '2', label: '2kg Bag', vendor: 'Kimironko Market', packagePriceMinor: 5000, quantity: 2, unit: 'kg' },
      { id: '3', label: '5kg Family Sack', vendor: 'Simba Supermarket', packagePriceMinor: 13000, quantity: 5, unit: 'kg' },
    ];

    const res = compareUnitPrices(candidates);
    const items = res.value;

    expect(items).toHaveLength(3);
    // Package B should be first (cheapest unit price: 2,500 RWF/kg)
    expect(items[0].vendor).toBe('Kimironko Market');
    expect(items[0].pricePerBaseUnitMinor).toBe(2500);
    expect(items[0].isBestValue).toBe(true);

    // Highest unit price is Package A (3,000 RWF/kg)
    // Savings for Package B vs Package A = 3,000 - 2,500 = 500 RWF/kg (17% savings)
    expect(items[0].savingsVsHighestMinor).toBe(500);
    expect(items[0].savingsVsHighestPercent).toBe(17);
  });
});

describe('Phase 3 — Shopping Lists & Spending Caps', () => {
  it('calculates shopping list totals and warns when exceeding spending cap', () => {
    const list: ShoppingList = {
      id: 'l1',
      name: 'Weekend Market Groceries',
      spendingCapMinor: 50000, // 50,000 FRw Cap
      categoryId: 'cat_groceries',
      status: 'active',
      createdAt: '2026-10-30',
      items: [
        { id: 'i1', name: 'Irish Potatoes (Ibirayi)', quantity: 10, unit: 'kg', estimatedPriceMinor: 12000, actualPriceMinor: 11000, isChecked: true },
        { id: 'i2', name: 'Fresh Vegetables & Tomatoes', quantity: 1, unit: 'piece', estimatedPriceMinor: 8000, actualPriceMinor: 9000, isChecked: true },
        { id: 'i3', name: 'Cooking Oil (5L)', quantity: 1, unit: 'piece', estimatedPriceMinor: 22000, actualPriceMinor: 23000, isChecked: true },
      ],
    };

    const res = calculateShoppingListTotals(list);
    const val = res.value;

    // Total actual = 11,000 + 9,000 + 23,000 = 43,000 FRw
    expect(val.totalActualMinor).toBe(43000);
    expect(val.remainingCapMinor).toBe(7000); // 50,000 - 43,000 = 7,000 FRw left
    expect(val.isCapExceeded).toBe(false);
    expect(val.capUsedPercent).toBe(86); // 43,000 / 50,000 = 86%
    expect(val.capWarningSeverity).toBe('WARNING_80');
  });

  it('triggers EXCEEDED_100 when actual purchases breach spending cap', () => {
    const list: ShoppingList = {
      id: 'l2',
      name: 'Hardware Supplies',
      spendingCapMinor: 30000,
      categoryId: 'cat_hardware',
      status: 'active',
      createdAt: '2026-10-30',
      items: [
        { id: 'i1', name: 'Paint & Brushes', quantity: 1, unit: 'piece', estimatedPriceMinor: 32000, actualPriceMinor: 32000, isChecked: true },
      ],
    };

    const res = calculateShoppingListTotals(list);
    expect(res.value.isCapExceeded).toBe(true);
    expect(res.value.capWarningSeverity).toBe('EXCEEDED_100');
    expect(res.value.remainingCapMinor).toBe(-2000);
  });
});

describe('Phase 3 — Supplier Quote Comparison', () => {
  it('compares quotes including delivery fees and identifies lowest bid', () => {
    const quotes: SupplierQuote[] = [
      { id: 'q1', projectId: 'p1', supplierName: 'Nyabugogo Hardware', deliveryDays: 2, deliveryFeeMinor: 15000, itemsTotalMinor: 250000, totalQuoteMinor: 265000 },
      { id: 'q2', projectId: 'p1', supplierName: 'Gikondo Direct Depot', deliveryDays: 1, deliveryFeeMinor: 0, itemsTotalMinor: 245000, totalQuoteMinor: 245000 },
      { id: 'q3', projectId: 'p1', supplierName: 'Kicukiro Construction Store', deliveryDays: 3, deliveryFeeMinor: 20000, itemsTotalMinor: 260000, totalQuoteMinor: 280000 },
    ];

    const res = compareSupplierQuotes(quotes);
    const val = res.value;

    expect(val.lowestQuoteMinor).toBe(245000); // Gikondo Direct Depot
    expect(val.recommendedQuoteId).toBe('q2');
    expect(val.quotes.find((q) => q.id === 'q2')?.isRecommended).toBe(true);
    expect(val.averageQuoteMinor).toBe(Math.round((265000 + 245000 + 280000) / 3));
    expect(val.variancePercent).toBe(14); // (280k - 245k) / 245k = 14%
  });
});

describe('Phase 3 — Bill of Quantities (BoQ) & Project Cost Estimation', () => {
  it('calculates line item costs, contingency buffer, and compounds project inflation', () => {
    // Project: Perimeter Fencing
    // Material 1: 50 bags Cement at 11,500 RWF = 575,000 RWF
    // Material 2: Sand 3 trucks at 45,000 RWF = 135,000 RWF
    // Labor: 10 Mason days at 15,000 RWF = 150,000 RWF
    // Subtotal = 575k + 135k + 150k = 860,000 RWF
    // Contingency 10% = 86,000 RWF
    // Nominal Total = 946,000 RWF
    // Duration: 6 months (0.5 year) at 6% annual inflation
    // Inflation factor = (1.06)^0.5 = 1.02956
    // Adjusted Total = 946,000 * 1.02956 = 973,966 RWF
    // Inflation buffer = 27,966 RWF
    const res = calculateProjectBoQ({
      id: 'boq_1',
      name: 'Perimeter Wall Renovation',
      description: 'Masonry wall upgrade and plastering',
      category: 'renovation',
      startDate: '2026-11-01',
      durationMonths: 6,
      contingencyPercent: 10,
      inflationAnnualPercent: 6.0,
      items: [
        { id: '1', section: 'material', description: 'Portland Cement (50kg bags)', quantity: 50, unit: 'bag', unitRateMinor: 11500 },
        { id: '2', section: 'material', description: 'River Sand (Truckloads)', quantity: 3, unit: 'truck', unitRateMinor: 45000 },
        { id: '3', section: 'labor', description: 'Master Mason & Assistant Labor', quantity: 10, unit: 'day', unitRateMinor: 15000 },
      ],
    });

    const boq = res.value;

    expect(boq.subtotalMinor).toBe(860000);
    expect(boq.contingencyMinor).toBe(86000);
    expect(boq.nominalTotalMinor).toBe(946000);
    expect(boq.inflationAdjustedTotalMinor).toBe(973967);
    expect(boq.inflationBufferMinor).toBe(27967);
  });
});
