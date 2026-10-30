/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safeline — Personal Financial Engine
 * One authoritative deterministic calculation path for all financial metrics.
 * Uses exact integer minor units to eliminate floating-point money errors.
 */

import {
  Account,
  AffordabilityEvaluation,
  Bill,
  BudgetCategory,
  BudgetGroup,
  BudgetPeriod,
  BudgetWarning,
  CalculationExplanation,
  CalculationResult,
  CurrencyCode,
  DebtRecord,
  FinancialStageSummary,
  SafetyLineResult,
  SafetyState,
  Transaction,
  UserSettings,
  ZeroBasedBudgetResult,
} from '../types/finance';

const ENGINE_VERSION = '1.0.0-phase1';

/**
 * Formats integer minor units for display according to currency specifications
 * (e.g. 50000 RWF -> "50,000 FRw", 1250 USD -> "$12.50")
 */
export function formatMoney(amountMinorUnits: number, currency: CurrencyCode = 'RWF'): string {
  if (amountMinorUnits === null || amountMinorUnits === undefined || isNaN(amountMinorUnits)) {
    return '—';
  }

  const isRwfOrJpy = currency === 'RWF' || currency === 'JPY' || currency === 'UGX' || currency === 'TZS';
  const isNegative = amountMinorUnits < 0;
  const absAmount = Math.abs(Math.round(amountMinorUnits));

  if (isRwfOrJpy) {
    const formatted = absAmount.toLocaleString('en-US');
    if (currency === 'RWF') return `${isNegative ? '-' : ''}${formatted} FRw`;
    if (currency === 'JPY') return `${isNegative ? '-' : ''}¥${formatted}`;
    if (currency === 'UGX') return `${isNegative ? '-' : ''}USh ${formatted}`;
    if (currency === 'TZS') return `${isNegative ? '-' : ''}TSh ${formatted}`;
  }

  // 2 decimal places currencies (USD, EUR, GBP, KES)
  const majorUnits = Math.floor(absAmount / 100);
  const minorUnits = absAmount % 100;
  const formattedMajor = majorUnits.toLocaleString('en-US');
  const formattedMinor = minorUnits.toString().padStart(2, '0');
  const fullNum = `${formattedMajor}.${formattedMinor}`;

  if (currency === 'USD') return `${isNegative ? '-' : ''}$${fullNum}`;
  if (currency === 'EUR') return `${isNegative ? '-' : ''}€${fullNum}`;
  if (currency === 'GBP') return `${isNegative ? '-' : ''}£${fullNum}`;
  if (currency === 'KES') return `${isNegative ? '-' : ''}KSh ${fullNum}`;

  return `${isNegative ? '-' : ''}${fullNum} ${currency}`;
}

/**
 * Calculates Eligible Liquid Funds (L)
 * Sum of posted balances of accounts designated as liquid in the given currency.
 */
export function calculateEligibleLiquidFunds(
  accounts: Account[],
  currency: CurrencyCode
): CalculationResult<number> {
  const matchingAccounts = accounts.filter(
    (a) => a.currency === currency && a.isLiquid === true
  );

  let totalMinorUnits = 0;
  for (const acc of matchingAccounts) {
    totalMinorUnits += Math.round(acc.balance);
  }

  const explanation: CalculationExplanation = {
    metricName: 'Eligible Liquid Funds (L)',
    formulaVersion: ENGINE_VERSION,
    formula: 'L = Σ balance(Account[isLiquid=true, currency=C])',
    inputs: {
      currency,
      liquidAccountsCount: matchingAccounts.length,
      accountNames: matchingAccounts.map((a) => `${a.name} (${a.balance})`).join(', ') || 'None',
    },
    currency,
    sourceRecordCounts: { accounts: matchingAccounts.length },
    computationDate: new Date().toISOString(),
    caveats: matchingAccounts.length === 0 ? ['No eligible liquid accounts found for this currency.'] : [],
  };

  return { value: totalMinorUnits, explanation };
}

