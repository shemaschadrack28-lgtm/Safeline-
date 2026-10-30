/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safeline — Bills Screen
 * Essential vs non-essential obligations, due dates, paid status, and connection to Safety Floor F.
 */

import React, { useState } from 'react';
import { 
  Receipt, 
  Calendar, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldAlert, 
  X,
  Tag
} from 'lucide-react';
import { Bill, BudgetCategory, UserSettings } from '../types/finance';
import { formatMoney } from '../services/financialEngine';

interface BillsScreenProps {
  bills: Bill[];
  categories: BudgetCategory[];
  settings: UserSettings;
  onTogglePaid: (billId: string) => void;
  onAddBill: (bill: Omit<Bill, 'id'>) => void;
  onDeleteBill: (billId: string) => void;
}

export const BillsScreen: React.FC<BillsScreenProps> = ({
  bills,
  categories,
  settings,
  onTogglePaid,
  onAddBill,
  onDeleteBill,
}) => {
  const currency = settings.currency;
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [isEssential, setIsEssential] = useState(true);
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [frequency, setFrequency] = useState<Bill['frequency']>('monthly');

  const unpaidBills = bills.filter((b) => !b.isPaid);
  const paidBills = bills.filter((b) => b.isPaid);

  const totalUnpaid = unpaidBills.reduce((acc, b) => acc + b.amount, 0);
  const essentialUnpaid = unpaidBills.filter((b) => b.isEssential).reduce((acc, b) => acc + b.amount, 0);

  const handleCreateBill = (e: React.FormEvent) => {
    e.preventDefault();
    const rawNum = parseFloat(amountStr.replace(/,/g, ''));
    if (isNaN(rawNum) || rawNum <= 0) return;

    const amountMinor = currency === 'RWF' || currency === 'JPY' ? Math.round(rawNum) : Math.round(rawNum * 100);

    onAddBill({
      name: name.trim() || 'Recurring Bill',
      amount: amountMinor,
      dueDate,
      isEssential,
      isPaid: false,
      categoryId,
      frequency,
    });

    setName('');
    setAmountStr('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Bills & Obligations</h1>
          <p className="text-xs text-slate-400">
            Essential obligations directly determine your Safety Floor (F)
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Bill</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-[#0F2747] p-3.5 rounded-xl border border-slate-700/70">
          <span className="text-xs text-slate-400 block font-medium">Total Unpaid Bills</span>
          <span className="font-mono text-base sm:text-lg font-bold text-white block mt-0.5 tabular-nums">
            {formatMoney(totalUnpaid, currency)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">
            {unpaidBills.length} pending obligations
          </span>
        </div>

        <div className="bg-[#0F2747] p-3.5 rounded-xl border border-amber-800/40">
          <span className="text-xs text-amber-300 block font-medium">Essential Due (U)</span>
          <span className="font-mono text-base sm:text-lg font-bold text-amber-200 block mt-0.5 tabular-nums">
            {formatMoney(essentialUnpaid, currency)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">
            Affects Safety Floor F
          </span>
        </div>

        <div className="bg-[#0F2747] p-3.5 rounded-xl border border-slate-700/70 col-span-2 sm:col-span-1">
          <span className="text-xs text-slate-400 block font-medium">Next Income Horizon</span>
          <span className="font-mono text-xs sm:text-sm font-semibold text-[#14B8A6] block mt-0.5">
            {settings.nextReliableIncomeDate || 'Not set'}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">
            Bills before this date feed U
          </span>
        </div>
      </div>

      {/* Unpaid Bills List */}
      <div className="space-y-3">
        <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block">
          Due & Upcoming Bills ({unpaidBills.length})
        </span>

        {unpaidBills.length === 0 ? (
          <div className="p-6 bg-[#0F2747]/30 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
            All registered bills are marked as paid. Great job maintaining zero overdue obligations!
          </div>
        ) : (
          <div className="space-y-2">
            {unpaidBills.map((bill) => {
              const due = new Date(bill.dueDate);
              const isOverdue = due < new Date();

              return (
                <div
                  key={bill.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    bill.isEssential
                      ? 'bg-[#0B1328] border-slate-700/80'
                      : 'bg-[#0B1328]/60 border-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onTogglePaid(bill.id)}
                      className="w-7 h-7 rounded-lg border border-slate-600 hover:border-[#10B981] flex items-center justify-center text-transparent hover:text-[#10B981] transition-colors"
                      title="Mark as paid"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100">{bill.name}</span>
                        {bill.isEssential ? (
                          <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/50 border border-amber-800/50 px-1.5 py-0.2 rounded">
                            Essential
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                            Discretionary
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className={`font-mono ${isOverdue ? 'text-rose-400 font-bold' : ''}`}>
                          Due: {bill.dueDate} {isOverdue && '(Overdue)'}
                        </span>
                        <span>·</span>
                        <span className="capitalize">{bill.frequency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-white tabular-nums">
                      {formatMoney(bill.amount, currency)}
                    </span>
                    <button
                      onClick={() => onDeleteBill(bill.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete bill"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Paid Bills Archive */}
      {paidBills.length > 0 && (
        <div className="space-y-2 pt-4">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 block">
            Recently Settled Bills ({paidBills.length})
          </span>
          <div className="space-y-1.5 opacity-70">
            {paidBills.map((bill) => (
              <div
                key={bill.id}
                className="p-2.5 rounded-xl bg-[#0B1328]/40 border border-slate-800/50 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  <span className="text-slate-300 line-through">{bill.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-400 tabular-nums">
                    {formatMoney(bill.amount, currency)}
                  </span>
                  <button
                    onClick={() => onTogglePaid(bill.id)}
                    className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                  >
                    Unmark
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Bill Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0F2747] border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700">
              <h3 className="text-sm font-bold text-white">Add New Bill / Obligation</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBill} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Bill Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. REG Electricity Token, Rent, Internet"
                  required
                  className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Amount ({currency})</label>
                <input
                  type="text"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0"
                  required
                  className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981]"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="one-time">One-time</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-[#0B1328] rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Essential Obligation</span>
                  <span className="text-[10px] text-slate-400">
                    If checked, feeds into Safety Floor F calculation
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isEssential}
                  onChange={(e) => setIsEssential(e.target.checked)}
                  className="w-4 h-4 rounded text-[#10B981] bg-slate-900 border-slate-700 focus:ring-[#10B981]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#10B981] hover:bg-[#059669] rounded-lg shadow-sm"
                >
                  Save Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
