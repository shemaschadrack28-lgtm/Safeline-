/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safeline — Phase 4: The Financial Intelligence & Advisory Wizard Engine
 * 
 * Deterministic Financial Health Scorecard (0–100) across 5 pillars
 * "What-If?" Scenario Stress Tester (Income, Emergency, Inflation Shocks)
 * Debt Freedom Optimizer (Snowball vs Avalanche + Extra Accelerator)
 * Cash Flow Runway Forecaster (30, 60, 90, 180 Days)
 * Actionable Guided Playbooks ("The Wizard's Prescriptions")
 * 
 * Rules:
 * - Integer minor units for all money amounts.
 * - Deterministic, auditable formulas.
 * - Always includes "Estimates, not financial advice."
 */

import { 
  Account, 
  Bill, 
  BudgetCategory, 
  CalculationExplanation, 
  CashFlowRunwayProjection, 
  DebtPayoffComparison, 
  DebtPayoffPlan, 
  DebtRecord, 
  FinancialHealthScore, 
  FinancialPlaybook, 
  HealthPillarScore, 
  InflationAdjustedGoal, 
  PlaybookStep, 
  RunwayDayPoint, 
  SafetyState, 
  ScenarioShockInput, 
  ScenarioSimulationResult, 
  Transaction, 
  UserSettings 
} from '../types/finance';
import { 
  calculateBudgetWarnings, 
  calculateEligibleLiquidFunds, 
  calculateSafetyLine, 
  calculateZeroBasedBudget, 
  formatMoney 
} from './financialEngine';
import { calculatePersonalInflation } from './inflationEngine';

// ========================================================
// 1. FINANCIAL HEALTH SCORECARD (0–100)
// ========================================================

export interface HealthScoreInput {
  accounts: Account[];
  categories: BudgetCategory[];
  bills: Bill[];
  debts: DebtRecord[];
  transactions: Transaction[];
  goals: InflationAdjustedGoal[];
  settings: UserSettings;
}