/**
 * Calculates Monthly Essential Expenses (E)
 * Sum of essential budget category allocations plus minimum monthly debt payments.
 */
export function calculateMonthlyEssentialExpenses(
  categories: BudgetCategory[],
  debts: DebtRecord[],
  currency: CurrencyCode
): CalculationResult<number> {
  // Essential category allocations normalized to monthly
  let essentialCategoryTotal = 0;
  const essentialCats = categories.filter((c) => c.isEssential);
  for (const cat of essentialCats) {
    const monthlyAllocation = cat.period === 'weekly' 
      ? Math.round(cat.allocatedAmount * 4.3333333333) // exact 52 / 12 weeks per month
      : Math.round(cat.allocatedAmount);
    essentialCategoryTotal += monthlyAllocation;
  }

  // Essential required minimum debt payments
  let debtPaymentsTotal = 0;
  const essentialDebts = debts.filter((d) => d.isEssential && d.principalRemaining > 0);
  for (const debt of essentialDebts) {
    debtPaymentsTotal += Math.round(debt.minimumMonthlyPayment);
  }

  const totalE = essentialCategoryTotal + debtPaymentsTotal;

  const explanation: CalculationExplanation = {
    metricName: 'Monthly Essential Expenses (E)',
    formulaVersion: ENGINE_VERSION,
    formula: 'E = Σ EssentialCategories(monthly) + Σ DebtMinimumPayments(isEssential=true)',
    inputs: {
      currency,
      essentialCategoriesTotal: essentialCategoryTotal,
      debtPaymentsTotal,
      essentialCategoriesCount: essentialCats.length,
      essentialDebtsCount: essentialDebts.length,
    },
    currency,
    period: 'monthly',
    sourceRecordCounts: {
      categories: essentialCats.length,
      debts: essentialDebts.length,
    },
    computationDate: new Date().toISOString(),
    caveats: essentialCats.length === 0 && essentialDebts.length === 0 
      ? ['No essential categories or debts defined; essential expenses calculated as 0.']
      : [],
  };

  return { value: totalE, explanation };
}

/**
 * Calculates Essential Bills Due Before Next Reliable Income (U)
 * Only unpaid essential bills that fall before the next reliable income date and are not already in E.
 */
export function calculateEssentialBillsDueBeforeNextIncome(
  bills: Bill[],
  nextIncomeDate: string | null,
  currency: CurrencyCode
): CalculationResult<number> {
  const now = new Date();
  const nextIncome = nextIncomeDate ? new Date(nextIncomeDate) : null;

  let totalU = 0;
  const qualifyingBills: Bill[] = [];

  for (const bill of bills) {
    if (!bill.isEssential || bill.isPaid) continue;

    const due = new Date(bill.dueDate);
    // If no next income date provided, count unpaid essential bills due in next 14 days
    const isDueBeforeIncome = nextIncome 
      ? due <= nextIncome 
      : (due.getTime() - now.getTime()) <= 14 * 24 * 60 * 60 * 1000;

    if (isDueBeforeIncome) {
      totalU += Math.round(bill.amount);
      qualifyingBills.push(bill);
    }
  }

  const explanation: CalculationExplanation = {
    metricName: 'Essential Bills Due Before Next Reliable Income (U)',
    formulaVersion: ENGINE_VERSION,
    formula: 'U = Σ Bill[isEssential=true, isPaid=false, dueDate <= nextReliableIncomeDate]',
    inputs: {
      currency,
      nextIncomeDate: nextIncomeDate || 'Not specified (assumed 14-day default horizon)',
      qualifyingBillsCount: qualifyingBills.length,
    },
    currency,
    sourceRecordCounts: { bills: qualifyingBills.length },
    computationDate: new Date().toISOString(),
  };

  return { value: totalU, explanation };
}

