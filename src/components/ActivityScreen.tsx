/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safeline — Activity Screen
 * Posted vs Pending transactions, transaction reversal, search, and auditable history.
 */

import React, { useState } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight, 
  Search, 
  Filter, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  Ban,
  Tag,
  AlertCircle
} from 'lucide-react';
import { Account, BudgetCategory, Transaction, UserSettings } from '../types/finance';
import { formatMoney } from '../services/financialEngine';

interface ActivityScreenProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: BudgetCategory[];
  settings: UserSettings;
  onReverseTransaction: (txId: string) => void;
  onPostPendingTransaction: (txId: string) => void;
}

export const ActivityScreen: React.FC<ActivityScreenProps> = ({
  transactions,
  accounts,
  categories,
  settings,
  onReverseTransaction,
  onPostPendingTransaction,
}) => {
  const currency = settings.currency;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'posted' | 'pending' | 'reversed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  // Filter transactions
  const filtered = transactions.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const desc = t.description.toLowerCase();
      const catName = (categoryMap.get(t.categoryId) || '').toLowerCase();
      const accName = (accountMap.get(t.accountId) || '').toLowerCase();
      return desc.includes(q) || catName.includes(q) || accName.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-5 pb-24 md:pb-12">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Financial Activity</h1>
          <p className="text-xs text-slate-400">
            Real posted records, pending drafts, and auditable history
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search description, category..."
            className="w-full bg-[#0F2747] border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#10B981]"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-b border-slate-800 pb-3">
        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-[#0B1328] p-1 rounded-xl border border-slate-800">
          {(['all', 'posted', 'pending', 'reversed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Filter className="w-3.5 h-3.5" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-[#0F2747] border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="income">Income Only</option>
            <option value="expense">Expense Only</option>
            <option value="transfer">Transfers Only</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center bg-[#0F2747]/40 border border-slate-800 rounded-2xl">
          <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-300">No transactions match your filter</h3>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search query, status, or transaction type.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const isSelected = selectedTxId === t.id;
            const categoryName = categoryMap.get(t.categoryId) || 'General / Uncategorized';
            const accountName = accountMap.get(t.accountId) || 'Account';
            const toAccountName = t.toAccountId ? accountMap.get(t.toAccountId) : null;

            return (
              <div
                key={t.id}
                onClick={() => setSelectedTxId(isSelected ? null : t.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-[#0F2747] border-[#10B981]/50 shadow-md'
                    : 'bg-[#0B1328] border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      t.status === 'reversed'
                        ? 'bg-slate-800 text-slate-500'
                        : t.type === 'income'
                        ? 'bg-[#10B981]/15 text-[#10B981]'
                        : t.type === 'expense'
                        ? 'bg-rose-500/15 text-rose-400'
                        : 'bg-blue-500/15 text-blue-400'
                    }`}>
                      {t.status === 'reversed' ? (
                        <Ban className="w-4 h-4" />
                      ) : t.type === 'income' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : t.type === 'expense' ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowLeftRight className="w-4 h-4" />
                      )}
                    </div>

                    {/* Details */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${
                          t.status === 'reversed' ? 'text-slate-400 line-through' : 'text-slate-100'
                        }`}>
                          {t.description}
                        </span>
                        {/* Status Tag */}
                        {t.status === 'pending' && (
                          <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.2 rounded">
                            Pending
                          </span>
                        )}
                        {t.status === 'reversed' && (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                            Reversed
                          </span>
                        )}
                        {t.isIrregular && (
                          <span className="text-[10px] font-semibold text-[#14B8A6] bg-[#14B8A6]/10 px-1.5 py-0.2 rounded">
                            Variable Income
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{t.date}</span>
                        <span>·</span>
                        <span>{accountName}{toAccountName ? ` → ${toAccountName}` : ''}</span>
                        {t.type === 'expense' && (
                          <>
                            <span>·</span>
                            <span className="text-slate-300">{categoryName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <span className={`font-mono text-sm font-bold tabular-nums block ${
                      t.status === 'reversed'
                        ? 'text-slate-500 line-through'
                        : t.type === 'income'
                        ? 'text-[#10B981]'
                        : t.type === 'expense'
                        ? 'text-rose-400'
                        : 'text-blue-300'
                    }`}>
                      {t.type === 'expense' ? '-' : t.type === 'income' ? '+' : ''}
                      {formatMoney(t.amount, currency)}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {t.status === 'posted' ? 'Cleared' : t.status}
                    </span>
                  </div>
                </div>

                {/* Expanded Action Drawer */}
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs">
                    <div className="text-[11px] text-slate-400 font-mono">
                      ID: {t.id} · Record Audited
                    </div>
                    <div className="flex items-center gap-2">
                      {t.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPostPendingTransaction(t.id);
                          }}
                          className="px-2.5 py-1 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg flex items-center gap-1 font-medium transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Clear / Post</span>
                        </button>
                      )}
                      {t.status !== 'reversed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Reverse this transaction? This creates an auditable reversal record and restores account balance.')) {
                              onReverseTransaction(t.id);
                            }
                          }}
                          className="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 rounded-lg flex items-center gap-1 font-medium transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reverse Record</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