export function calculateFinancialHealthScore(input: HealthScoreInput): {
  value: FinancialHealthScore;
  explanation: CalculationExplanation;
} {
  const { accounts, categories, bills, debts, transactions, goals, settings } = input;
  const safetyLine = calculateSafetyLine({ accounts, categories, bills, debts, transactions, settings }).value;
  const budget = calculateZeroBasedBudget({ categories, transactions, accounts, settings, period: 'monthly' }).value;
  const personalInf = calculatePersonalInflation(categories, transactions);
  const warnings = calculateBudgetWarnings(categories, transactions, 'monthly');

  const L = safetyLine.L;
  const F = safetyLine.F;
  const S = safetyLine.S;

  // PILLAR 1: Liquidity & Safety Floor Defense (Max: 25)
  let p1Score = 0;
  if (S > 0 && L >= S) {
    p1Score = 25;
  } else if (F > 0 && L >= F) {
    const margin = S - F;
    const progress = margin > 0 ? (L - F) / margin : 1;
    p1Score = Math.round(15 + 10 * Math.min(1, Math.max(0, progress)));
  } else if (F > 0) {
    p1Score = Math.round(15 * Math.min(1, Math.max(0, L / F)));
  } else {
    p1Score = L > 0 ? 25 : 5;
  }
  const pillarLiquidity: HealthPillarScore = {
    name: 'Liquidity & Safety Buffer',
    score: Math.min(25, Math.max(0, p1Score)),
    maxScore: 25,
    percentage: Math.round((p1Score / 25) * 100),
    status: p1Score >= 20 ? 'optimal' : p1Score >= 14 ? 'moderate' : 'needs_attention',
    headline: L >= S ? 'Fully Fortified above Target S' : L >= F ? 'Safely above Floor F' : 'Below Safety Floor F',
    recommendation: L < F 
      ? 'Prioritize defense of Safety Floor F before any non-essential spending.' 
      : L < S 
      ? 'Build surplus cash towards Safety Target S to withstand unforeseen shocks.' 
      : 'Maintain liquid buffer and deploy excess surplus to high-yield or debt prepayment.',
  };

  // PILLAR 2: Debt Burden & Solvency (Max: 20)
  const totalPrincipal = debts.reduce((sum, d) => sum + d.principal, 0);
  const totalMonthlyDebtService = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  let p2Score = 0;
  if (debts.length === 0 || totalPrincipal === 0) {
    p2Score = 20;
  } else {
    // Score based on monthly debt service relative to safety floor
    const debtRatio = F > 0 ? totalMonthlyDebtService / F : 0.5;
    if (debtRatio <= 0.15) {
      p2Score = 17;
    } else if (debtRatio <= 0.35) {
      p2Score = 13;
    } else if (debtRatio <= 0.50) {
      p2Score = 9;
    } else {
      p2Score = 4;
    }
  }
  const pillarDebt: HealthPillarScore = {
    name: 'Debt Burden & Solvency',
    score: p2Score,
    maxScore: 20,
    percentage: Math.round((p2Score / 20) * 100),
    status: p2Score >= 16 ? 'optimal' : p2Score >= 10 ? 'moderate' : 'needs_attention',
    headline: debts.length === 0 ? 'Debt Free' : `${debts.length} active obligation(s) totaling ${formatMoney(totalPrincipal, settings.currency)}`,
    recommendation: debts.length === 0
      ? 'Solvent with no debt service drag.'
      : 'Accelerate debt payoff using Avalanche (high APR) or Snowball to free up monthly cash flow.',
  };

  // PILLAR 3: Savings & Goal Momentum (Max: 20)
  let p3Score = 0;
  if (goals.length > 0) {
    const avgProgress = goals.reduce((sum, g) => sum + g.progressPercent, 0) / goals.length;
    p3Score = Math.round(10 + 10 * (Math.min(100, avgProgress) / 100));
  } else {
    // Check if reserve account has funds
    const reserveAccounts = accounts.filter(a => !a.isLiquid);
    const reserveBal = reserveAccounts.reduce((sum, a) => sum + a.balance, 0);
    p3Score = reserveBal > 0 ? 12 : 6;
  }
  const pillarSavings: HealthPillarScore = {
    name: 'Savings & Goals Momentum',
    score: Math.min(20, Math.max(0, p3Score)),
    maxScore: 20,
    percentage: Math.round((p3Score / 20) * 100),
    status: p3Score >= 15 ? 'optimal' : p3Score >= 10 ? 'moderate' : 'needs_attention',
    headline: goals.length > 0 ? `${goals.length} active inflation-adjusted target(s)` : 'No active goals recorded',
    recommendation: goals.length > 0
      ? 'Keep contributing to inflation-hedged capital goals.'
      : 'Define at least one milestone goal (e.g. SACCO shares, emergency capital) to track progress.',
  };

  // PILLAR 4: Inflation Resilience (Max: 15)
  let p4Score = 0;
  const diff = personalInf.differencePercent; // positive = personal inflation higher than benchmark
  if (diff <= -1.0) {
    p4Score = 15; // beating benchmark nicely
  } else if (diff <= 0.5) {
    p4Score = 13; // on par with national benchmark
  } else if (diff <= 2.5) {
    p4Score = 9; // moderately vulnerable to high inflation categories
  } else {
    p4Score = 5; // heavily concentrated in high inflation baskets
  }
  const pillarInflation: HealthPillarScore = {
    name: 'Inflation Resilience',
    score: p4Score,
    maxScore: 15,
    percentage: Math.round((p4Score / 15) * 100),
    status: p4Score >= 12 ? 'optimal' : p4Score >= 8 ? 'moderate' : 'needs_attention',
    headline: `${personalInf.personalInflationPercent}% vs ${personalInf.nisrBenchmarkPercent}% NISR Benchmark`,
    recommendation: diff > 1.0
      ? 'Your spending is concentrated in rapidly inflating categories (e.g. transport, food). Use price memory to optimize shop choices.'
      : 'Healthy purchasing-power defense aligned with or below the national benchmark.',
  };

  // PILLAR 5: Budget Discipline & Guardrails (Max: 20)
  let p5Score = 10;
  // Is money fully assigned? (Zero-based rule)
  if (budget.unassignedMoney === 0) {
    p5Score += 5;
  } else if (budget.unassignedMoney > 0) {
    p5Score += 2; // unassigned money is better than over-allocated
  }
  // Are any categories overspent (>100%)?
  const exceededCount = warnings.filter(w => w.severity === 'EXCEEDED_100').length;
  if (exceededCount === 0) {
    p5Score += 5;
  } else if (exceededCount === 1) {
    p5Score += 2;
  }
  const pillarBudget: HealthPillarScore = {
    name: 'Budget Discipline & Guardrails',
    score: Math.min(20, Math.max(0, p5Score)),
    maxScore: 20,
    percentage: Math.round((p5Score / 20) * 100),
    status: p5Score >= 16 ? 'optimal' : p5Score >= 11 ? 'moderate' : 'needs_attention',
    headline: exceededCount > 0 ? `${exceededCount} category over 100% cap` : 'Zero categories exceeded',
    recommendation: exceededCount > 0
      ? 'Adjust category allocations to honor zero-based balance and stop over-budget leaks.'
      : 'Disciplined allocation adherence across Needs, Goals, Fun, and Reserves.',
  };

  const overallScore = Math.min(100, Math.max(0, p1Score + p2Score + p3Score + p4Score + p5Score));
  
  let tier: FinancialHealthScore['tier'] = 'caution';
  let tierLabel = 'Caution — Buffer Building Needed';
  if (overallScore >= 85) {
    tier = 'fortified';
    tierLabel = 'Fortified & Secure';
  } else if (overallScore >= 65) {
    tier = 'resilient';
    tierLabel = 'Resilient & Steady';
  } else if (overallScore < 45) {
    tier = 'critical';
    tierLabel = 'Recovery & Floor Defense';
  }

  // Key strengths & risks
  const keyStrengths: string[] = [];
  const keyRisks: string[] = [];
  const prioritizedActions: string[] = [];

  if (p1Score >= 20) keyStrengths.push('Robust liquid buffer exceeding Safety Target S');
  else keyRisks.push('Liquid buffer is below Safety Target S, vulnerable to emergencies');

  if (p2Score >= 16) keyStrengths.push('Low or zero debt drag on monthly cash flow');
  else keyRisks.push(`Debt service commitments consume significant monthly essential cash flow`);

  if (p4Score >= 12) keyStrengths.push('Spending structure is resilient against NISR inflation');
  else keyRisks.push('High exposure to rapidly escalating retail consumer goods categories');

  if (p5Score >= 16) keyStrengths.push('Zero-based budgeting rigorously disciplined');
  else keyRisks.push('Unassigned funds or exceeded category caps detected');

  if (L < F) {
    prioritizedActions.push('Halt all discretionary fun allocations until liquid funds restore Safety Floor F.');
  }
  if (budget.unassignedMoney > 0) {
    prioritizedActions.push(`Assign remaining ${formatMoney(budget.unassignedMoney, settings.currency)} in zero-based budget.`);
  }
  if (debts.length > 0) {
    prioritizedActions.push('Deploy Avalanche method to aggressively eliminate highest interest rate debt.');
  }
  if (goals.length === 0) {
    prioritizedActions.push('Establish a 1-year capital preservation goal hedged against inflation.');
  }

  const result: FinancialHealthScore = {
    overallScore,
    tier,
    tierLabel,
    pillars: {
      liquidity: pillarLiquidity,
      debt: pillarDebt,
      savings: pillarSavings,
      inflationResilience: pillarInflation,
      budgetDiscipline: pillarBudget,
    },
    keyStrengths: keyStrengths.length > 0 ? keyStrengths : ['Baseline accounts operational'],
    keyRisks: keyRisks.length > 0 ? keyRisks : ['No acute financial hazards detected'],
    prioritizedActions: prioritizedActions.slice(0, 3),
    calculatedAt: new Date().toISOString(),
  };

  const explanation: CalculationExplanation = {
    title: 'Safeline Financial Health Score (0–100)',
    formula: 'Overall Score = Liquidity (25) + Debt (20) + Savings (20) + Inflation (15) + Budget (20)',
    inputs: [
      { label: 'Liquidity Score', value: `${p1Score}/25 pts` },
      { label: 'Debt & Solvency Score', value: `${p2Score}/20 pts` },
      { label: 'Savings & Goals Score', value: `${p3Score}/20 pts` },
      { label: 'Inflation Resilience Score', value: `${p4Score}/15 pts` },
      { label: 'Budget Discipline Score', value: `${p5Score}/20 pts` },
      { label: 'Total Composite Score', value: `${overallScore}/100 pts` },
    ],
    engineVersion: 'Safeline Wizard Engine v4.0.0',
    caveats: [
      'Estimates, not financial advice.',
      'Deterministic model evaluating posted financial records against Safeline Safety Line principles.',
    ],
    calculatedAt: result.calculatedAt,
  };

  return { value: result, explanation };
}