export interface SafetyLineInput {
  accounts: Account[];
  categories: BudgetCategory[];
  bills: Bill[];
  debts: DebtRecord[];
  transactions: Transaction[];
  settings: UserSettings;
}

/**
 * Authoritative Personal Financial Safety Line Calculation
 * F = E + U (Safety floor)
 * S = E * M + U + R (Safety target)
 * P = Lowest projected balance over 30 days
 */
export function calculateSafetyLine(input: SafetyLineInput): CalculationResult<SafetyLineResult> {
  const { accounts, categories, bills, debts, transactions, settings } = input;
  const currency = settings.currency;

  const L_res = calculateEligibleLiquidFunds(accounts, currency);
  const L = L_res.value;

  const E_res = calculateMonthlyEssentialExpenses(categories, debts, currency);
  const E = E_res.value;

  const U_res = calculateEssentialBillsDueBeforeNextIncome(bills, settings.nextReliableIncomeDate, currency);
  const U = U_res.value;

  const R = Math.max(0, Math.round(settings.additionalReserve || 0));
  const M = Math.max(1, settings.safetyMultiplier || 1);

  // Safety Floor F = E + U
  const F = E + U;

  // Safety Target S = E * M + U + R
  const S = Math.round(E * M) + U + R;

  // Calculate 30-day projected minimum balance P
  // Start at L, subtract unpaid bills due within 30 days, add reliably recurring confirmed income
  const now = new Date();
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Unpaid bills due in 30 days
  let pendingBillsTotal = 0;
  let hasOverdueUnpayableBill = false;

  for (const bill of bills) {
    if (bill.isPaid) continue;
    const due = new Date(bill.dueDate);
    if (due <= thirtyDaysOut) {
      pendingBillsTotal += Math.round(bill.amount);
      // Check if any overdue essential bill cannot be covered right now
      if (bill.isEssential && due < now && bill.amount > L) {
        hasOverdueUnpayableBill = true;
      }
    }
  }

  // Reliable recurring income posted/scheduled in 30 days
  let upcomingReliableIncome = 0;
  // If irregular mode is OFF, look at recurring transactions or expected regular income
  if (!settings.irregularIncomeMode) {
    const recurringIncomes = transactions.filter(
      (t) => t.type === 'income' && !t.isIrregular && t.status === 'posted'
    );
    if (recurringIncomes.length > 0) {
      // Estimate monthly regular income based on recent posted regular income
      upcomingReliableIncome = recurringIncomes.reduce((acc, t) => acc + t.amount, 0);
    }
  }

  // 30-day projected balance minimum
  const P = Math.max(0, L - pendingBillsTotal + Math.min(upcomingReliableIncome, E));

  // Determine Safety State:
  // Recovery: L < F OR P < F OR an essential due bill cannot be paid
  // Caution: not Recovery, but L < S OR P < S
  // Safe: L >= S AND P >= S
  let state: SafetyState = 'Safe';
  let stateReason = 'Liquid funds and projected balance meet or exceed your safety target.';

  if (L < F || P < F || hasOverdueUnpayableBill) {
    state = 'Recovery';
    if (hasOverdueUnpayableBill) {
      stateReason = 'A critical essential bill is due or overdue and cannot be covered by current liquid funds.';
    } else if (L < F) {
      stateReason = `Liquid funds (${formatMoney(L, currency)}) are below the safety floor F (${formatMoney(F, currency)}).`;
    } else {
      stateReason = `30-day projected balance (${formatMoney(P, currency)}) drops below the safety floor F (${formatMoney(F, currency)}).`;
    }
  } else if (L < S || P < S) {
    state = 'Caution';
    stateReason = `Funds exceed the essential floor F (${formatMoney(F, currency)}) but are below the safety target S (${formatMoney(S, currency)}).`;
  }

  const result: SafetyLineResult = {
    L,
    E,
    U,
    R,
    F,
    S,
    P,
    state,
    stateReason,
  };

  const explanation: CalculationExplanation = {
    metricName: 'Personal Financial Safety Line',
    formulaVersion: ENGINE_VERSION,
    formula: 'Safety Floor F = E + U; Safety Target S = (E × M) + U + R; P = min(30-day projected balance)',
    inputs: {
      L,
      E,
      U,
      R,
      M,
      F,
      S,
      P,
      currency,
      irregularIncomeMode: settings.irregularIncomeMode,
      hasOverdueUnpayableBill,
    },
    currency,
    computationDate: new Date().toISOString(),
    caveats: [
      'Estimates, not financial advice.',
      'Safety floor F is a resilience benchmark, not locked money.',
    ],
  };

  return { value: result, explanation };
}

