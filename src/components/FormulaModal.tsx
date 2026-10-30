/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safeline — Formula Transparency Inspector Modal
 * Displays transparent math, inputs, and limitations for any calculated financial figure.
 */

import React from 'react';
import { CalculationExplanation } from '../types/finance';
import { Info, X, ShieldAlert, Cpu } from 'lucide-react';

interface FormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  explanation: CalculationExplanation | null;
}

export const FormulaModal: React.FC<FormulaModalProps> = ({ isOpen, onClose, explanation }) => {
  if (!isOpen || !explanation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-[#0F2747] border border-slate-700 text-slate-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="formula-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/80 bg-[#0B1328]/50">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-[#10B981]" />
            <h3 id="formula-modal-title" className="text-base font-semibold text-slate-100">
              Calculation Transparency
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close calculation inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm">
          {/* Metric Name & Engine */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400">Metric</span>
              <p className="text-base font-bold text-[#F0F9FF]">{explanation.metricName}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Engine Version</span>
              <div className="flex items-center gap-1 text-xs text-[#14B8A6] font-mono">
                <Cpu className="w-3.5 h-3.5" />
                <span>{explanation.formulaVersion}</span>
              </div>
            </div>
          </div>

          {/* Mathematical Formula */}
          <div className="bg-[#0B1328] p-3.5 rounded-xl border border-slate-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Mathematical Formula
            </span>
            <div className="mt-1 font-mono text-sm text-[#C6F432] break-words">
              {explanation.formula}
            </div>
          </div>

          {/* Inputs & Values */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Input Values
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {Object.entries(explanation.inputs).map(([key, val]) => (
                <div key={key} className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
                  <span className="text-xs text-slate-400 block truncate" title={key}>{key}</span>
                  <span className="font-mono text-xs font-semibold text-slate-200 block truncate" title={String(val)}>
                    {val === null || val === undefined ? '—' : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Caveats & Disclaimers */}
          {explanation.caveats && explanation.caveats.length > 0 && (
            <div className="bg-amber-950/30 border border-amber-800/40 p-3 rounded-xl text-amber-200/90 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-amber-300">
                <ShieldAlert className="w-4 h-4" />
                <span>Advisory Notice</span>
              </div>
              {explanation.caveats.map((c, i) => (
                <p key={i} className="leading-relaxed">{c}</p>
              ))}
            </div>
          )}

          {/* Missing Data Conditions */}
          {explanation.missingDataNotes && explanation.missingDataNotes.length > 0 && (
            <div className="bg-slate-800/70 border border-slate-700 p-3 rounded-xl text-xs space-y-1">
              <span className="text-slate-300 font-medium">Missing Inputs:</span>
              {explanation.missingDataNotes.map((note, i) => (
                <p key={i} className="text-slate-400">{note}</p>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <div className="text-[11px] text-slate-400 text-right pt-2 border-t border-slate-800">
            Calculated: {new Date(explanation.computationDate).toLocaleString()} · Deterministic
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-700/80 bg-[#0B1328]/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-[#10B981] hover:bg-[#059669] text-white rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