// ========================================================
// 2. "WHAT-IF?" SCENARIO STRESS TESTER
// ========================================================

export function simulateScenarioStress(
  input: HealthScoreInput,
  shock: ScenarioShockInput
): {
  value: ScenarioSimulationResult;
  explanation: CalculationExplanation;
} {
  const { accounts, categories, bills, debts, transactions, settings } = input;
  const baseline = calculateSafetyLine({ accounts, categories, bills, debts, transactions, settings }).value;

  const baselineLiquid = baseline.L;
  const baselineFloor = baseline.F;
  const baselineTarget = baseline.S;
  const baselineMonthlyE = baseline.E;

  // 1. Emergency expense directly subtracts from liquid funds
  const postShockLiquid = Math.max(0, baselineLiquid - shock.emergencyExpenseMinor);

  // 2. Essential cost increase raises monthly essential expenses
  const essentialMultiplier = 1 + (shock.essentialCostIncreasePercent / 100);
  const inflationMultiplier = 1 + (shock.inflationShockPercent / 100);
  const postShockMonthlyE = Math.round(baselineMonthlyE * essentialMultiplier * inflationMultiplier);

  // 3. Recalculate Safety Floor F and Target S
  const postShockFloor = postShockMonthlyE + baseline.U;
  const M = settings.safetyMultiplier || 3;
  const postShockTarget = (postShockMonthlyE * M) + baseline.U + (settings.additionalReserve || 0);

  // 4. Calculate runway in days: Liquid / (Monthly Essential / 30)
  const baselineDailyBurn = Math.max(1, Math.round(baselineMonthlyE / 30));
  const postShockDailyBurn = Math.max(1, Math.round(postShockMonthlyE / 30));

  const baselineRunwayDays = Math.round(baselineLiquid / baselineDailyBurn);
  const postShockRunwayDays = Math.round(postShockLiquid / postShockDailyBurn);

  // 5. Post-shock Safety State determination
  let postShockState: SafetyState = 'Safe';
  if (postShockLiquid < postShockFloor) {
    postShockState = 'Recovery';
  } else if (postShockLiquid < postShockTarget) {
    postShockState = 'Caution';
  }

  const isBreachedFloor = postShockLiquid < postShockFloor;
  const liquidLossMinor = baselineLiquid - postShockLiquid;
  const runwayLossDays = Math.max(0, baselineRunwayDays - postShockRunwayDays);

  let resilienceVerdict = 'Your finances demonstrate high resilience under this hypothetical stress scenario.';
  if (postShockState === 'Recovery') {
    resilienceVerdict = 'CRITICAL: This scenario would breach your Safety Floor F, exhausting liquid reserves within the emergency window.';
  } else if (postShockState === 'Caution') {
    resilienceVerdict = 'CAUTION: Your safety margin would narrow into the Caution zone, requiring temporary spending adjustments.';
  }

  const survivalStrategies: string[] = [];
  if (shock.emergencyExpenseMinor > 0) {
    survivalStrategies.push(`Emergency Expense (${formatMoney(shock.emergencyExpenseMinor, settings.currency)}) immediately reduces liquidity by ${runwayLossDays} days.`);
  }
  if (shock.essentialCostIncreasePercent > 0 || shock.inflationShockPercent > 0) {
    survivalStrategies.push(`Monthly essential baseline expands to ${formatMoney(postShockMonthlyE, settings.currency)}/month, raising your Safety Floor to ${formatMoney(postShockFloor, settings.currency)}.`);
  }
  if (postShockState === 'Recovery') {
    survivalStrategies.push('Emergency playbook: Freeze all non-essential category spending to protect basic food and shelter needs.');
  } else {
    survivalStrategies.push('Preserve existing reserve accounts and maintain a steady monthly replenishment cadence.');
  }

  const value: ScenarioSimulationResult = {
    baselineState: baseline.state,
    postShockState,
    baselineLiquidMinor: baselineLiquid,
    postShockLiquidMinor: postShockLiquid,
    baselineSafetyFloorMinor: baselineFloor,
    postShockSafetyFloorMinor: postShockFloor,
    baselineSafetyTargetMinor: baselineTarget,
    postShockSafetyTargetMinor: postShockTarget,
    baselineRunwayDays,
    postShockRunwayDays,
    liquidLossMinor,
    runwayLossDays,
    isBreachedFloor,
    resilienceVerdict,
    survivalStrategies,
  };

  const explanation: CalculationExplanation = {
    title: 'Hypothetical Scenario Stress Simulation',
    formula: 'Post-Shock L\' = max(0, L - EmergencyExpense); Post-Shock E\' = E × (1 + EssentialIncrease) × (1 + InflationShock)',
    inputs: [
      { label: 'Baseline Liquid (L)', value: formatMoney(baselineLiquid, settings.currency) },
      { label: 'Hypothetical Emergency Shock', value: formatMoney(shock.emergencyExpenseMinor, settings.currency) },
      { label: 'Post-Shock Liquid (L\')', value: formatMoney(postShockLiquid, settings.currency) },
      { label: 'Post-Shock Safety Floor (F\')', value: formatMoney(postShockFloor, settings.currency) },
      { label: 'Post-Shock Runway', value: `${postShockRunwayDays} days (${runwayLossDays} days lost)` },
    ],
    engineVersion: 'Safeline Wizard Engine v4.0.0',
    caveats: [
      'Estimates, not financial advice.',
      'Hypothetical scenario for stress-testing resilience. Actual account balances and records remain unmodified.',
    ],
    calculatedAt: new Date().toISOString(),
  };

  return { value, explanation };
}