export interface ZeroBasedBudgetInput {
  categories: BudgetCategory[];
  transactions: Transaction[];
  accounts: Account[];
  settings: UserSettings;
  period?: BudgetPeriod;
}

/**
 * Feature 1 & 2: Authoritative Zero-Based Budget Calculation
 * Unassigned Money = Available Budget Money − Total Active Allocations
 * In Irregular Income mode: only posted, received income is counted as available money!
 */
export function calculateZeroBasedBudget(
  input: ZeroBasedBudgetInput
): CalculationResult<ZeroBasedBudgetResult> {
  const { categories, transactions, accounts, settings, period = 'monthly' } = input;
  const currency = settings.currency;

  // 1. Calculate Available Budget Money
  // If Irregular Income Mode is active: ONLY posted income (status === 'posted', isExpectedOnly !== true)
  // Speculative or unposted income is strictly excluded!
  let availableBudgetMoney = 0;
  const receivedIncomeTxs: Transaction[] = [];
  const expectedIncomeTxs: Transaction[] = [];

  for (const t of transactions) {
    if (t.type !== 'income' || t.status === 'reversed') continue;

    if (t.status === 'posted' && !t.isExpectedOnly) {
      receivedIncomeTxs.push(t);
    } else {
      expectedIncomeTxs.push(t);
    }
  }

  if (settings.irregularIncomeMode) {
    // Irregular Income Mode: budget ONLY actual received posted income
    for (const t of receivedIncomeTxs) {
      availableBudgetMoney += Math.round(t.amount);
    }
  } else {
    // Regular Mode: Sum of posted income, or if no posted income this period, available liquid funds
    const totalPostedIncome = receivedIncomeTxs.reduce((acc, t) => acc + Math.round(t.amount), 0);
    if (totalPostedIncome > 0) {
      availableBudgetMoney = totalPostedIncome;
    } else {
      // In absence of explicit income record, eligible liquid funds provide baseline
      const liquidFunds = calculateEligibleLiquidFunds(accounts, currency).value;
      availableBudgetMoney = Math.max(0, liquidFunds);
    }
  }

  // 2. Active Allocations for the selected period
  const activeCategories = categories.filter((c) => c.period === period);
  let totalAllocated = 0;

  const allocationsByGroup: Record<BudgetGroup, { allocated: number; spent: number; remaining: number }> = {
    needs: { allocated: 0, spent: 0, remaining: 0 },
    goals: { allocated: 0, spent: 0, remaining: 0 },
    fun: { allocated: 0, spent: 0, remaining: 0 },
    savings: { allocated: 0, spent: 0, remaining: 0 },
  };

  for (const cat of activeCategories) {
    const alloc = Math.round(cat.allocatedAmount || 0);
    totalAllocated += alloc;
    allocationsByGroup[cat.group].allocated += alloc;
  }

  // 3. Category spending from posted and pending transactions
  const categorySpending: Record<string, { posted: number; pending: number }> = {};
  for (const cat of activeCategories) {
    categorySpending[cat.id] = { posted: 0, pending: 0 };
  }

  for (const t of transactions) {
    if (t.type !== 'expense' || t.status === 'reversed') continue;
    if (categorySpending[t.categoryId]) {
      if (t.status === 'posted') {
        categorySpending[t.categoryId].posted += Math.round(t.amount);
      } else if (t.status === 'pending') {
        categorySpending[t.categoryId].pending += Math.round(t.amount);
      }
    }
  }

  const categoryBreakdown = activeCategories.map((category) => {
    const allocated = Math.round(category.allocatedAmount || 0);
    const spent = categorySpending[category.id]?.posted || 0;
    const pendingSpent = categorySpending[category.id]?.pending || 0;
    const remaining = allocated - spent;
    const percentageSpent = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

    allocationsByGroup[category.group].spent += spent;
    allocationsByGroup[category.group].remaining += remaining;

    return {
      category,
      allocated,
      spent,
      pendingSpent,
      remaining,
      percentageSpent,
    };
  });

  // 4. Fundamental Zero-Based Budget Calculation:
  // Unassigned Money = Available Budget Money − Total Active Allocations
  const unassignedMoney = availableBudgetMoney - totalAllocated;
  const isOverAllocated = unassignedMoney < 0;

  const result: ZeroBasedBudgetResult = {
    availableBudgetMoney,
    totalAllocated,
    unassignedMoney,
    isOverAllocated,
    allocationsByGroup,
    categoryBreakdown,
  };

  const explanation: CalculationExplanation = {
    metricName: 'Zero-Based Budget Allocation',
    formulaVersion: ENGINE_VERSION,
    formula: 'Unassigned Money = Available Budget Money − Total Active Allocations',
    inputs: {
      availableBudgetMoney,
      totalAllocated,
      unassignedMoney,
      period,
      currency,
      irregularIncomeMode: settings.irregularIncomeMode,
      receivedIncomeRecords: receivedIncomeTxs.length,
      excludedExpectedIncomeRecords: expectedIncomeTxs.length,
    },
    currency,
    period,
    sourceRecordCounts: {
      categories: activeCategories.length,
      transactions: transactions.length,
    },
    computationDate: new Date().toISOString(),
    caveats: [
      'Exact integer arithmetic used.',
      'Planned allocations are intentions and do not alter actual account balances.',
      settings.irregularIncomeMode
        ? 'Irregular Income Mode: Expected/unposted income is strictly excluded from spendable money.'
        : 'Regular Budgeting Mode active.',
    ],
  };

  return { value: result, explanation };
}

