/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safeline — Add Transaction / Record Screen
 * Built-in financial arithmetic calculator, posted vs pending, and irregular income tagging.
 */

import React, { useState } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight, 
  Calculator, 
  Check, 
  Calendar, 
  Tag, 
  CreditCard, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { 
  Account, 
  BudgetCategory, 
  Transaction, 
  TransactionStatus, 
  TransactionType, 
  UserSettings 
} from '../types/finance';
import { formatMoney } from '../services/financialEngine';

interface AddScreenProps {
  accounts: Account[];
  categories: BudgetCategory[];
  settings: UserSettings;
  onSaveTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export const AddScreen: React.FC<AddScreenProps> = ({
  accounts,
  categories,
  settings,
  onSaveTransaction,
  onCancel,
}) => {
  const currency = settings.currency;

  const [type, setType] = useState<TransactionType>('expense');
  const [status, setStatus] = useState<TransactionStatus>('posted');
  const [displayAmount, setDisplayAmount] = useState<string>('0');
  const [description, setDescription] = useState<string>('');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState<string>(accounts[1]?.id || '');
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isIrregular, setIsIrregular] = useState<boolean>(settings.irregularIncomeMode);
  const [isFee, setIsFee] = useState<boolean>(false);
  const [isRefund, setIsRefund] = useState<boolean>(false);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [calcExpression, setCalcExpression] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Integer Minor Units calculation
  const getParsedAmount = (): number => {
    const rawNum = parseFloat(displayAmount.replace(/,/g, ''));
    if (isNaN(rawNum) || rawNum <= 0) return 0;
    // RWF / JPY = 0 decimals
    if (currency === 'RWF' || currency === 'JPY' || currency === 'UGX' || currency === 'TZS') {
      return Math.round(rawNum);
    }
    // USD, EUR, GBP, KES = 2 decimals
    return Math.round(rawNum * 100);
  };