// ========================================================
// 3. DEBT FREEDOM OPTIMIZER (SNOWBALL VS AVALANCHE)
// ========================================================

export function calculateDebtPayoffComparison(
  debts: DebtRecord[],
  extraMonthlyMinor: number,
  currency: string = 'RWF'
): {
  value: DebtPayoffComparison;
  explanation: CalculationExplanation;
} {
  if (debts.length === 0) {
    const emptyPlan: DebtPayoffPlan = {
      strategy: 'snowball',
      title: 'Debt Free',
      description: 'No active debts recorded.',
      payoffMonths: 0,
      debtFreeDate: new Date().toISOString().split('T')[0],
      totalInterestPaidMinor: 0,
      totalPaidMinor: 0,
      monthlySchedule: [],
    };
    return {
      value: {
        snowball: emptyPlan,
        avalanche: { ...emptyPlan, strategy: 'avalanche' },
        interestSavedWithAvalancheMinor: 0,
        monthsSavedWithAvalanche: 0,
        recommendedStrategy: 'avalanche',
        recommendationRationale: 'No debt obligations on file.',
        acceleratorImpact: { extraMonthlyMinor: 0, monthsSaved: 0, interestSavedMinor: 0 },
      },
      explanation: {
        title: 'Debt Freedom Comparison',
        formula: 'Total Debts = 0',
        inputs: [],
        engineVersion: 'Safeline Wizard Engine v4.0.0',
        caveats: ['Estimates, not financial advice.'],
        calculatedAt: new Date().toISOString(),
      },
    };
  }

  // Helper to run deterministic amortization simulation
  function simulatePlan(strategy: 'snowball' | 'avalanche', extra: number): DebtPayoffPlan {
    // Clone debts with tracking balances
    const activeDebts = debts.map(d => ({
      id: d.id,
      name: d.creditor,
      principal: d.principal,
      annualRate: d.interestRatePercent,
      minPayment: d.minimumPayment,
    }));

    let totalInterestPaidMinor = 0;
    let totalPrincipalPaidMinor = 0;
    let month = 0;
    const maxMonths = 360; // 30 years safety cap
    const schedule: DebtPayoffPlan['monthlySchedule'] = [];

    while (activeDebts.some(d => d.principal > 0) && month < maxMonths) {
      month++;
      let monthlyInterestThisPeriod = 0;
      let monthlyPrincipalThisPeriod = 0;

      // 1. Accrue monthly interest on remaining principal
      for (const d of activeDebts) {
        if (d.principal > 0) {
          const monthlyRate = (d.annualRate / 100) / 12;
          const interestCharge = Math.round(d.principal * monthlyRate);
          d.principal += interestCharge;
          monthlyInterestThisPeriod += interestCharge;
          totalInterestPaidMinor += interestCharge;
        }
      }

      // 2. Pay minimums
      let leftoverExtra = extra;
      for (const d of activeDebts) {
        if (d.principal > 0) {
          const payAmount = Math.min(d.principal, d.minPayment);
          d.principal -= payAmount;
          monthlyPrincipalThisPeriod += payAmount;
          totalPrincipalPaidMinor += payAmount;
          // If minPayment exceeds remaining principal, surplus goes to extra pool
          if (d.minPayment > payAmount) {
            leftoverExtra += (d.minPayment - payAmount);
          }
        }
      }

      // 3. Apply extra payment to target debt according to strategy
      // Snowball: lowest balance first; Avalanche: highest APR first
      const eligible = activeDebts.filter(d => d.principal > 0);
      if (strategy === 'snowball') {
        eligible.sort((a, b) => a.principal - b.principal);
      } else {
        eligible.sort((a, b) => b.annualRate - a.annualRate);
      }

      for (const target of eligible) {
        if (leftoverExtra <= 0) break;
        const extraPayment = Math.min(target.principal, leftoverExtra);
        target.principal -= extraPayment;
        monthlyPrincipalThisPeriod += extraPayment;
        totalPrincipalPaidMinor += extraPayment;
        leftoverExtra -= extraPayment;
      }

      const totalRemaining = activeDebts.reduce((sum, d) => sum + d.principal, 0);
      const scheduleDate = new Date();
      scheduleDate.setMonth(scheduleDate.getMonth() + month);

      if (month <= 24 || totalRemaining === 0) {
        schedule.push({
          monthIndex: month,
          date: scheduleDate.toISOString().split('T')[0],
          remainingPrincipalMinor: totalRemaining,
          interestPaidMinor: monthlyInterestThisPeriod,
          principalPaidMinor: monthlyPrincipalThisPeriod,
        });
      }
    }

    const debtFreeDate = new Date();
    debtFreeDate.setMonth(debtFreeDate.getMonth() + month);

    return {
      strategy,
      title: strategy === 'snowball' ? 'Snowball (Lowest Balance First)' : 'Avalanche (Highest APR First)',
      description: strategy === 'snowball' 
        ? 'Target smallest debts first for rapid psychological wins and momentum.' 
        : 'Target highest interest rates first to mathematically minimize total financing fees.',
      payoffMonths: month,
      debtFreeDate: debtFreeDate.toISOString().split('T')[0],
      totalInterestPaidMinor,
      totalPaidMinor: totalPrincipalPaidMinor + totalInterestPaidMinor,
      monthlySchedule: schedule,
    };
  }

  const snowball = simulatePlan('snowball', extraMonthlyMinor);
  const avalanche = simulatePlan('avalanche', extraMonthlyMinor);

  // Baseline without accelerator for impact measurement
  const avalancheNoExtra = simulatePlan('avalanche', 0);
  const monthsSavedWithAccelerator = Math.max(0, avalancheNoExtra.payoffMonths - avalanche.payoffMonths);
  const interestSavedWithAccelerator = Math.max(0, avalancheNoExtra.totalInterestPaidMinor - avalanche.totalInterestPaidMinor);

  const interestSavedWithAvalanche = Math.max(0, snowball.totalInterestPaidMinor - avalanche.totalInterestPaidMinor);
  const monthsSavedWithAvalanche = Math.max(0, snowball.payoffMonths - avalanche.payoffMonths);

  const recommendedStrategy = interestSavedWithAvalanche > 20000 ? 'avalanche' : 'snowball';
  const recommendationRationale = recommendedStrategy === 'avalanche'
    ? `Avalanche saves ${formatMoney(interestSavedWithAvalanche, currency)} in interest by targeting higher interest obligations first.`
    : `Snowball offers rapid elimination of small debt balances with comparable overall interest cost.`;

  const comparison: DebtPayoffComparison = {
    snowball,
    avalanche,
    interestSavedWithAvalancheMinor: interestSavedWithAvalanche,
    monthsSavedWithAvalanche,
    recommendedStrategy,
    recommendationRationale,
    acceleratorImpact: {
      extraMonthlyMinor,
      monthsSaved: monthsSavedWithAccelerator,
      interestSavedMinor: interestSavedWithAccelerator,
    },
  };

  const explanation: CalculationExplanation = {
    title: 'Debt Payoff Optimization Model',
    formula: 'Amortization: Balance_{m+1} = Balance_m × (1 + APR/12) - Payment_m; Extra Payment applied by ranking',
    inputs: [
      { label: 'Active Obligations Count', value: `${debts.length}` },
      { label: 'Total Principal', value: formatMoney(debts.reduce((s, d) => s + d.principal, 0), currency) },
      { label: 'Extra Monthly Accelerator', value: formatMoney(extraMonthlyMinor, currency) },
      { label: 'Snowball Payoff Timeline', value: `${snowball.payoffMonths} months` },
      { label: 'Avalanche Payoff Timeline', value: `${avalanche.payoffMonths} months` },
      { label: 'Avalanche Interest Saved', value: formatMoney(interestSavedWithAvalanche, currency) },
    ],
    engineVersion: 'Safeline Wizard Engine v4.0.0',
    caveats: [
      'Estimates, not financial advice.',
      'Assumes consistent monthly payments without missing cycles or additional credit draw-downs.',
    ],
    calculatedAt: new Date().toISOString(),
  };

  return { value: comparison, explanation };
}