/**
 * Feature 3A: Spending Guardrails — Budget Warnings
 * Warns at 80% and 100% of category limits.
 * Distinguishes posted from pending transactions.
 */
export function calculateBudgetWarnings(
  categories: BudgetCategory[],
  transactions: Transaction[],
  period: BudgetPeriod = 'monthly'
): BudgetWarning[] {
  const activeCategories = categories.filter((c) => c.period === period);
  const warnings: BudgetWarning[] = [];

  // Group transactions by category
  const spentByCat: Record<string, { posted: number; pending: number }> = {};
  for (const cat of activeCategories) {
    spentByCat[cat.id] = { posted: 0, pending: 0 };
  }

  for (const t of transactions) {
    if (t.type !== 'expense' || t.status === 'reversed') continue;
    if (spentByCat[t.categoryId]) {
      if (t.status === 'posted') {
        spentByCat[t.categoryId].posted += Math.round(t.amount);
      } else if (t.status === 'pending') {
        spentByCat[t.categoryId].pending += Math.round(t.amount);
      }
    }
  }

  for (const cat of activeCategories) {
    const limit = Math.round(cat.allocatedAmount || 0);
    if (limit <= 0) continue;

    const posted = spentByCat[cat.id]?.posted || 0;
    const pending = spentByCat[cat.id]?.pending || 0;
    const totalSpent = posted + pending;
    const remaining = limit - posted;
    const percentageUsed = Math.round((posted / limit) * 100);

    if (percentageUsed >= 100) {
      warnings.push({
        categoryId: cat.id,
        categoryName: cat.name,
        budgetGroup: cat.group,
        limit,
        spentPosted: posted,
        spentPending: pending,
        totalSpent,
        remaining,
        percentageUsed,
        severity: 'EXCEEDED_100',
        message: `${cat.name} budget has reached 100% capacity (${percentageUsed}% used). Spent ${posted} of ${limit}.`,
      });
    } else if (percentageUsed >= 80) {
      warnings.push({
        categoryId: cat.id,
        categoryName: cat.name,
        budgetGroup: cat.group,
        limit,
        spentPosted: posted,
        spentPending: pending,
        totalSpent,
        remaining,
        percentageUsed,
        severity: 'WARNING_80',
        message: `${cat.name} budget is at ${percentageUsed}% (${remaining} remaining of ${limit}).`,
      });
    }
  }

  return warnings;
}

