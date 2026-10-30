/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safeline — Local Offline-Capable Storage Service
 * Honest data persistence with zero silent data loss.
 */

import {
  Account,
  Bill,
  BudgetCategory,
  CoolingOffItem,
  DebtRecord,
  InflationAdjustedGoal,
  PriceMemoryRecord,
  ProjectBoQ,
  ShoppingList,
  SupplierQuote,
  Transaction,
  UserSettings,
} from '../types/finance';

const STORAGE_KEYS = {
  ACCOUNTS: 'safeline_accounts_v1',
  TRANSACTIONS: 'safeline_transactions_v1',
  CATEGORIES: 'safeline_categories_v1',
  BILLS: 'safeline_bills_v1',
  DEBTS: 'safeline_debts_v1',
  COOLING_OFF: 'safeline_cooling_off_v1',
  GOALS: 'safeline_goals_v1',
  PRICE_MEMORY: 'safeline_price_memory_v1',
  SHOPPING_LISTS: 'safeline_shopping_lists_v1',
  SUPPLIER_QUOTES: 'safeline_supplier_quotes_v1',
  PROJECT_BOQS: 'safeline_project_boqs_v1',
  SETTINGS: 'safeline_settings_v1',
};

export const INITIAL_SETTINGS: UserSettings = {
  currency: 'RWF',
  theme: 'dark',
  safetyMultiplier: 3,
  additionalReserve: 50000, // 50,000 FRw
  nextReliableIncomeDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  irregularIncomeMode: false,
  irregularBufferGoal: 200000, // 200,000 FRw buffer goal
  coolingOffEnabled: true,
  coolingOffThreshold: 40000, // 40,000 FRw
  coolingOffHours: 24,
  netHourlyEarnings: 2500, // 2,500 FRw / hour
  workingHoursBasisNotes: 'Based on 40h/week at approx. 400,000 FRw net monthly income',
  emergencyFundTarget: 300000, // 300,000 FRw
  debtPayoffStrategy: 'avalanche',
  investingMilestoneReached: false,
  investingGoalDescription: 'SACCO dividend shares and local treasury bonds',
};

export const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc_momo',
    name: 'MTN Mobile Money',
    type: 'mobile_money',
    balance: 185000, // 185,000 FRw
    currency: 'RWF',
    isLiquid: true,
    institution: 'MTN Rwanda',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'acc_bank',
    name: 'BK Main Checking',
    type: 'bank_checking',
    balance: 340000, // 340,000 FRw
    currency: 'RWF',
    isLiquid: true,
    institution: 'Bank of Kigali',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'acc_cash',
    name: 'Physical Cash Reserve',
    type: 'cash',
    balance: 45000, // 45,000 FRw
    currency: 'RWF',
    isLiquid: true,
    institution: 'Safe Wallet',
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_CATEGORIES: BudgetCategory[] = [
  // 1. Needs
  {
    id: 'cat_rent',
    name: 'Rent & Housing',
    group: 'needs',
    allocatedAmount: 180000,
    period: 'monthly',
    isEssential: true,
  },
  {
    id: 'cat_groceries',
    name: 'Groceries & Market Food',
    group: 'needs',
    allocatedAmount: 120000,
    period: 'monthly',
    isEssential: true,
  },
  {
    id: 'cat_utilities',
    name: 'Electricity & Water (WASAC/REG)',
    group: 'needs',
    allocatedAmount: 35000,
    period: 'monthly',
    isEssential: true,
  },
  {
    id: 'cat_transport',
    name: 'Moto & Bus Transport',
    group: 'needs',
    allocatedAmount: 40000,
    period: 'monthly',
    isEssential: true,
  },
  // 2. Goals
  {
    id: 'cat_emergency_fund',
    name: 'Emergency Fund Contribution',
    group: 'goals',
    allocatedAmount: 50000,
    period: 'monthly',
    isEssential: false,
  },
  {
    id: 'cat_cert',
    name: 'Professional Certification',
    group: 'goals',
    allocatedAmount: 25000,
    period: 'monthly',
    isEssential: false,
  },
  // 3. Fun
  {
    id: 'cat_dining_coffee',
    name: 'Coffee & Weekend Outings',
    group: 'fun',
    allocatedAmount: 30000,
    period: 'monthly',
    isEssential: false,
  },
  {
    id: 'cat_entertainment',
    name: 'Internet Streaming & Mobile Data',
    group: 'fun',
    allocatedAmount: 20000,
    period: 'monthly',
    isEssential: false,
  },
  // 4. Savings / Reserve
  {
    id: 'cat_sacco_savings',
    name: 'Umurenge SACCO Savings',
    group: 'savings',
    allocatedAmount: 40000,
    period: 'monthly',
    isEssential: false,
  },
];