// ========================================================
// 4. CASH FLOW & RUNWAY FORECASTER (30–180 DAYS)
// ========================================================

export function calculateCashFlowRunway(
  input: HealthScoreInput,
  projectionDays: number = 180
): {
  value: CashFlowRunwayProjection;
  explanation: CalculationExplanation;
} {
  const { accounts, bills, debts, transactions, settings } = input;
  const safetyLine = calculateSafetyLine({ accounts, categories: input.categories, bills, debts, transactions, settings }).value;

  const currentLiquid = safetyLine.L;
  const safetyFloor = safetyLine.F;
  const safetyTarget = safetyLine.S;

  // Monthly inflows (from confirmed recurring income)
  const confirmedIncomeTx = transactions.filter(t => t.type === 'income' && t.status === 'posted');
  const monthlyIncome = confirmedIncomeTx.length > 0 
    ? Math.round(confirmedIncomeTx.reduce((sum, t) => sum + t.amount, 0) / Math.max(1, Math.min(3, confirmedIncomeTx.length))) 
    : 350000; // sensible default

  // Daily essential burn rate
  const monthlyEssential = safetyLine.E;
  const dailyBurn = Math.max(1, Math.round(monthlyEssential / 30));

  let runningBalance = currentLiquid;
  let lowestProjectedBalanceMinor = currentLiquid;
  let lowestPointDay = 0;
  let daysToFloorBreach: number | null = null;
  let daysToDepletion: number | null = null;

  const dailyTrajectory: RunwayDayPoint[] = [];
  const weeklySummary: CashFlowRunwayProjection['weeklySummary'] = [];

  const today = new Date();

  for (let d = 0; d <= projectionDays; d++) {
    const curDate = new Date(today);
    curDate.setDate(today.getDate() + d);
    const dateStr = curDate.toISOString().split('T')[0];
    const dayOfMonth = curDate.getDate();

    let eventDesc: string | undefined = undefined;

    // Monthly income cycle (e.g. 25th or 28th of the month)
    if (dayOfMonth === 25 && d > 0) {
      runningBalance += monthlyIncome;
      eventDesc = `Income deposited (+${formatMoney(monthlyIncome, settings.currency)})`;
    }

    // Daily essential burn (excluding bill spikes handled separately)
    runningBalance -= dailyBurn;

    // Scheduled bills check
    const dueBills = bills.filter(b => {
      const bDay = new Date(b.dueDate).getDate();
      return bDay === dayOfMonth && !b.isPaid;
    });
    for (const b of dueBills) {
      runningBalance -= b.amount;
      eventDesc = `Bill Due: ${b.name} (-${formatMoney(b.amount, settings.currency)})`;
    }

    if (runningBalance < lowestProjectedBalanceMinor) {
      lowestProjectedBalanceMinor = runningBalance;
      lowestPointDay = d;
    }

    const isFloorBreached = runningBalance < safetyFloor;
    const isZeroBreached = runningBalance <= 0;

    if (isFloorBreached && daysToFloorBreach === null && d > 0) {
      daysToFloorBreach = d;
    }
    if (isZeroBreached && daysToDepletion === null && d > 0) {
      daysToDepletion = d;
    }

    dailyTrajectory.push({
      dayIndex: d,
      date: dateStr,
      projectedBalanceMinor: runningBalance,
      isSafetyFloorBreached: isFloorBreached,
      isZeroBreached: isZeroBreached,
      eventDescription: eventDesc,
    });

    if (d % 7 === 0) {
      weeklySummary.push({
        weekIndex: Math.floor(d / 7),
        startDate: dateStr,
        projectedBalanceMinor: runningBalance,
      });
    }
  }

  const value: CashFlowRunwayProjection = {
    currentLiquidMinor: currentLiquid,
    safetyFloorMinor: safetyFloor,
    safetyTargetMinor: safetyTarget,
    daysToFloorBreach,
    daysToDepletion,
    lowestProjectedBalanceMinor,
    lowestPointDay,
    dailyTrajectory,
    weeklySummary,
  };

  const explanation: CalculationExplanation = {
    title: 'Deterministic Cash Flow Runway Projection (180 Days)',
    formula: 'Balance_{d} = Balance_{d-1} - DailyBurn + Inflows_{d} - ScheduledBills_{d}',
    inputs: [
      { label: 'Starting Liquid L', value: formatMoney(currentLiquid, settings.currency) },
      { label: 'Safety Floor F', value: formatMoney(safetyFloor, settings.currency) },
      { label: 'Estimated Daily Essential Burn', value: formatMoney(dailyBurn, settings.currency) },
      { label: 'Days to Safety Floor Breach', value: daysToFloorBreach !== null ? `${daysToFloorBreach} days` : 'None (Above Floor)' },
      { label: 'Days to Depletion (Zero Balance)', value: daysToDepletion !== null ? `${daysToDepletion} days` : 'None (Solvent)' },
      { label: 'Lowest Projected Balance', value: formatMoney(lowestProjectedBalanceMinor, settings.currency) },
    ],
    engineVersion: 'Safeline Wizard Engine v4.0.0',
    caveats: [
      'Estimates, not financial advice.',
      'Deterministic forward simulation based on recurring scheduled cash flow patterns.',
    ],
    calculatedAt: new Date().toISOString(),
  };

  return { value, explanation };
}