export interface AffordabilityInput {
  purchaseCost: number; // integer minor units
  categoryId: string;
  accounts: Account[];
  categories: BudgetCategory[];
  bills: Bill[];
  debts: DebtRecord[];
  transactions: Transaction[];
  settings: UserSettings;
}

/**
 * Feature 3B & 3D: "Can I afford this?" Checker
 * Non-destructive simulation evaluating category budget, liquid funds, and safety impact.
 */
export function evaluateAffordability(input: AffordabilityInput): AffordabilityEvaluation {
  const { purchaseCost, categoryId, accounts, categories, bills, debts, transactions, settings } = input;
  const currency = settings.currency;
  const cost = Math.max(0, Math.round(purchaseCost));

  const targetCategory = categories.find((c) => c.id === categoryId);
  const categoryName = targetCategory ? targetCategory.name : 'Uncategorized';

  // 1. Current Safety Line baseline
  const currentSafety = calculateSafetyLine({
    accounts,
    categories,
    bills,
    debts,
    transactions,
    settings,
  }).value;

  // 2. Work Hours calculation
  const workHoursRes = calculateWorkHours(cost, settings.netHourlyEarnings);
  const workHoursCost = workHoursRes.value;

  // 3. Category budget remaining before simulation
  const budgetResult = calculateZeroBasedBudget({
    categories,
    transactions,
    accounts,
    settings,
  }).value;

  const targetCatBreakdown = budgetResult.categoryBreakdown.find((b) => b.category.id === categoryId);
  const categoryRemainingBefore = targetCatBreakdown ? targetCatBreakdown.remaining : 0;
  const categoryRemainingAfter = categoryRemainingBefore - cost;

  // 4. Simulated liquid funds and safety line after purchase
  const liquidBefore = currentSafety.L;
  const liquidAfter = liquidBefore - cost;

  // Simulated safety line calculation
  const simulatedAccounts = accounts.map((acc) => {
    if (acc.isLiquid) {
      // deduct from first liquid account for simulation purposes
      return { ...acc, balance: acc.balance - cost };
    }
    return acc;
  });

  const simulatedSafety = calculateSafetyLine({
    accounts: simulatedAccounts,
    categories,
    bills,
    debts,
    transactions,
    settings,
  }).value;

  const reasons: string[] = [];
  let status: AffordabilityEvaluation['status'] = 'WITHIN_BUDGET';
  let headline = 'Affordable within your budget';
  let canAfford = true;

  if (cost <= 0) {
    status = 'INSUFFICIENT_INFORMATION';
    headline = 'Enter a purchase amount';
    canAfford = false;
    reasons.push('Purchase amount must be greater than zero.');
  } else if (liquidAfter < 0) {
    status = 'RISK_CROSSING_SAFETY_FLOOR';
    headline = 'Insufficient liquid funds';
    canAfford = false;
    reasons.push(`Available liquid funds (${formatMoney(liquidBefore, currency)}) are less than the purchase cost (${formatMoney(cost, currency)}).`);
  } else if (liquidAfter < currentSafety.F || simulatedSafety.state === 'Recovery') {
    status = 'RISK_CROSSING_SAFETY_FLOOR';
    headline = 'Risk of crossing your Safety Floor';
    canAfford = false;
    reasons.push(`This purchase would reduce liquid funds to ${formatMoney(liquidAfter, currency)}, falling below your Safety Floor of ${formatMoney(currentSafety.F, currency)}.`);
    reasons.push('Safety state would drop to Recovery.');
  } else if (targetCategory && categoryRemainingAfter < 0) {
    status = 'OUTSIDE_BUDGET';
    headline = `Exceeds ${categoryName} budget`;
    canAfford = false;
    reasons.push(`Purchase exceeds the remaining ${categoryName} budget (${formatMoney(categoryRemainingBefore, currency)}) by ${formatMoney(Math.abs(categoryRemainingAfter), currency)}.`);
    if (liquidAfter >= currentSafety.S) {
      reasons.push('You have enough liquid reserve, but you would need to adjust your budget allocations first.');
    }
  } else if (liquidAfter < currentSafety.S) {
    status = 'AFFORDABLE_REDUCES_MARGIN';
    headline = 'Affordable, but reduces safety margin';
    canAfford = true;
    reasons.push(`Within category budget, but drops liquid funds below the Safety Target (${formatMoney(currentSafety.S, currency)}).`);
    reasons.push('Safety state will shift to Caution.');
  } else {
    status = 'WITHIN_BUDGET';
    headline = 'Comfortably within budget & safety margins';
    canAfford = true;
    reasons.push(`Within the ${categoryName} budget (${formatMoney(categoryRemainingAfter, currency)} remaining after purchase).`);
    reasons.push(`Liquid funds (${formatMoney(liquidAfter, currency)}) remain comfortably at or above Safety Target (${formatMoney(currentSafety.S, currency)}).`);
  }

  const advisoryNote = 'Estimates, not financial advice. This simulation is purely advisory and does not post any transaction or lock any money.';

  const explanation: CalculationExplanation = {
    metricName: 'Affordability Assessment',
    formulaVersion: ENGINE_VERSION,
    formula: 'Simulated Liquid = L - PurchaseCost; Compared against Safety Floor F and Target S; Category Remaining = Allocated - Spent - PurchaseCost',
    inputs: {
      purchaseCost: cost,
      categoryId,
      categoryName,
      liquidBefore,
      liquidAfter,
      safetyFloor: currentSafety.F,
      safetyTarget: currentSafety.S,
      categoryRemainingBefore,
      categoryRemainingAfter,
      netHourlyEarnings: settings.netHourlyEarnings,
      currency,
    },
    currency,
    computationDate: new Date().toISOString(),
    caveats: [
      advisoryNote,
      'No transactions or bank transfers are created.',
    ],
  };

  return {
    status,
    statusLabel: status.replace(/_/g, ' '),
    headline,
    canAfford,
    cost,
    categoryId,
    categoryName,
    categoryRemainingBefore,
    categoryRemainingAfter,
    liquidBefore,
    liquidAfter,
    safetyFloor: currentSafety.F,
    safetyTarget: currentSafety.S,
    safetyStateBefore: currentSafety.state,
    safetyStateAfter: simulatedSafety.state,
    workHoursCost,
    reasons,
    advisoryNote,
    explanation,
  };
}