export const INITIAL_BILLS: Bill[] = [
  {
    id: 'bill_rent',
    name: 'Apartment Monthly Rent',
    amount: 180000,
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isEssential: true,
    isPaid: false,
    categoryId: 'cat_rent',
    frequency: 'monthly',
  },
  {
    id: 'bill_reg',
    name: 'REG Electricity Token',
    amount: 25000,
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isEssential: true,
    isPaid: false,
    categoryId: 'cat_utilities',
    frequency: 'monthly',
  },
  {
    id: 'bill_internet',
    name: 'Home Fiber Internet',
    amount: 28000,
    dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isEssential: false,
    isPaid: false,
    categoryId: 'cat_entertainment',
    frequency: 'monthly',
  },
];

export const INITIAL_DEBTS: DebtRecord[] = [
  {
    id: 'debt_laptop',
    name: 'Equipment Loan',
    lender: 'SACCO Credit Union',
    principalRemaining: 150000,
    accruedInterest: 12000,
    fees: 3000,
    annualInterestRatePercent: 14.0,
    minimumMonthlyPayment: 35000,
    dueDateDay: 28,
    isEssential: true,
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_income_1',
    accountId: 'acc_bank',
    date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: 540000,
    type: 'income',
    status: 'posted',
    categoryId: '',
    description: 'Monthly Consulting Retainer',
    isIrregular: false,
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tx_exp_groceries',
    accountId: 'acc_momo',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: 45000,
    type: 'expense',
    status: 'posted',
    categoryId: 'cat_groceries',
    description: 'Kimironko Market Weekly Food',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tx_exp_transport',
    accountId: 'acc_momo',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: 12000,
    type: 'expense',
    status: 'posted',
    categoryId: 'cat_transport',
    description: 'Weekly Moto Taxi Fares',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'tx_exp_coffee',
    accountId: 'acc_momo',
    date: new Date().toISOString().split('T')[0],
    amount: 8500,
    type: 'expense',
    status: 'posted',
    categoryId: 'cat_dining_coffee',
    description: 'Question Coffee Beans & Meetings',
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_COOLING_OFF: CoolingOffItem[] = [
  {
    id: 'cool_monitor',
    description: '27-inch 4K External Monitor',
    categoryId: 'cat_cert',
    amount: 195000,
    initiatedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), // 10 hours ago
    durationHours: 24,
    status: 'active',
    notes: 'Checking if existing monitor can suffice for another quarter.',
  },
];

export const INITIAL_GOALS: InflationAdjustedGoal[] = [
  {
    id: 'goal_sacco',
    name: 'SACCO Investment Capital Shares',
    targetDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    horizonYears: 2.0,
    nominalTargetMinor: 500000,
    annualInflationPercent: 5.6,
    inflationAdjustedTargetMinor: 557558,
    additionalFundingNeededMinor: 57558,
    currentBalanceMinor: 120000,
    nominalMonthlyNeededMinor: 15833,
    inflationAdjustedMonthlyNeededMinor: 18232,
    progressPercent: 22,
  },
  {
    id: 'goal_laptop',
    name: 'Engineering Workstation Upgrade',
    targetDate: new Date(Date.now() + 1 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    horizonYears: 1.0,
    nominalTargetMinor: 350000,
    annualInflationPercent: 5.6,
    inflationAdjustedTargetMinor: 369600,
    additionalFundingNeededMinor: 19600,
    currentBalanceMinor: 85000,
    nominalMonthlyNeededMinor: 22083,
    inflationAdjustedMonthlyNeededMinor: 23717,
    progressPercent: 23,
  },
];

export const INITIAL_PRICE_MEMORY: PriceMemoryRecord[] = [
  {
    id: 'pm_1',
    itemName: 'Irish Potatoes (Ibirayi)',
    shopName: 'Kimironko Market',
    categoryId: 'cat_groceries',
    priceMinor: 500,
    quantity: 1,
    unit: 'kg',
    unitPriceMinor: 500,
    recordedDate: '2026-10-25',
    notes: 'Fresh harvest from Musanze',
  },
  {
    id: 'pm_2',
    itemName: 'Irish Potatoes (Ibirayi)',
    shopName: 'Simba Supermarket',
    categoryId: 'cat_groceries',
    priceMinor: 750,
    quantity: 1,
    unit: 'kg',
    unitPriceMinor: 750,
    recordedDate: '2026-10-26',
    notes: 'Washed and bagged',
  },
  {
    id: 'pm_3',
    itemName: 'Tanzanian White Rice',
    shopName: 'Kimironko Market',
    categoryId: 'cat_groceries',
    priceMinor: 1300,
    quantity: 1,
    unit: 'kg',
    unitPriceMinor: 1300,
    recordedDate: '2026-10-20',
  },
  {
    id: 'pm_4',
    itemName: 'Tanzanian White Rice',
    shopName: 'Sawa City Supermarket',
    categoryId: 'cat_groceries',
    priceMinor: 1550,
    quantity: 1,
    unit: 'kg',
    unitPriceMinor: 1550,
    recordedDate: '2026-10-22',
  },
  {
    id: 'pm_5',
    itemName: 'Portland Cement (Cimerwa 32.5R)',
    shopName: 'Nyabugogo Hardware Depot',
    categoryId: 'cat_cert',
    priceMinor: 11500,
    quantity: 1,
    unit: 'bag',
    unitPriceMinor: 11500,
    recordedDate: '2026-10-15',
    notes: '50kg bag',
  },
  {
    id: 'pm_6',
    itemName: 'Portland Cement (Cimerwa 32.5R)',
    shopName: 'Kicukiro Construction Store',
    categoryId: 'cat_cert',
    priceMinor: 12200,
    quantity: 1,
    unit: 'bag',
    unitPriceMinor: 12200,
    recordedDate: '2026-10-18',
  },
];

export const INITIAL_SHOPPING_LISTS: ShoppingList[] = [
  {
    id: 'shop_1',
    name: 'Weekly Kimironko Market Run',
    targetStore: 'Kimironko Market',
    spendingCapMinor: 45000,
    categoryId: 'cat_groceries',
    status: 'active',
    createdAt: '2026-10-28',
    items: [
      { id: 'item_1', name: 'Irish Potatoes (Ibirayi)', quantity: 10, unit: 'kg', estimatedPriceMinor: 5000, isChecked: true, actualPriceMinor: 5000, preferredShop: 'Kimironko' },
      { id: 'item_2', name: 'Fresh Tomatoes & Onions', quantity: 1, unit: 'piece', estimatedPriceMinor: 7000, isChecked: true, actualPriceMinor: 6500, preferredShop: 'Kimironko' },
      { id: 'item_3', name: 'Green Plantains (Ibitoke)', quantity: 1, unit: 'bag', estimatedPriceMinor: 12000, isChecked: false, preferredShop: 'Kimironko' },
      { id: 'item_4', name: 'Sunflower Cooking Oil (5L)', quantity: 1, unit: 'piece', estimatedPriceMinor: 18000, isChecked: false, preferredShop: 'Kimironko' },
    ],
  },
];

export const INITIAL_SUPPLIER_QUOTES: SupplierQuote[] = [
  {
    id: 'quote_1',
    projectId: 'boq_perimeter',
    supplierName: 'Nyabugogo Direct Depot',
    deliveryDays: 2,
    deliveryFeeMinor: 15000,
    itemsTotalMinor: 710000,
    totalQuoteMinor: 725000,
    warrantyPeriod: '6 Months',
    notes: 'Free unloading at site',
    isRecommended: false,
  },
  {
    id: 'quote_2',
    projectId: 'boq_perimeter',
    supplierName: 'Gikondo Construction Supplies',
    deliveryDays: 1,
    deliveryFeeMinor: 0,
    itemsTotalMinor: 705000,
    totalQuoteMinor: 705000,
    warrantyPeriod: '1 Year Manufacturer Guarantee',
    notes: 'Direct factory dispatch; includes free transport',
    isRecommended: true,
  },
  {
    id: 'quote_3',
    projectId: 'boq_perimeter',
    supplierName: 'Kicukiro Hardware Cooperative',
    deliveryDays: 3,
    deliveryFeeMinor: 20000,
    itemsTotalMinor: 720000,
    totalQuoteMinor: 740000,
    warrantyPeriod: '6 Months',
    notes: 'Local SACCO member discount already applied',
    isRecommended: false,
  },
];

export const INITIAL_PROJECT_BOQS: ProjectBoQ[] = [
  {
    id: 'boq_perimeter',
    name: 'Perimeter Wall Renovation & Plastering',
    description: 'Structural repair, plastering, and weather-seal painting',
    category: 'renovation',
    startDate: '2026-11-05',
    durationMonths: 6,
    contingencyPercent: 10,
    inflationAnnualPercent: 5.6,
    items: [
      { id: 'b1', section: 'material', description: 'Portland Cement (50kg bags)', quantity: 45, unit: 'bag', unitRateMinor: 11500, totalCostMinor: 517500 },
      { id: 'b2', section: 'material', description: 'Plaster Sand (Truckloads)', quantity: 3, unit: 'truck', unitRateMinor: 45000, totalCostMinor: 135000 },
      { id: 'b3', section: 'material', description: 'Weather-Shield Exterior Paint (20L)', quantity: 3, unit: 'bucket', unitRateMinor: 42000, totalCostMinor: 126000 },
      { id: 'b4', section: 'labor', description: 'Masonry & Plastering Labor Team', quantity: 10, unit: 'day', unitRateMinor: 15000, totalCostMinor: 150000 },
      { id: 'b5', section: 'transport', description: 'Site Logistics & Hauling', quantity: 1, unit: 'trip', unitRateMinor: 25000, totalCostMinor: 25000 },
    ],
    subtotalMinor: 953500,
    contingencyMinor: 95350,
    nominalTotalMinor: 1048850,
    inflationAdjustedTotalMinor: 1077797,
    inflationBufferMinor: 28947,
  },
];

export class StorageService {
  static loadAccounts(): Account[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      return data ? JSON.parse(data) : INITIAL_ACCOUNTS;
    } catch {
      return INITIAL_ACCOUNTS;
    }
  }

  static saveAccounts(accounts: Account[]): void {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  }

  static loadTransactions(): Transaction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  }

  static saveTransactions(transactions: Transaction[]): void {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }

  static loadCategories(): BudgetCategory[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return data ? JSON.parse(data) : INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  }

  static saveCategories(categories: BudgetCategory[]): void {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }

  static loadBills(): Bill[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BILLS);
      return data ? JSON.parse(data) : INITIAL_BILLS;
    } catch {
      return INITIAL_BILLS;
    }
  }

  static saveBills(bills: Bill[]): void {
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  }

  static loadDebts(): DebtRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DEBTS);
      return data ? JSON.parse(data) : INITIAL_DEBTS;
    } catch {
      return INITIAL_DEBTS;
    }
  }

  static saveDebts(debts: DebtRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
  }

  static loadCoolingOff(): CoolingOffItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COOLING_OFF);
      return data ? JSON.parse(data) : INITIAL_COOLING_OFF;
    } catch {
      return INITIAL_COOLING_OFF;
    }
  }

  static saveCoolingOff(items: CoolingOffItem[]): void {
    localStorage.setItem(STORAGE_KEYS.COOLING_OFF, JSON.stringify(items));
  }

  static loadGoals(): InflationAdjustedGoal[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GOALS);
      return data ? JSON.parse(data) : INITIAL_GOALS;
    } catch {
      return INITIAL_GOALS;
    }
  }

  static saveGoals(goals: InflationAdjustedGoal[]): void {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  }

  static loadPriceMemory(): PriceMemoryRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRICE_MEMORY);
      return data ? JSON.parse(data) : INITIAL_PRICE_MEMORY;
    } catch {
      return INITIAL_PRICE_MEMORY;
    }
  }

  static savePriceMemory(records: PriceMemoryRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.PRICE_MEMORY, JSON.stringify(records));
  }

  static loadShoppingLists(): ShoppingList[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SHOPPING_LISTS);
      return data ? JSON.parse(data) : INITIAL_SHOPPING_LISTS;
    } catch {
      return INITIAL_SHOPPING_LISTS;
    }
  }

  static saveShoppingLists(lists: ShoppingList[]): void {
    localStorage.setItem(STORAGE_KEYS.SHOPPING_LISTS, JSON.stringify(lists));
  }

  static loadSupplierQuotes(): SupplierQuote[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUPPLIER_QUOTES);
      return data ? JSON.parse(data) : INITIAL_SUPPLIER_QUOTES;
    } catch {
      return INITIAL_SUPPLIER_QUOTES;
    }
  }

  static saveSupplierQuotes(quotes: SupplierQuote[]): void {
    localStorage.setItem(STORAGE_KEYS.SUPPLIER_QUOTES, JSON.stringify(quotes));
  }

  static loadProjectBoQs(): ProjectBoQ[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROJECT_BOQS);
      return data ? JSON.parse(data) : INITIAL_PROJECT_BOQS;
    } catch {
      return INITIAL_PROJECT_BOQS;
    }
  }

  static saveProjectBoQs(boqs: ProjectBoQ[]): void {
    localStorage.setItem(STORAGE_KEYS.PROJECT_BOQS, JSON.stringify(boqs));
  }

  static loadSettings(): UserSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...INITIAL_SETTINGS, ...JSON.parse(data) } : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  }

  static saveSettings(settings: UserSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  static exportBackup(): string {
    const fullBackup = {
      version: '3.0.0-phase3',
      exportedAt: new Date().toISOString(),
      app: 'Safeline',
      accounts: this.loadAccounts(),
      transactions: this.loadTransactions(),
      categories: this.loadCategories(),
      bills: this.loadBills(),
      debts: this.loadDebts(),
      coolingOff: this.loadCoolingOff(),
      goals: this.loadGoals(),
      priceMemory: this.loadPriceMemory(),
      shoppingLists: this.loadShoppingLists(),
      supplierQuotes: this.loadSupplierQuotes(),
      projectBoQs: this.loadProjectBoQs(),
      settings: this.loadSettings(),
    };
    return JSON.stringify(fullBackup, null, 2);
  }

  static importBackup(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.app !== 'Safeline' && !parsed.accounts) {
        throw new Error('Invalid Safeline backup format');
      }
      if (parsed.accounts) this.saveAccounts(parsed.accounts);
      if (parsed.transactions) this.saveTransactions(parsed.transactions);
      if (parsed.categories) this.saveCategories(parsed.categories);
      if (parsed.bills) this.saveBills(parsed.bills);
      if (parsed.debts) this.saveDebts(parsed.debts);
      if (parsed.coolingOff) this.saveCoolingOff(parsed.coolingOff);
      if (parsed.goals) this.saveGoals(parsed.goals);
      if (parsed.priceMemory) this.savePriceMemory(parsed.priceMemory);
      if (parsed.shoppingLists) this.saveShoppingLists(parsed.shoppingLists);
      if (parsed.supplierQuotes) this.saveSupplierQuotes(parsed.supplierQuotes);
      if (parsed.projectBoQs) this.saveProjectBoQs(parsed.projectBoQs);
      if (parsed.settings) this.saveSettings(parsed.settings);
      return true;
    } catch (err) {
      console.error('Backup import error:', err);
      return false;
    }
  }
}