// ========================================================
// 5. GUIDED ACTION PLAYBOOKS ("THE WIZARD'S PRESCRIPTIONS")
// ========================================================

export function generateFinancialPlaybook(
  healthScore: FinancialHealthScore,
  safetyState: SafetyState,
  currency: string = 'RWF'
): FinancialPlaybook {
  const normalizedState = (safetyState || '').toLowerCase();

  if (normalizedState === 'recovery' || (!normalizedState && healthScore.tier === 'critical')) {
    const steps: PlaybookStep[] = [
      {
        id: 'rec_1',
        title: 'Freeze Discretionary "Fun" Allocations',
        description: 'Immediately pause non-essential restaurant, recreation, and subscription expenses to conserve liquid cash.',
        actionType: 'budget_cut',
        estimatedImpactMinor: 35000,
        impactDescription: `Conserves ~35,000 ${currency}/month directly towards Safety Floor restoration.`,
        isUrgent: true,
      },
      {
        id: 'rec_2',
        title: 'Mobilize Emergency Reserve Support',
        description: 'Transfer non-liquid savings or emergency buffer funds into your primary eligible liquid account.',
        actionType: 'reserve_transfer',
        estimatedImpactMinor: 50000,
        impactDescription: 'Restores liquid liquidity buffer immediately above the Safety Floor.',
        isUrgent: true,
      },
      {
        id: 'rec_3',
        title: 'Defer Non-Essential Bills & Negotiate Terms',
        description: 'Contact non-critical utility and subscription providers to reschedule payment due dates past your next payday.',
        actionType: 'renegotiate',
        estimatedImpactMinor: 20000,
        impactDescription: 'Reduces unpaid bills factor U before next reliable income.',
        isUrgent: false,
      },
    ];

    return {
      mode: 'recovery',
      title: 'Safety Floor Defense Playbook',
      subtitle: 'Critical steps to restore liquid reserves and protect basic living stability.',
      coreObjective: 'Return eligible liquid funds L safely above the Safety Floor F within 14–30 days.',
      steps,
      warningNotice: 'Your liquid funds are operating below Safety Floor F. Preserve essential needs first.',
    };
  }

  if (normalizedState === 'caution' || (!normalizedState && healthScore.tier === 'caution')) {
    const steps: PlaybookStep[] = [
      {
        id: 'caut_1',
        title: 'Channel Surplus Towards Safety Target S',
        description: 'Direct 70% of unassigned and discretionary cash into your primary liquid emergency buffer.',
        actionType: 'reserve_transfer',
        estimatedImpactMinor: 40000,
        impactDescription: `Adds 40,000 ${currency}/month towards the 3-month safety multiplier target S.`,
        isUrgent: false,
      },
      {
        id: 'caut_2',
        title: 'Implement Debt Snowball on Smallest Balance',
        description: 'Target your smallest debt principal with extra payments to eliminate one monthly payment drag.',
        actionType: 'debt_snowball',
        estimatedImpactMinor: 15000,
        impactDescription: 'Frees up recurring monthly debt service permanently upon payoff.',
        isUrgent: false,
      },
      {
        id: 'caut_3',
        title: 'Trim High-Inflation Discretionary Categories',
        description: 'Use the Value Hunter unit-price tool for bulk staples to reduce grocery and transport spending.',
        actionType: 'budget_cut',
        estimatedImpactMinor: 18000,
        impactDescription: 'Counters personal inflation rate drift against the national NISR benchmark.',
        isUrgent: false,
      },
    ];

    return {
      mode: 'caution',
      title: 'Buffer Building & Debt Acceleration Playbook',
      subtitle: 'Systematic progression from Safety Floor F to fully fortified Safety Target S.',
      coreObjective: 'Accumulate target buffer S while reducing recurring debt obligations.',
      steps,
      warningNotice: 'Finances are solvent, but a major unexpected emergency could breach your safety cushion.',
    };
  }

  // Growth / Safe Mode
  const steps: PlaybookStep[] = [
    {
      id: 'grow_1',
      title: 'Deploy Excess Capital into Inflation-Protected Goals',
      description: 'Your liquid buffer safely exceeds Target S. Allocate surplus funds into high-yield SACCO shares or capital assets.',
      actionType: 'invest_sacco',
      estimatedImpactMinor: 75000,
      impactDescription: 'Protects purchasing power against currency depreciation and builds long-term wealth.',
      isUrgent: false,
    },
    {
      id: 'grow_2',
      title: 'Accelerate Remaining Debt Payoff via Avalanche',
      description: 'Apply surplus cash to eradicate any remaining debt, minimizing total financing fees to zero.',
      actionType: 'debt_snowball',
      estimatedImpactMinor: 30000,
      impactDescription: 'Guarantees a 100% debt-free profile and unlocks maximum financial freedom.',
      isUrgent: false,
    },
    {
      id: 'grow_3',
      title: 'Hedge Planned Projects with BoQ Inflation Buffers',
      description: 'Use the Bill of Quantities tool to lock in material prices and budget compounding inflation contingencies.',
      actionType: 'invest_sacco',
      estimatedImpactMinor: 50000,
      impactDescription: 'Guarantees execution capability for construction and agricultural projects.',
      isUrgent: false,
    },
  ];

  return {
    mode: 'growth',
    title: 'Wealth Fortification & Inflation Shield Playbook',
    subtitle: 'Strategic surplus deployment into inflation-protected assets and financial independence.',
    coreObjective: 'Preserve real purchasing power and maximize risk-adjusted capital growth above Target S.',
    steps,
    warningNotice: 'Your safety line is fully fortified. Surplus capital is ready for strategic deployment.',
  };
}
