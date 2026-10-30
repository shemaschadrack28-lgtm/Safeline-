/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Safeline — Navigation Bars
 * Follows strict Top Bar Contract on desktop & ergonomic thumb-zone bottom navigation on mobile.
 */

import React from 'react';
import { 
  Home, 
  ArrowLeftRight, 
  Plus, 
  Receipt, 
  LineChart, 
  Settings as SettingsIcon,
  ShieldCheck,
  Moon,
  Sun,
  HardDrive
} from 'lucide-react';

export type NavTab = 'home' | 'activity' | 'add' | 'bills' | 'insights' | 'settings';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const TopNavigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800 bg-[#0B1328]/90 dark:bg-[#0B1328]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Title (Single line, display face) */}
        <div 
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0 select-none group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0F2747] to-[#10B981] flex items-center justify-center shadow-md shadow-[#10B981]/10">
            <ShieldCheck className="w-5 h-5 text-[#C6F432]" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-white group-hover:text-[#10B981] transition-colors">
              Safeline
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links (single line, clean text) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => onSelectTab('home')}
            className={`whitespace-nowrap transition-colors hover:text-white ${
              currentTab === 'home' ? 'text-[#10B981] font-semibold' : ''
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onSelectTab('activity')}
            className={`whitespace-nowrap transition-colors hover:text-white ${
              currentTab === 'activity' ? 'text-[#10B981] font-semibold' : ''
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => onSelectTab('bills')}
            className={`whitespace-nowrap transition-colors hover:text-white ${
              currentTab === 'bills' ? 'text-[#10B981] font-semibold' : ''
            }`}
          >
            Bills
          </button>
          <button
            onClick={() => onSelectTab('insights')}
            className={`whitespace-nowrap transition-colors hover:text-white ${
              currentTab === 'insights' ? 'text-[#10B981] font-semibold' : ''
            }`}
          >
            Insights & Budget
          </button>
          <button
            onClick={() => onSelectTab('settings')}
            className={`whitespace-nowrap transition-colors hover:text-white ${
              currentTab === 'settings' ? 'text-[#10B981] font-semibold' : ''
            }`}
          >
            Settings
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme appearance"
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-blue-400" />}
          </button>
          <button
            onClick={() => onSelectTab('add')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold shadow-sm transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Add Record</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export const BottomNavigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B1328]/95 border-t border-slate-800/90 backdrop-blur-lg pb-safe">
      <div className="grid grid-cols-6 items-center h-16 max-w-lg mx-auto px-2">
        {/* Home */}
        <button
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            currentTab === 'home' ? 'text-[#10B981]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-1">Home</span>
        </button>

        {/* Activity */}
        <button
          onClick={() => onSelectTab('activity')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            currentTab === 'activity' ? 'text-[#10B981]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowLeftRight className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-1">Activity</span>
        </button>

        {/* Add (Prominent Central Touch Target) */}
        <div className="flex items-center justify-center">
          <button
            onClick={() => onSelectTab('add')}
            aria-label="Add transaction or bill"
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
              currentTab === 'add'
                ? 'bg-[#C6F432] text-[#0B1328]'
                : 'bg-[#10B981] text-white shadow-[#10B981]/25'
            }`}
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Bills */}
        <button
          onClick={() => onSelectTab('bills')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            currentTab === 'bills' ? 'text-[#10B981]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-1">Bills</span>
        </button>

        {/* Insights */}
        <button
          onClick={() => onSelectTab('insights')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            currentTab === 'insights' ? 'text-[#10B981]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LineChart className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-1">Insights</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => onSelectTab('settings')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
            currentTab === 'settings' ? 'text-[#10B981]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <SettingsIcon className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-1">Settings</span>
        </button>
      </div>
    </nav>
  );
};
