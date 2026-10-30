/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safeline — Settings Screen
 * Configurable parameters: currency, safety multiplier, irregular income, cooling-off, work hours, and honest offline storage.
 */

import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Shield, 
  Coins, 
  Hourglass, 
  Briefcase, 
  HardDrive, 
  Download, 
  Upload, 
  Moon, 
  Sun,
  AlertTriangle,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { CURRENCIES, CurrencyCode, UserSettings } from '../types/finance';
import { formatMoney } from '../services/financialEngine';

interface SettingsScreenProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonStr: string) => boolean;
  onResetDemoData: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onExportBackup,
  onImportBackup,
  onResetDemoData,
}) => {
  const currency = settings.currency;
  const [reserveInput, setReserveInput] = useState(String(settings.additionalReserve || 0));
  const [thresholdInput, setThresholdInput] = useState(String(settings.coolingOffThreshold || 40000));
  const [hourlyWageInput, setHourlyWageInput] = useState(String(settings.netHourlyEarnings || ''));
  const [emergencyTargetInput, setEmergencyTargetInput] = useState(String(settings.emergencyFundTarget || 300000));
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleSaveSafetyParams = (e: React.FormEvent) => {
    e.preventDefault();
    const reserveMinor = Math.max(0, Math.round(parseFloat(reserveInput.replace(/,/g, '')) || 0));
    onUpdateSettings({ additionalReserve: reserveMinor });
  };

  const handleSaveGuardrails = (e: React.FormEvent) => {
    e.preventDefault();
    const threshMinor = Math.max(0, Math.round(parseFloat(thresholdInput.replace(/,/g, '')) || 0));
    const wageMinor = hourlyWageInput ? Math.max(0, Math.round(parseFloat(hourlyWageInput.replace(/,/g, '')) || 0)) : null;
    onUpdateSettings({
      coolingOffThreshold: threshMinor,
      netHourlyEarnings: wageMinor,
    });
  };

  const handleSaveStage1Target = (e: React.FormEvent) => {
    e.preventDefault();
    const targetMinor = Math.max(0, Math.round(parseFloat(emergencyTargetInput.replace(/,/g, '')) || 0));
    onUpdateSettings({ emergencyFundTarget: targetMinor });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = onImportBackup(content);
      setImportStatus(success ? 'Backup imported successfully!' : 'Invalid backup format');
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24 md:pb-12 animate-in fade-in">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-white">Application Settings</h1>
        <p className="text-xs text-slate-400">
          Configure financial engine parameters, currency, guardrails, and data backup
        </p>
      </div>

      {/* Currency Selection */}
      <section className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-[#C6F432]" />
          <h2 className="text-sm font-bold text-white">Default Currency</h2>
        </div>
        <p className="text-xs text-slate-400">
          RWF is default (0 decimal places). Switching currency preserves exact integer minor units.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {Object.values(CURRENCIES).map((c) => (
            <button
              key={c.code}
              onClick={() => onUpdateSettings({ currency: c.code })}
              className={`p-2 rounded-xl border text-left transition-colors ${
                currency === c.code
                  ? 'bg-[#10B981]/20 border-[#10B981] text-white shadow-sm'
                  : 'bg-[#0B1328] border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <span className="font-bold text-xs block">{c.code} ({c.symbol})</span>
              <span className="text-[10px] text-slate-400 block truncate">{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Financial Safety Line Parameters (M & R) */}
      <section className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#10B981]" />
          <h2 className="text-sm font-bold text-white">Personal Financial Safety Line Engine</h2>
        </div>
        <p className="text-xs text-slate-400">
          Safety Target S = (E × M) + U + R. Customize your resilience multiplier M and extra reserve R.
        </p>

        <form onSubmit={handleSaveSafetyParams} className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Essential Months Multiplier (M)
              </label>
              <select
                value={settings.safetyMultiplier}
                onChange={(e) => onUpdateSettings({ safetyMultiplier: parseInt(e.target.value, 10) })}
                className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981]"
              >
                <option value={1}>1 Month of Essential Expenses</option>
                <option value={2}>2 Months of Essential Expenses</option>
                <option value={3}>3 Months of Essential Expenses (Standard)</option>
                <option value={4}>4 Months of Essential Expenses</option>
                <option value={6}>6 Months of Essential Expenses (Maximum)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Additional Safety Reserve (R)
              </label>
              <input
                type="text"
                value={reserveInput}
                onChange={(e) => setReserveInput(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#10B981]"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Next Reliable Income Date
            </label>
            <input
              type="date"
              value={settings.nextReliableIncomeDate || ''}
              onChange={(e) => onUpdateSettings({ nextReliableIncomeDate: e.target.value || null })}
              className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981]"
            />
            <span className="text-[10px] text-slate-400 block mt-1">
              Essential bills due before this date are counted into U (Immediate Safety Floor).
            </span>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold rounded-lg"
            >
              Update Safety Parameters
            </button>
          </div>
        </form>
      </section>

      {/* Spending Guardrails & Cooling-Off Config */}
      <section className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <Hourglass className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white">Spending Guardrails & Cooling-Off Timer</h2>
        </div>
        <p className="text-xs text-slate-400">
          Configure what counts as a large purchase and how many hours you want to reflect before buying.
        </p>

        <form onSubmit={handleSaveGuardrails} className="space-y-3 pt-1">
          <div className="flex items-center justify-between p-3 bg-[#0B1328] rounded-xl border border-slate-800">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Enable Cooling-Off Timer</span>
              <span className="text-[10px] text-slate-400">
                Offers an optional waiting pause for decisions exceeding threshold
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.coolingOffEnabled}
              onChange={(e) => onUpdateSettings({ coolingOffEnabled: e.target.checked })}
              className="w-4 h-4 rounded text-[#10B981] bg-slate-900 border-slate-700"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Large Purchase Threshold ({currency})
              </label>
              <input
                type="text"
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#10B981]"
                placeholder="40000"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Cooling Period Duration
              </label>
              <select
                value={settings.coolingOffHours}
                onChange={(e) => onUpdateSettings({ coolingOffHours: parseInt(e.target.value, 10) })}
                className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981]"
              >
                <option value={12}>12 Hours Pause</option>
                <option value={24}>24 Hours Pause (Recommended)</option>
                <option value={48}>48 Hours Pause</option>
                <option value={72}>72 Hours Pause</option>
              </select>
            </div>
          </div>

          {/* Work Hours Config */}
          <div className="pt-2 border-t border-slate-800">
            <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-[#14B8A6]" />
              <span>Net Hourly Wage ({currency} / hour)</span>
            </label>
            <input
              type="text"
              value={hourlyWageInput}
              onChange={(e) => setHourlyWageInput(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="e.g. 2500"
              className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#10B981]"
            />
            <span className="text-[10px] text-slate-400 block mt-1">
              Used in Affordability Checker to compute: Work Hours = Purchase ÷ Net Hourly Earnings. Factual, non-judgmental.
            </span>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold rounded-lg"
            >
              Save Guardrail Settings
            </button>
          </div>
        </form>
      </section>

      {/* Stage Tracker Configuration */}
      <section className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white">Financial Stage Targets</h2>
        </div>
        <form onSubmit={handleSaveStage1Target} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Stage 1: Emergency Fund Target ({currency})
              </label>
              <input
                type="text"
                value={emergencyTargetInput}
                onChange={(e) => setEmergencyTargetInput(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#10B981]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Stage 2: Debt Repayment Strategy
              </label>
              <select
                value={settings.debtPayoffStrategy}
                onChange={(e) => onUpdateSettings({ debtPayoffStrategy: e.target.value as any })}
                className="w-full bg-[#0B1328] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981]"
              >
                <option value="avalanche">Avalanche (Highest Interest Rate First)</option>
                <option value="snowball">Snowball (Smallest Principal First)</option>
                <option value="custom">Custom Order</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold rounded-lg"
            >
              Save Stage Targets
            </button>
          </div>
        </form>
      </section>

      {/* Data Backup & Offline Privacy */}
      <section className="bg-[#0F2747] border border-slate-700/80 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-[#14B8A6]" />
          <h2 className="text-sm font-bold text-white">Local Data & Backup Security</h2>
        </div>
        <div className="p-3 bg-[#0B1328] rounded-xl border border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-2 text-[#10B981] font-semibold mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Honest Offline Storage Notice</span>
          </div>
          <p className="leading-relaxed text-[11px] text-slate-400">
            Safeline stores your financial records locally in this device's browser memory. Your data is <strong>never uploaded to a remote cloud server without explicit authorization</strong>. To keep your records safe across browsers or devices, use the export backup feature below.
          </p>
        </div>

        {importStatus && (
          <div className="p-2.5 bg-[#10B981]/20 border border-[#10B981] rounded-xl text-xs text-[#10B981] font-semibold">
            {importStatus}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={onExportBackup}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Export Backup (JSON)</span>
          </button>

          <label className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Import Backup</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={() => {
              if (window.confirm('Reset application to realistic demo records? This will replace current local data.')) {
                onResetDemoData();
              }
            }}
            className="px-3.5 py-2 bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 text-xs font-semibold rounded-xl border border-rose-800/40 ml-auto"
          >
            Reset Demo Records
          </button>
        </div>
      </section>

      {/* Disclaimer */}
      <div className="text-center text-[11px] text-slate-500 py-2">
        Safeline — Wizard Edition · Phase 1: Core Money Control · Estimates, not financial advice.
      </div>
    </div>
  );
};