/**
 * Feature 3D: Cost in Work Hours
 * Formula: Work Hours = Purchase Amount ÷ Net Hourly Earnings
 */
export function calculateWorkHours(
  purchaseAmount: number,
  netHourlyEarnings: number | null
): CalculationResult<number | null> {
  if (!netHourlyEarnings || netHourlyEarnings <= 0 || purchaseAmount <= 0) {
    const explanation: CalculationExplanation = {
      metricName: 'Cost in Work Hours',
      formulaVersion: ENGINE_VERSION,
      formula: 'Work Hours = Purchase Amount ÷ Net Hourly Earnings',
      inputs: {
        purchaseAmount,
        netHourlyEarnings: netHourlyEarnings ?? null,
      },
      currency: 'RWF',
      computationDate: new Date().toISOString(),
      missingDataNotes: [
        'Net hourly earnings is not configured or <= 0.',
        'Configure your hourly wage in Settings to see hours of work represented by purchases.',
      ],
      caveats: ['Estimates, not financial advice. This figure is factual context, not a judgment on purchase value.'],
    };
    return { value: null, explanation };
  }

  // Exact division rounded to 1 decimal place
  const hours = Math.round((purchaseAmount / netHourlyEarnings) * 10) / 10;

  const explanation: CalculationExplanation = {
    metricName: 'Cost in Work Hours',
    formulaVersion: ENGINE_VERSION,
    formula: 'Work Hours = Purchase Amount ÷ Net Hourly Earnings',
    inputs: {
      purchaseAmount,
      netHourlyEarnings,
      calculatedHours: hours,
    },
    currency: 'RWF',
    computationDate: new Date().toISOString(),
    caveats: ['Estimates, not financial advice. Factual computation without moral judgment.'],
  };

  return { value: hours, explanation };
}

