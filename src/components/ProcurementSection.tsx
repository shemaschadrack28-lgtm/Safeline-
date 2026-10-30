/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safeline — Phase 3: Shopping, Procurement and Projects Hub
 * 1. Item & Shop Price Memory
 * 2. Unit-Price Comparisons (Value Hunter)
 * 3. Shopping Lists & Strict Spending Caps
 * 4. Supplier Quote Comparison
 * 5. Bill of Quantities (BoQ) & Inflation-Adjusted Project Estimation
 */

import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Store, 
  Scale, 
  FileSpreadsheet, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  X, 
  HelpCircle, 
  Check, 
  Truck, 
  Clock, 
  DollarSign, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  Search,
  Filter
} from 'lucide-react';
import { 
  Account, 
  BoQLineItem, 
  BudgetCategory, 
  CalculationExplanation, 
  PriceMemoryRecord, 
  ProjectBoQ, 
  ShoppingList, 
  ShoppingListItem, 
  StandardUnit, 
  SupplierQuote, 
  Transaction, 
  UnitPriceComparisonCandidate, 
  UserSettings 
} from '../types/finance';
import { 
  calculateProjectBoQ, 
  calculateShoppingListTotals, 
  compareSupplierQuotes, 
  compareUnitPrices 
} from '../services/procurementEngine';
import { formatMoney } from '../services/financialEngine';

interface ProcurementSectionProps {
  accounts: Account[];
  categories: BudgetCategory[];
  settings: UserSettings;
  priceMemory: PriceMemoryRecord[];
  shoppingLists: ShoppingList[];
  supplierQuotes: SupplierQuote[];
  projectBoQs: ProjectBoQ[];
  onAddPriceRecord: (record: PriceMemoryRecord) => void;
  onAddShoppingList: (list: ShoppingList) => void;
  onUpdateShoppingList: (listId: string, updated: Partial<ShoppingList>) => void;
  onConvertShoppingListToTransaction: (list: ShoppingList, accountId: string) => void;
  onAddSupplierQuote: (quote: SupplierQuote) => void;
  onAddProjectBoQ: (boq: ProjectBoQ) => void;
  onOpenFormula: (explanation: CalculationExplanation) => void;
}

type SubTab = 'shopping_lists' | 'unit_price' | 'price_memory' | 'supplier_quotes' | 'boq_projects';

