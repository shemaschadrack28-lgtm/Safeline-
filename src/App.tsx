/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safeline — Personal Finance & Financial Intelligence
 * Master Application Root (Phase 1 — Core Money Control)
 */

import React, { useEffect, useState } from 'react';
import { 
  Account, 
  Bill, 
  BudgetCategory, 
  CalculationExplanation, 
  CoolingOffItem, 
  DebtRecord, 
  InflationAdjustedGoal, 
  PriceMemoryRecord,
  ProjectBoQ,
  ShoppingList,
  SupplierQuote,
  Transaction, 
  UserSettings 
} from './types/finance';
import { 
  INITIAL_ACCOUNTS, 
  INITIAL_BILLS, 
  INITIAL_CATEGORIES, 
  INITIAL_COOLING_OFF, 
  INITIAL_DEBTS, 
  INITIAL_GOALS, 
  INITIAL_PRICE_MEMORY,
  INITIAL_PROJECT_BOQS,
  INITIAL_SETTINGS, 
  INITIAL_SHOPPING_LISTS,
  INITIAL_SUPPLIER_QUOTES,
  INITIAL_TRANSACTIONS, 
  StorageService 
} from './services/storage';
import { BottomNavigation, NavTab, TopNavigation } from './components/Navigation';
import { HomeScreen } from './components/HomeScreen';
import { ActivityScreen } from './components/ActivityScreen';
import { AddScreen } from './components/AddScreen';
import { BillsScreen } from './components/BillsScreen';
import { InsightsScreen } from './components/InsightsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { FormulaModal } from './components/FormulaModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [accounts, setAccounts] = useState<Account[]>(() => StorageService.loadAccounts());
  const [transactions, setTransactions] = useState<Transaction[]>(() => StorageService.loadTransactions());
  const [categories, setCategories] = useState<BudgetCategory[]>(() => StorageService.loadCategories());
  const [bills, setBills] = useState<Bill[]>(() => StorageService.loadBills());
  const [debts, setDebts] = useState<DebtRecord[]>(() => StorageService.loadDebts());
  const [coolingOffItems, setCoolingOffItems] = useState<CoolingOffItem[]>(() => StorageService.loadCoolingOff());
  const [goals, setGoals] = useState<InflationAdjustedGoal[]>(() => StorageService.loadGoals());
  const [priceMemory, setPriceMemory] = useState<PriceMemoryRecord[]>(() => StorageService.loadPriceMemory());
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>(() => StorageService.loadShoppingLists());
  const [supplierQuotes, setSupplierQuotes] = useState<SupplierQuote[]>(() => StorageService.loadSupplierQuotes());
  const [projectBoQs, setProjectBoQs] = useState<ProjectBoQ[]>(() => StorageService.loadProjectBoQs());
  const [settings, setSettings] = useState<UserSettings>(() => StorageService.loadSettings());
  const [formulaExplanation, setFormulaExplanation] = useState<CalculationExplanation | null>(null);

  // Sync theme with HTML document class
  useEffect(() => {
    const isDark = settings.theme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [settings.theme]);

  // Synchronize state changes to StorageService
  const updateAccounts = (newAccounts: Account[]) => {
    setAccounts(newAccounts);
    StorageService.saveAccounts(newAccounts);
  };

  const updateTransactions = (newTransactions: Transaction[]) => {
    setTransactions(newTransactions);
    StorageService.saveTransactions(newTransactions);
  };

  const updateCategories = (newCategories: BudgetCategory[]) => {
    setCategories(newCategories);
    StorageService.saveCategories(newCategories);
  };

  const updateBills = (newBills: Bill[]) => {
    setBills(newBills);
    StorageService.saveBills(newBills);
  };

  const updateDebts = (newDebts: DebtRecord[]) => {
    setDebts(newDebts);
    StorageService.saveDebts(newDebts);
  };

  const updateCoolingOff = (newItems: CoolingOffItem[]) => {
    setCoolingOffItems(newItems);
    StorageService.saveCoolingOff(newItems);
  };

  const updateGoals = (newGoals: InflationAdjustedGoal[]) => {
    setGoals(newGoals);
    StorageService.saveGoals(newGoals);
  };

  const updatePriceMemory = (records: PriceMemoryRecord[]) => {
    setPriceMemory(records);
    StorageService.savePriceMemory(records);
  };

  const updateShoppingLists = (lists: ShoppingList[]) => {
    setShoppingLists(lists);
    StorageService.saveShoppingLists(lists);
  };

  const updateSupplierQuotes = (quotes: SupplierQuote[]) => {
    setSupplierQuotes(quotes);
    StorageService.saveSupplierQuotes(quotes);
  };

  const updateProjectBoQs = (boqs: ProjectBoQ[]) => {
    setProjectBoQs(boqs);
    StorageService.saveProjectBoQs(boqs);
  };

  const updateSettings = (partial: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      StorageService.saveSettings(updated);
      return updated;
    });
  };

  // Add a new transaction with deterministic account balance adjustment
  const handleSaveTransaction = (txData: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...txData,
      id: `tx_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    // If posted, update account balances deterministically
    if (newTx.status === 'posted') {
      const updatedAccounts = accounts.map((acc) => {
        if (newTx.type === 'expense' && acc.id === newTx.accountId) {
          return { ...acc, balance: acc.balance - newTx.amount, updatedAt: new Date().toISOString() };
        }
        if (newTx.type === 'income' && acc.id === newTx.accountId) {
          return { ...acc, balance: acc.balance + newTx.amount, updatedAt: new Date().toISOString() };
        }
        if (newTx.type === 'transfer') {
          if (acc.id === newTx.accountId) {
            return { ...acc, balance: acc.balance - newTx.amount, updatedAt: new Date().toISOString() };
          }
          if (acc.id === newTx.toAccountId) {
            return { ...acc, balance: acc.balance + newTx.amount, updatedAt: new Date().toISOString() };
          }
        }
        return acc;
      });
      updateAccounts(updatedAccounts);
    }

    updateTransactions([newTx, ...transactions]);
    setCurrentTab('activity');
  };

  // Reverse transaction: marks reversed and restores account balance
  const handleReverseTransaction = (txId: string) => {
    const targetTx = transactions.find((t) => t.id === txId);
    if (!targetTx || targetTx.status === 'reversed') return;

    if (targetTx.status === 'posted') {
      const updatedAccounts = accounts.map((acc) => {
        if (targetTx.type === 'expense' && acc.id === targetTx.accountId) {
          return { ...acc, balance: acc.balance + targetTx.amount, updatedAt: new Date().toISOString() };
        }
        if (targetTx.type === 'income' && acc.id === targetTx.accountId) {
          return { ...acc, balance: acc.balance - targetTx.amount, updatedAt: new Date().toISOString() };
        }
        if (targetTx.type === 'transfer') {
          if (acc.id === targetTx.accountId) {
            return { ...acc, balance: acc.balance + targetTx.amount, updatedAt: new Date().toISOString() };
          }
          if (acc.id === targetTx.toAccountId) {
            return { ...acc, balance: acc.balance - targetTx.amount, updatedAt: new Date().toISOString() };
          }
        }
        return acc;
      });
      updateAccounts(updatedAccounts);
    }

    const updatedTxs = transactions.map((t) => (t.id === txId ? { ...t, status: 'reversed' as const } : t));
    updateTransactions(updatedTxs);
  };

  // Clear/post a pending transaction
  const handlePostPendingTransaction = (txId: string) => {
    const targetTx = transactions.find((t) => t.id === txId);
    if (!targetTx || targetTx.status !== 'pending') return;

    const updatedAccounts = accounts.map((acc) => {
      if (targetTx.type === 'expense' && acc.id === targetTx.accountId) {
        return { ...acc, balance: acc.balance - targetTx.amount, updatedAt: new Date().toISOString() };
      }
      if (targetTx.type === 'income' && acc.id === targetTx.accountId) {
        return { ...acc, balance: acc.balance + targetTx.amount, updatedAt: new Date().toISOString() };
      }
      if (targetTx.type === 'transfer') {
        if (acc.id === targetTx.accountId) {
          return { ...acc, balance: acc.balance - targetTx.amount, updatedAt: new Date().toISOString() };
        }
        if (acc.id === targetTx.toAccountId) {
          return { ...acc, balance: acc.balance + targetTx.amount, updatedAt: new Date().toISOString() };
        }
      }
      return acc;
    });
    updateAccounts(updatedAccounts);

    const updatedTxs = transactions.map((t) => (t.id === txId ? { ...t, status: 'posted' as const } : t));
    updateTransactions(updatedTxs);
  };

  // Categories
  const handleUpdateCategoryAllocation = (categoryId: string, newAllocation: number) => {
    const updated = categories.map((c) => (c.id === categoryId ? { ...c, allocatedAmount: newAllocation } : c));
    updateCategories(updated);
  };

  const handleAddCategory = (categoryData: Omit<BudgetCategory, 'id'>) => {
    const newCat: BudgetCategory = {
      ...categoryData,
      id: `cat_${Date.now()}`,
    };
    updateCategories([...categories, newCat]);
  };

  // Bills
  const handleToggleBillPaid = (billId: string) => {
    const updated = bills.map((b) => (b.id === billId ? { ...b, isPaid: !b.isPaid } : b));
    updateBills(updated);
  };

  const handleAddBill = (billData: Omit<Bill, 'id'>) => {
    const newBill: Bill = {
      ...billData,
      id: `bill_${Date.now()}`,
    };
    updateBills([...bills, newBill]);
  };

  const handleDeleteBill = (billId: string) => {
    const updated = bills.filter((b) => b.id !== billId);
    updateBills(updated);
  };

  // Cooling-Off
  const handleStartCoolingOff = (item: Omit<CoolingOffItem, 'id' | 'initiatedAt' | 'status'>) => {
    const newItem: CoolingOffItem = {
      ...item,
      id: `cool_${Date.now()}`,
      initiatedAt: new Date().toISOString(),
      status: 'active',
    };
    updateCoolingOff([newItem, ...coolingOffItems]);
  };

  const handleUpdateCoolingOffStatus = (id: string, status: CoolingOffItem['status']) => {
    const updated = coolingOffItems.map((i) => (i.id === id ? { ...i, status } : i));
    updateCoolingOff(updated);
  };

  // Goals (Phase 2)
  const handleAddGoal = (goal: InflationAdjustedGoal) => {
    updateGoals([...goals, goal]);
  };

  const handleUpdateGoal = (goalId: string, updated: Partial<InflationAdjustedGoal>) => {
    const newGoals = goals.map((g) => (g.id === goalId ? { ...g, ...updated } : g));
    updateGoals(newGoals);
  };

  const handleDeleteGoal = (goalId: string) => {
    const newGoals = goals.filter((g) => g.id !== goalId);
    updateGoals(newGoals);
  };

  // Phase 3: Procurement & Shopping Handlers
  const handleAddPriceRecord = (record: PriceMemoryRecord) => {
    updatePriceMemory([record, ...priceMemory]);
  };

  const handleAddShoppingList = (list: ShoppingList) => {
    updateShoppingLists([list, ...shoppingLists]);
  };

  const handleUpdateShoppingList = (listId: string, updated: Partial<ShoppingList>) => {
    updateShoppingLists(
      shoppingLists.map((l) => (l.id === listId ? { ...l, ...updated } : l))
    );
  };

  const handleConvertShoppingListToTransaction = (list: ShoppingList, accountId: string) => {
    const listTotal = list.items.reduce(
      (sum, item) => sum + (item.actualPriceMinor ?? item.estimatedPriceMinor),
      0
    );
    handleSaveTransaction({
      accountId,
      amount: listTotal,
      type: 'expense',
      status: 'posted',
      categoryId: list.categoryId || 'cat_groceries',
      description: `Shopping Trip: ${list.name} (${list.items.length} items)`,
      date: new Date().toISOString().split('T')[0],
    });
    // Mark list as completed
    handleUpdateShoppingList(list.id, { 
      status: 'completed',
      completedAt: new Date().toISOString()
    });
  };

  const handleAddSupplierQuote = (quote: SupplierQuote) => {
    updateSupplierQuotes([quote, ...supplierQuotes]);
  };

  const handleAddProjectBoQ = (boq: ProjectBoQ) => {
    updateProjectBoQs([boq, ...projectBoQs]);
  };

  // Backups
  const handleExportBackup = () => {
    const backupJson = StorageService.exportBackup();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safeline_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (jsonStr: string): boolean => {
    const success = StorageService.importBackup(jsonStr);
    if (success) {
      setAccounts(StorageService.loadAccounts());
      setTransactions(StorageService.loadTransactions());
      setCategories(StorageService.loadCategories());
      setBills(StorageService.loadBills());
      setDebts(StorageService.loadDebts());
      setCoolingOffItems(StorageService.loadCoolingOff());
      setGoals(StorageService.loadGoals());
      setPriceMemory(StorageService.loadPriceMemory());
      setShoppingLists(StorageService.loadShoppingLists());
      setSupplierQuotes(StorageService.loadSupplierQuotes());
      setProjectBoQs(StorageService.loadProjectBoQs());
      setSettings(StorageService.loadSettings());
    }
    return success;
  };

  const handleResetDemoData = () => {
    updateAccounts(INITIAL_ACCOUNTS);
    updateTransactions(INITIAL_TRANSACTIONS);
    updateCategories(INITIAL_CATEGORIES);
    updateBills(INITIAL_BILLS);
    updateDebts(INITIAL_DEBTS);
    updateCoolingOff(INITIAL_COOLING_OFF);
    updateGoals(INITIAL_GOALS);
    updatePriceMemory(INITIAL_PRICE_MEMORY);
    updateShoppingLists(INITIAL_SHOPPING_LISTS);
    updateSupplierQuotes(INITIAL_SUPPLIER_QUOTES);
    updateProjectBoQs(INITIAL_PROJECT_BOQS);
    updateSettings(INITIAL_SETTINGS);
  };

  return (
    <div className={`min-h-screen ${settings.theme === 'dark' ? 'bg-[#0B1328] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top Bar Contract Navigation */}
      <TopNavigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        theme={settings.theme}
        onToggleTheme={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
      />

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 pt-4 sm:pt-6">
        {currentTab === 'home' && (
          <HomeScreen
            accounts={accounts}
            categories={categories}
            bills={bills}
            debts={debts}
            transactions={transactions}
            settings={settings}
            onNavigate={setCurrentTab}
            onOpenFormula={setFormulaExplanation}
          />
        )}

        {currentTab === 'activity' && (
          <ActivityScreen
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            settings={settings}
            onReverseTransaction={handleReverseTransaction}
            onPostPendingTransaction={handlePostPendingTransaction}
          />
        )}

        {currentTab === 'add' && (
          <AddScreen
            accounts={accounts}
            categories={categories}
            settings={settings}
            onSaveTransaction={handleSaveTransaction}
            onCancel={() => setCurrentTab('home')}
          />
        )}

        {currentTab === 'bills' && (
          <BillsScreen
            bills={bills}
            categories={categories}
            settings={settings}
            onTogglePaid={handleToggleBillPaid}
            onAddBill={handleAddBill}
            onDeleteBill={handleDeleteBill}
          />
        )}

        {currentTab === 'insights' && (
          <InsightsScreen
            accounts={accounts}
            categories={categories}
            bills={bills}
            debts={debts}
            transactions={transactions}
            coolingOffItems={coolingOffItems}
            goals={goals}
            settings={settings}
            priceMemory={priceMemory}
            shoppingLists={shoppingLists}
            supplierQuotes={supplierQuotes}
            projectBoQs={projectBoQs}
            onUpdateCategoryAllocation={handleUpdateCategoryAllocation}
            onAddCategory={handleAddCategory}
            onToggleIrregularMode={(enabled) => updateSettings({ irregularIncomeMode: enabled })}
            onUpdateBufferGoal={(goal) => updateSettings({ irregularBufferGoal: goal })}
            onStartCoolingOff={handleStartCoolingOff}
            onUpdateCoolingOffStatus={handleUpdateCoolingOffStatus}
            onAddGoal={handleAddGoal}
            onUpdateGoal={handleUpdateGoal}
            onDeleteGoal={handleDeleteGoal}
            onAddPriceRecord={handleAddPriceRecord}
            onAddShoppingList={handleAddShoppingList}
            onUpdateShoppingList={handleUpdateShoppingList}
            onConvertShoppingListToTransaction={handleConvertShoppingListToTransaction}
            onAddSupplierQuote={handleAddSupplierQuote}
            onAddProjectBoQ={handleAddProjectBoQ}
            onOpenFormula={setFormulaExplanation}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsScreen
            settings={settings}
            onUpdateSettings={updateSettings}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onResetDemoData={handleResetDemoData}
          />
        )}
      </main>

      {/* Ergonomic Mobile Bottom Tab Navigation */}
      <BottomNavigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        theme={settings.theme}
        onToggleTheme={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
      />

      {/* Calculation Transparency Formula Modal */}
      <FormulaModal
        isOpen={formulaExplanation !== null}
        onClose={() => setFormulaExplanation(null)}
        explanation={formulaExplanation}
      />
    </div>
  );
}