export interface FinancialStageInput {
  accounts: Account[];
  debts: DebtRecord[];
  settings: UserSettings;
}

/**
 * Feature 4: Financial Stage Tracker
 * Stage 1: Emergency Fund
 * Stage 2: Debt Organization and Reduction
 * Stage 3: Investing Foundations
 */
export function calculateFinancialStages(input: FinancialStageInput): FinancialStageSummary {
  const { accounts, debts, settings } = input;
  const currency = settings.currency;

  // Stage 1: Emergency Fund
  // Uses eligible liquid accounts (avoiding double counting with other categories)
  const liquidFunds = calculateEligibleLiquidFunds(accounts, currency).value;
  const target = Math.max(0, Math.round(settings.emergencyFundTarget || 0));
  const currentBalance = Math.min(target > 0 ? target : liquidFunds, liquidFunds);
  const remaining = Math.max(0, target - currentBalance);
  const hasTarget = target > 0;
  const progressPercentage = hasTarget 
    ? Math.min(100, Math.round((currentBalance / target) * 100))
    : null;
  const isComplete = hasTarget && currentBalance >= target;

  // Stage 2: Debt
  let totalPrincipal = 0;
  let totalAccruedInterest = 0;
  let totalFees = 0;
  let totalRequiredMonthly = 0;
  let activeDebtsCount = 0;

  for (const debt of debts) {
    if (debt.principalRemaining > 0) {
      activeDebtsCount++;
      totalPrincipal += Math.round(debt.principalRemaining);
      totalAccruedInterest += Math.round(debt.accruedInterest || 0);
      totalFees += Math.round(debt.fees || 0);
      totalRequiredMonthly += Math.round(debt.minimumMonthlyPayment || 0);
    }
  }

  const isDebtFree = activeDebtsCount === 0;

  // Stage 3: Investing
  // Unlocked when Stage 1 has foundational progress and no overdue unpayable debts
  const isUnlocked = isComplete || (isDebtFree && liquidFunds > 0);
  const milestoneAchieved = settings.investingMilestoneReached || false;
  const goalDescription = settings.investingGoalDescription || 'Long-term diversified wealth accumulation';

  return {
    stage1: {
      name: 'Stage 1 — Emergency Fund',
      target,
      currentBalance,
      remaining,
      progressPercentage,
      isComplete,
      hasTarget,
    },
    stage2: {
      name: 'Stage 2 — Debt Reduction',
      totalPrincipal,
      totalAccruedInterest,
      totalFees,
      totalRequiredMonthly,
      debtCount: activeDebtsCount,
      strategy: settings.debtPayoffStrategy || 'snowball',
      isDebtFree,
    },
    stage3: {
      name: 'Stage 3 — Investing Foundations',
      isUnlocked,
      milestoneAchieved,
      goalDescription,
    },
  };
}