export const ProcurementSection: React.FC<ProcurementSectionProps> = ({
  accounts,
  categories,
  settings,
  priceMemory,
  shoppingLists,
  supplierQuotes,
  projectBoQs,
  onAddPriceRecord,
  onAddShoppingList,
  onUpdateShoppingList,
  onConvertShoppingListToTransaction,
  onAddSupplierQuote,
  onAddProjectBoQ,
  onOpenFormula,
}) => {
  const currency = settings.currency;
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('shopping_lists');

  // Search filter for Price Memory
  const [priceSearch, setPriceSearch] = useState('');

  // Unit-Price Comparison Tool state
  const [unitCandidates, setUnitCandidates] = useState<UnitPriceComparisonCandidate[]>([
    { id: '1', label: 'Small Retail Pouch', vendor: 'Local Corner Kiosk', packagePriceMinor: 1500, quantity: 500, unit: 'g' },
    { id: '2', label: '2kg Bag', vendor: 'Kimironko Market', packagePriceMinor: 5000, quantity: 2, unit: 'kg' },
    { id: '3', label: '5kg Economy Sack', vendor: 'Simba Supermarket', packagePriceMinor: 13000, quantity: 5, unit: 'kg' },
  ]);

  const [newCandidateLabel, setNewCandidateLabel] = useState('');
  const [newCandidateVendor, setNewCandidateVendor] = useState('');
  const [newCandidatePriceStr, setNewCandidatePriceStr] = useState('4500');
  const [newCandidateQtyStr, setNewCandidateQtyStr] = useState('1.5');
  const [newCandidateUnit, setNewCandidateUnit] = useState<StandardUnit>('kg');

  // New Shopping List Modal State
  const [showAddListModal, setShowAddListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListStore, setNewListStore] = useState('Kimironko Market');
  const [newListCapStr, setNewListCapStr] = useState('50000');
  const [newListCategoryId, setNewListCategoryId] = useState(categories[0]?.id || '');

  // Add Item to existing list state
  const [activeListId, setActiveListId] = useState<string>(shoppingLists[0]?.id || '');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState<StandardUnit>('kg');
  const [newItemPriceStr, setNewItemPriceStr] = useState('4000');

  // Convert to Transaction Modal State
  const [convertingList, setConvertingList] = useState<ShoppingList | null>(null);
  const [checkoutAccountId, setCheckoutAccountId] = useState(accounts[0]?.id || '');

  // New BoQ Project Modal State
  const [showAddBoQModal, setShowAddBoQModal] = useState(false);
  const [newBoQName, setNewBoQName] = useState('');
  const [newBoQDesc, setNewBoQDesc] = useState('');
  const [newBoQCategory, setNewBoQCategory] = useState<ProjectBoQ['category']>('renovation');
  const [newBoQMonths, setNewBoQMonths] = useState(6);
  const [newBoQContingency, setNewBoQContingency] = useState(10);

  // New Price Record Modal State
  const [showAddPriceModal, setShowAddPriceModal] = useState(false);
  const [pmItem, setPmItem] = useState('');
  const [pmShop, setPmShop] = useState('');
  const [pmPriceStr, setPmPriceStr] = useState('1000');
  const [pmQty, setPmQty] = useState(1);
  const [pmUnit, setPmUnit] = useState<StandardUnit>('kg');

  // Calculations
  const unitComparisonRes = compareUnitPrices(unitCandidates, currency);
  const activeShoppingList = shoppingLists.find((l) => l.id === activeListId) || shoppingLists[0];
  const listTotalsRes = activeShoppingList ? calculateShoppingListTotals(activeShoppingList, currency) : null;
  const quotesRes = compareSupplierQuotes(supplierQuotes, currency);

  // Filter Price Memory
  const filteredPriceMemory = priceMemory.filter((r) => {
    if (!priceSearch.trim()) return true;
    const q = priceSearch.toLowerCase();
    return r.itemName.toLowerCase().includes(q) || r.shopName.toLowerCase().includes(q);
  });

  const handleAddCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Math.round(parseFloat(newCandidatePriceStr.replace(/,/g, '')) || 0);
    const qty = parseFloat(newCandidateQtyStr) || 1;
    if (price <= 0 || qty <= 0) return;

    setUnitCandidates([
      ...unitCandidates,
      {
        id: `cand_${Date.now()}`,
        label: newCandidateLabel.trim() || `${qty}${newCandidateUnit} Package`,
        vendor: newCandidateVendor.trim() || 'Vendor',
        packagePriceMinor: price,
        quantity: qty,
        unit: newCandidateUnit,
      },
    ]);
    setNewCandidateLabel('');
    setNewCandidateVendor('');
  };

  const handleCreateShoppingList = (e: React.FormEvent) => {
    e.preventDefault();
    const cap = Math.round(parseFloat(newListCapStr.replace(/,/g, '')) || 0);
    if (!newListName.trim() || cap <= 0) return;

    const newList: ShoppingList = {
      id: `shop_${Date.now()}`,
      name: newListName.trim(),
      targetStore: newListStore.trim() || undefined,
      spendingCapMinor: cap,
      categoryId: newListCategoryId,
      items: [],
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
    };

    onAddShoppingList(newList);
    setActiveListId(newList.id);
    setNewListName('');
    setShowAddListModal(false);
  };

  const handleAddItemToList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShoppingList || !newItemName.trim()) return;
    const price = Math.round(parseFloat(newItemPriceStr.replace(/,/g, '')) || 0);

    const newItem: ShoppingListItem = {
      id: `item_${Date.now()}`,
      name: newItemName.trim(),
      quantity: newItemQty,
      unit: newItemUnit,
      estimatedPriceMinor: price,
      actualPriceMinor: price,
      isChecked: false,
    };

    onUpdateShoppingList(activeShoppingList.id, {
      items: [...activeShoppingList.items, newItem],
    });

    setNewItemName('');
  };

  const handleToggleItemCheck = (listId: string, itemId: string) => {
    const targetList = shoppingLists.find((l) => l.id === listId);
    if (!targetList) return;

    const updatedItems = targetList.items.map((it) => 
      it.id === itemId ? { ...it, isChecked: !it.isChecked } : it
    );
    onUpdateShoppingList(listId, { items: updatedItems });
  };

  const handleSavePriceRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Math.round(parseFloat(pmPriceStr.replace(/,/g, '')) || 0);
    if (!pmItem.trim() || !pmShop.trim() || price <= 0) return;

    onAddPriceRecord({
      id: `pm_${Date.now()}`,
      itemName: pmItem.trim(),
      shopName: pmShop.trim(),
      categoryId: 'cat_groceries',
      priceMinor: price,
      quantity: pmQty,
      unit: pmUnit,
      unitPriceMinor: Math.round(price / pmQty),
      recordedDate: new Date().toISOString().split('T')[0],
    });

    setPmItem('');
    setPmShop('');
    setShowAddPriceModal(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800 text-xs scrollbar-none">
        <button
          onClick={() => setActiveSubTab('shopping_lists')}
          className={`px-3.5 py-2 font-semibold rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'shopping_lists'
              ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
              : 'text-slate-400 hover:text-slate-200 bg-[#0B1328]/60'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Shopping Lists & Caps</span>
        </button>

        <button
          onClick={() => setActiveSubTab('unit_price')}
          className={`px-3.5 py-2 font-semibold rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'unit_price'
              ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
              : 'text-slate-400 hover:text-slate-200 bg-[#0B1328]/60'
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-[#C6F432]" />
          <span>Unit-Price Compare</span>
        </button>

        <button
          onClick={() => setActiveSubTab('price_memory')}
          className={`px-3.5 py-2 font-semibold rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'price_memory'
              ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
              : 'text-slate-400 hover:text-slate-200 bg-[#0B1328]/60'
          }`}
        >
          <Store className="w-3.5 h-3.5 text-blue-400" />
          <span>Shop Price Memory</span>
        </button>

        <button
          onClick={() => setActiveSubTab('boq_projects')}
          className={`px-3.5 py-2 font-semibold rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'boq_projects'
              ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
              : 'text-slate-400 hover:text-slate-200 bg-[#0B1328]/60'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-purple-400" />
          <span>BoQ & Projects</span>
        </button>

        <button
          onClick={() => setActiveSubTab('supplier_quotes')}
          className={`px-3.5 py-2 font-semibold rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'supplier_quotes'
              ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
              : 'text-slate-400 hover:text-slate-200 bg-[#0B1328]/60'
          }`}
        >
          <Truck className="w-3.5 h-3.5 text-amber-400" />
          <span>Supplier Quotes</span>
        </button>
      </div>

      {/* SUB-TAB 1: SHOPPING LISTS & SPENDING CAPS */}
      {activeSubTab === 'shopping_lists' && (
        <div className="space-y-5 animate-in fade-in">
          {/* List Selector & Create Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">Active List:</span>
              <select
                value={activeListId}
                onChange={(e) => setActiveListId(e.target.value)}
                className="bg-[#0F2747] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-[#10B981]"
              >
                {shoppingLists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({formatMoney(l.spendingCapMinor, currency)} Cap)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowAddListModal(true)}
              className="px-3.5 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Shopping Trip</span>
            </button>
          </div>

          {activeShoppingList && listTotalsRes && (
            <div className="space-y-4">
              {/* Spending Cap Monitor Banner */}
              <div className={`p-4 rounded-2xl border ${
                listTotalsRes.value.capWarningSeverity === 'EXCEEDED_100'
                  ? 'bg-rose-950/30 border-rose-800/60'
                  : listTotalsRes.value.capWarningSeverity === 'WARNING_80'
                  ? 'bg-amber-950/25 border-amber-800/50'
                  : 'bg-[#0F2747] border-slate-700/80'
              }`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                        Trip Spending Cap
                      </span>
                      <button
                        onClick={() => onOpenFormula(listTotalsRes.explanation)}
                        className="text-slate-400 hover:text-white"
                        title="View spending cap formula"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold font-mono text-white tabular-nums">
                        {formatMoney(listTotalsRes.value.activeTotalMinor, currency)}
                      </span>
                      <span className="text-xs text-slate-400">
                        of {formatMoney(activeShoppingList.spendingCapMinor, currency)} Cap ({listTotalsRes.value.capUsedPercent}% used)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConvertingList(activeShoppingList)}
                      className="px-3 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Post as Expense</span>
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden mt-3 border border-slate-800 relative">
                  <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400/60 z-10" style={{ left: '80%' }} />
                  <div 
                    className={`h-full rounded-full transition-all ${
                      listTotalsRes.value.capWarningSeverity === 'EXCEEDED_100'
                        ? 'bg-rose-500'
                        : listTotalsRes.value.capWarningSeverity === 'WARNING_80'
                        ? 'bg-amber-400'
                        : 'bg-[#10B981]'
                    }`}
                    style={{ width: `${Math.min(100, listTotalsRes.value.capUsedPercent)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 font-mono">
                  <span>Remaining Cap: {formatMoney(listTotalsRes.value.remainingCapMinor, currency)}</span>
                  <span>Items: {listTotalsRes.value.totalCheckedCount}/{listTotalsRes.value.itemCount} checked</span>
                </div>
              </div>

              {/* Items Checklist */}
              <div className="bg-[#0F2747]/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block">
                  Market Items Checklist
                </span>

                <div className="space-y-1.5">
                  {activeShoppingList.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleItemCheck(activeShoppingList.id, item.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                        item.isChecked
                          ? 'bg-[#0B1328]/80 border-[#10B981]/40'
                          : 'bg-[#0B1328] border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                          item.isChecked
                            ? 'bg-[#10B981] border-[#10B981] text-white'
                            : 'border-slate-600 bg-slate-900'
                        }`}>
                          {item.isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <span className={`text-xs font-semibold block ${item.isChecked ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.quantity} {item.unit} {item.preferredShop ? `· @${item.preferredShop}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-white block">
                          {formatMoney(item.actualPriceMinor ?? item.estimatedPriceMinor, currency)}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          Est: {formatMoney(item.estimatedPriceMinor, currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Quick Item to List */}
                <form onSubmit={handleAddItemToList} className="pt-2 border-t border-slate-800 flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Add item (e.g. Avocado, Beans)"
                    className="flex-1 min-w-[140px] bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#10B981]"
                  />
                  <input
                    type="number"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(parseFloat(e.target.value) || 1)}
                    className="w-16 bg-[#0B1328] border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white font-mono"
                    min="0.1"
                    step="0.5"
                  />
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value as any)}
                    className="bg-[#0B1328] border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="piece">piece</option>
                    <option value="liter">L</option>
                    <option value="bag">bag</option>
                  </select>
                  <input
                    type="text"
                    value={newItemPriceStr}
                    onChange={(e) => setNewItemPriceStr(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="Price"
                    className="w-24 bg-[#0B1328] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-semibold"
                  >
                    Add
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: UNIT-PRICE COMPARISON (VALUE HUNTER) */}
      {activeSubTab === 'unit_price' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#C6F432]" />
                  <span>Unit-Price Value Hunter</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Compare different package sizes and stores normalized to a common unit rate
                </p>
              </div>
              <button
                onClick={() => onOpenFormula(unitComparisonRes.explanation)}
                className="text-slate-400 hover:text-white"
                title="View normalization formula"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Compared Candidates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {unitComparisonRes.value.map((cand) => (
                <div
                  key={cand.candidateId}
                  className={`p-4 rounded-xl border relative space-y-2 ${
                    cand.isBestValue
                      ? 'bg-[#10B981]/15 border-[#10B981] shadow-lg shadow-[#10B981]/10'
                      : 'bg-[#0B1328] border-slate-800'
                  }`}
                >
                  {cand.isBestValue && (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-[#10B981] text-[#0B1328] text-[9px] font-extrabold uppercase tracking-wide">
                      Best Value
                    </span>
                  )}

                  <div>
                    <span className="text-xs font-bold text-white block">{cand.label}</span>
                    <span className="text-[11px] text-slate-400 block">{cand.vendor}</span>
                  </div>

                  <div className="pt-1">
                    <span className="text-[10px] text-slate-400 block">Normalized Rate</span>
                    <span className={`font-mono text-base font-extrabold block ${cand.isBestValue ? 'text-[#C6F432]' : 'text-slate-200'}`}>
                      {formatMoney(cand.pricePerBaseUnitMinor, currency)} / {cand.baseUnit}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 font-mono">
                    Package: {formatMoney(cand.packagePriceMinor, currency)} for {cand.normalizedQuantityBase}{cand.baseUnit}
                    {cand.savingsVsHighestPercent > 0 && (
                      <span className="text-[#10B981] block font-semibold">
                        Saves {cand.savingsVsHighestPercent}% vs highest
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Candidate Form */}
            <form onSubmit={handleAddCandidate} className="p-3.5 bg-[#0B1328] rounded-xl border border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-slate-300 block">
                Add Another Package to Compare
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <input
                  type="text"
                  value={newCandidateLabel}
                  onChange={(e) => setNewCandidateLabel(e.target.value)}
                  placeholder="Option Label"
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#10B981]"
                />
                <input
                  type="text"
                  value={newCandidateVendor}
                  onChange={(e) => setNewCandidateVendor(e.target.value)}
                  placeholder="Store / Vendor"
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#10B981]"
                />
                <input
                  type="text"
                  value={newCandidatePriceStr}
                  onChange={(e) => setNewCandidatePriceStr(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="Package Price"
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#10B981]"
                />
                <input
                  type="number"
                  value={newCandidateQtyStr}
                  onChange={(e) => setNewCandidateQtyStr(e.target.value)}
                  placeholder="Quantity"
                  step="0.1"
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
                <select
                  value={newCandidateUnit}
                  onChange={(e) => setNewCandidateUnit(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="liter">liter</option>
                  <option value="ml">ml</option>
                  <option value="piece">piece</option>
                </select>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold rounded-lg"
                >
                  Add Option
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SHOP PRICE MEMORY */}
      {activeSubTab === 'price_memory' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={priceSearch}
                onChange={(e) => setPriceSearch(e.target.value)}
                placeholder="Search market item, store..."
                className="w-full bg-[#0F2747] border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#10B981]"
              />
            </div>

            <button
              onClick={() => setShowAddPriceModal(true)}
              className="px-3.5 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Record Price</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredPriceMemory.map((rec) => (
              <div
                key={rec.id}
                className="p-3.5 bg-[#0F2747]/70 border border-slate-800 rounded-xl flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-white block">{rec.itemName}</span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Store className="w-3.5 h-3.5 text-[#14B8A6]" />
                    <span>{rec.shopName}</span>
                    <span>·</span>
                    <span>{rec.recordedDate}</span>
                  </span>
                  {rec.notes && (
                    <span className="text-[10px] text-slate-500 block mt-0.5">{rec.notes}</span>
                  )}
                </div>

                <div className="text-right">
                  <span className="font-mono text-sm font-bold text-[#C6F432] block tabular-nums">
                    {formatMoney(rec.priceMinor, currency)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    per {rec.quantity}{rec.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: BILL OF QUANTITIES & PROJECTS */}
      {activeSubTab === 'boq_projects' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-purple-400" />
                <span>Bill of Quantities (BoQ) & Project Cost Estimation</span>
              </h3>
              <p className="text-xs text-slate-400">
                Detailed line-item budgeting, contingency buffer, and inflation compounding
              </p>
            </div>
            <button
              onClick={() => setShowAddBoQModal(true)}
              className="px-3 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New BoQ Project</span>
            </button>
          </div>

          <div className="space-y-4">
            {projectBoQs.map((boq) => (
              <div 
                key={boq.id}
                className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-700">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{boq.name}</h4>
                      <span className="text-[10px] uppercase font-bold text-purple-300 bg-purple-950/60 border border-purple-800/60 px-2 py-0.2 rounded-full">
                        {boq.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{boq.description}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-mono">Duration: {boq.durationMonths} Months</span>
                    <span className="text-[10px] text-[#C6F432] font-mono">Inflation: {boq.inflationAnnualPercent}% p.a.</span>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#0B1328] text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Section</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5 text-right">Qty</th>
                        <th className="p-2.5 text-right">Unit Rate</th>
                        <th className="p-2.5 text-right">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {boq.items.map((it) => (
                        <tr key={it.id} className="hover:bg-slate-800/30 font-mono">
                          <td className="p-2.5 capitalize text-slate-300 text-[11px]">{it.section}</td>
                          <td className="p-2.5 font-sans font-medium text-slate-100">{it.description}</td>
                          <td className="p-2.5 text-right text-slate-300">{it.quantity} {it.unit}</td>
                          <td className="p-2.5 text-right text-slate-300">{formatMoney(it.unitRateMinor, currency)}</td>
                          <td className="p-2.5 text-right font-bold text-white">{formatMoney(it.totalCostMinor, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* BoQ Financial Breakdown */}
                <div className="p-4 bg-[#0B1328] rounded-xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Subtotal (Direct Costs)</span>
                    <span className="font-bold text-slate-200">{formatMoney(boq.subtotalMinor, currency)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Contingency ({boq.contingencyPercent}%)</span>
                    <span className="font-bold text-amber-300">+{formatMoney(boq.contingencyMinor, currency)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Inflation Buffer ({boq.durationMonths}mo)</span>
                    <span className="font-bold text-[#C6F432]">+{formatMoney(boq.inflationBufferMinor, currency)}</span>
                  </div>
                  <div className="border-l border-slate-700/80 pl-3">
                    <span className="text-[10px] text-[#10B981] block font-sans font-bold">Total Estimated Budget</span>
                    <span className="font-extrabold text-white text-sm">{formatMoney(boq.inflationAdjustedTotalMinor, currency)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: SUPPLIER QUOTE COMPARISON */}
      {activeSubTab === 'supplier_quotes' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-400" />
                  <span>Supplier Quote Comparison</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Compare contractor and material bids including logistics and delivery timeframes
                </p>
              </div>
              <button
                onClick={() => onOpenFormula(quotesRes.explanation)}
                className="text-slate-400 hover:text-white"
                title="View comparison formula"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {quotesRes.value.quotes.map((q) => (
                <div
                  key={q.id}
                  className={`p-4 rounded-xl border relative space-y-2.5 ${
                    q.isRecommended
                      ? 'bg-[#10B981]/15 border-[#10B981] shadow-lg shadow-[#10B981]/10'
                      : 'bg-[#0B1328] border-slate-800'
                  }`}
                >
                  {q.isRecommended && (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-[#10B981] text-[#0B1328] text-[9px] font-extrabold uppercase tracking-wide">
                      Lowest Bid
                    </span>
                  )}

                  <div>
                    <span className="text-xs font-bold text-white block">{q.supplierName}</span>
                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-[#14B8A6]" />
                      <span>{q.deliveryDays} {q.deliveryDays === 1 ? 'day delivery' : 'days delivery'}</span>
                    </span>
                  </div>

                  <div className="pt-1 font-mono text-xs">
                    <span className="text-[10px] text-slate-400 block font-sans">Total Bid (All-in)</span>
                    <span className={`text-base font-extrabold block ${q.isRecommended ? 'text-[#C6F432]' : 'text-slate-200'}`}>
                      {formatMoney(q.totalQuoteMinor, currency)}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-800 font-mono">
                    <div className="flex justify-between">
                      <span>Materials:</span>
                      <span>{formatMoney(q.itemsTotalMinor, currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transport:</span>
                      <span>{q.deliveryFeeMinor > 0 ? formatMoney(q.deliveryFeeMinor, currency) : 'Free'}</span>
                    </div>
                    {q.warrantyPeriod && (
                      <div className="text-slate-300 font-sans pt-1">
                        Warranty: {q.warrantyPeriod}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Convert to Expense Modal */}
      {convertingList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0F2747] border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
              <h3 className="text-sm font-bold text-white">Post Shopping Trip as Expense</h3>
              <button onClick={() => setConvertingList(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Post total trip amount of <strong>{formatMoney(calculateShoppingListTotals(convertingList, currency).value.activeTotalMinor, currency)}</strong> as a settled transaction in your activity log.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Paid From Account</label>
              <select
                value={checkoutAccountId}
                onChange={(e) => setCheckoutAccountId(e.target.value)}
                className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatMoney(a.balance, a.currency)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConvertingList(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onConvertShoppingListToTransaction(convertingList, checkoutAccountId);
                  setConvertingList(null);
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg"
              >
                Post Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Shopping List Modal */}
      {showAddListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0F2747] border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
              <h3 className="text-sm font-bold text-white">Create Shopping List</h3>
              <button onClick={() => setShowAddListModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateShoppingList} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Trip Name</label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g. Weekly Market Groceries"
                  required
                  className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Target Market / Store</label>
                <input
                  type="text"
                  value={newListStore}
                  onChange={(e) => setNewListStore(e.target.value)}
                  placeholder="e.g. Kimironko Market, Simba"
                  className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Spending Cap ({currency})</label>
                <input
                  type="text"
                  value={newListCapStr}
                  onChange={(e) => setNewListCapStr(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="50000"
                  required
                  className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddListModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg"
                >
                  Create Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Price Record Modal */}
      {showAddPriceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0F2747] border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
              <h3 className="text-sm font-bold text-white">Record Store Price</h3>
              <button onClick={() => setShowAddPriceModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePriceRecord} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Item Name</label>
                <input
                  type="text"
                  value={pmItem}
                  onChange={(e) => setPmItem(e.target.value)}
                  placeholder="e.g. Sugar, Cooking Oil, Cement"
                  required
                  className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Market / Shop</label>
                <input
                  type="text"
                  value={pmShop}
                  onChange={(e) => setPmShop(e.target.value)}
                  placeholder="e.g. Simba Supermarket, Sawa City"
                  required
                  className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Price ({currency})</label>
                  <input
                    type="text"
                    value={pmPriceStr}
                    onChange={(e) => setPmPriceStr(e.target.value.replace(/[^0-9.]/g, ''))}
                    required
                    className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Unit</label>
                  <select
                    value={pmUnit}
                    onChange={(e) => setPmUnit(e.target.value as any)}
                    className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-2 py-2 text-xs text-white"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="liter">liter</option>
                    <option value="piece">piece</option>
                    <option value="bag">bag</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPriceModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