  const handleNumpad = (char: string) => {
    if (char === 'C') {
      setDisplayAmount('0');
      setCalcExpression('');
      return;
    }
    if (char === 'DEL') {
      setDisplayAmount((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      return;
    }
    if (char === '=') {
      try {
        // Safe evaluation of simple math expressions (+ - * /)
        const sanitized = calcExpression.replace(/[^0-9+\-*/.]/g, '');
        // eslint-disable-next-line no-eval
        const result = Function(`'use strict'; return (${sanitized})`)();
        if (typeof result === 'number' && !isNaN(result) && result >= 0) {
          setDisplayAmount(String(Math.round(result)));
          setCalcExpression('');
        }
      } catch {
        setErrorMsg('Invalid calculation expression');
      }
      return;
    }

    if (['+', '-', '*', '/'].includes(char)) {
      setCalcExpression(`${displayAmount} ${char} `);
      setDisplayAmount('0');
      return;
    }

    setDisplayAmount((prev) => {
      if (prev === '0') return char;
      return prev + char;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountMinor = getParsedAmount();
    if (amountMinor <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.');
      return;
    }

    if (!accountId) {
      setErrorMsg('Please select an account.');
      return;
    }

    if (type === 'transfer' && accountId === toAccountId) {
      setErrorMsg('Transfer source and destination accounts must be different.');
      return;
    }

    onSaveTransaction({
      accountId,
      date,
      amount: amountMinor,
      type,
      status,
      categoryId: type === 'expense' ? categoryId : '',
      description: description.trim() || `${type.toUpperCase()} transaction`,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      isFee,
      isRefund,
      isIrregular: type === 'income' ? isIrregular : false,
      isExpectedOnly: status === 'pending' && type === 'income',
    });
  };

  return (
    <div className="max-w-xl mx-auto pb-24 md:pb-12 animate-in fade-in duration-150">
      <div className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-5 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-white">Record Transaction</h2>
            <p className="text-xs text-slate-400">
              {status === 'posted' ? 'Posted (Clears immediately)' : 'Pending (Draft / Unposted)'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCalculator(!showCalculator)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              showCalculator 
                ? 'bg-[#C6F432] text-[#0B1328]' 
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Calculator</span>
          </button>
        </div>

        {/* Error Notice */}
        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Segmented Control */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#0B1328] rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                type === 'expense'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Expense</span>
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                type === 'income'
                  ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Income</span>
            </button>
            <button
              type="button"
              onClick={() => setType('transfer')}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                type === 'transfer'
                  ? 'bg-[#2563EB]/20 text-blue-300 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Transfer</span>
            </button>
          </div>

          {/* Amount Display & Keypad */}
          <div className="bg-[#0B1328] p-4 rounded-xl border border-slate-800 text-center relative">
            {calcExpression && (
              <span className="text-xs text-slate-400 block font-mono">{calcExpression}</span>
            )}
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-400 font-mono">
                {currency === 'RWF' ? 'FRw' : currency === 'USD' ? '$' : currency}
              </span>
              <input
                type="text"
                value={displayAmount}
                onChange={(e) => setDisplayAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full text-3xl sm:text-4xl font-extrabold font-mono text-[#F0F9FF] bg-transparent text-center focus:outline-none"
                placeholder="0"
              />
            </div>
          </div>

          {/* Built-in Numpad & Calculator */}
          {showCalculator && (
            <div className="grid grid-cols-4 gap-2 bg-[#0B1328] p-3 rounded-xl border border-slate-800">
              {['7', '8', '9', '/'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleNumpad(k)}
                  className="py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono text-sm font-semibold transition-colors"
                >
                  {k}
                </button>
              ))}
              {['4', '5', '6', '*'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleNumpad(k)}
                  className="py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono text-sm font-semibold transition-colors"
                >
                  {k}
                </button>
              ))}
              {['1', '2', '3', '-'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleNumpad(k)}
                  className="py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono text-sm font-semibold transition-colors"
                >
                  {k}
                </button>
              ))}
              {['C', '0', 'DEL', '+'].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleNumpad(k)}
                  className={`py-2.5 rounded-lg text-white font-mono text-sm font-semibold transition-colors ${
                    k === 'C' ? 'bg-rose-900/40 text-rose-300' : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  {k}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleNumpad('=')}
                className="col-span-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white font-mono text-sm font-bold rounded-lg transition-colors"
              >
                = Calculate
              </button>
            </div>
          )}

          {/* Status: Posted vs Pending */}
          <div className="flex items-center justify-between p-3 bg-[#0B1328]/60 rounded-xl border border-slate-800">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Transaction Status</span>
              <span className="text-[11px] text-slate-400">
                {status === 'posted' ? 'Settled & affects current balances' : 'Draft / Unposted obligation'}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setStatus('posted')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  status === 'posted' ? 'bg-[#10B981] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Posted
              </button>
              <button
                type="button"
                onClick={() => setStatus('pending')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  status === 'pending' ? 'bg-amber-500 text-[#0B1328] font-bold shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pending
              </button>
            </div>
          </div>

          {/* Irregular Income Switch (if Income) */}
          {type === 'income' && (
            <div className="flex items-center justify-between p-3 bg-[#0B1328]/60 rounded-xl border border-slate-800">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Irregular / Variable Income</span>
                <span className="text-[11px] text-slate-400">
                  Tag as variable gig, client invoice, harvest, or commission
                </span>
              </div>
              <input
                type="checkbox"
                checked={isIrregular}
                onChange={(e) => setIsIrregular(e.target.checked)}
                className="w-4 h-4 rounded text-[#10B981] bg-slate-900 border-slate-700 focus:ring-[#10B981]"
              />
            </div>
          )}

          {/* Account Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-[#10B981]" />
              <span>{type === 'transfer' ? 'From Account' : 'Account'}</span>
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[#10B981]"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatMoney(acc.balance, acc.currency)})
                </option>
              ))}
            </select>
          </div>

          {/* Transfer Destination (if Transfer) */}
          {type === 'transfer' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
                <span>To Account</span>
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[#10B981]"
              >
                {accounts.filter((a) => a.id !== accountId).map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatMoney(acc.balance, acc.currency)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category Selection (if Expense) */}
          {type === 'expense' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#C6F432]" />
                <span>Budget Category</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[#10B981]"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.group.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Date</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-[#10B981]"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Description / Merchant</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Kimironko Market groceries, MoMo cash out"
              className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#10B981]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={onCancel}
              className="w-1/3 py-2.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-2/3 py-2.5 text-xs font-bold rounded-xl bg-[#10B981] hover:bg-[#059669] text-white shadow-lg shadow-[#10B981]/20 flex items-center justify-center gap-1.5 transition-transform active:scale-[0.99]"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Save Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
