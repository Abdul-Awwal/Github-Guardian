
import React from 'react';
import type { ExecutiveSummary } from '../types';
import { ClockIcon } from './icons/ClockIcon';

const severityStyles = {
    Critical: 'bg-red-500 text-red-50 border-red-600',
    High: 'bg-orange-500 text-orange-50 border-orange-600',
    Medium: 'bg-yellow-400 text-yellow-900 border-yellow-500',
    Low: 'bg-blue-500 text-blue-50 border-blue-600',
    Informational: 'bg-gray-500 text-gray-50 border-gray-600',
};

export function ExecutiveReport({ summary }: { summary: ExecutiveSummary }): React.ReactNode {
  if (!summary) {
    return null;
  }
  
  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-lg p-6 md:p-8">
      <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-3">Executive Summary</h3>
      <p className="mb-8 text-slate-600 dark:text-slate-300 text-base leading-relaxed">{summary.overview}</p>

      <h4 className="text-xl font-bold mb-6 text-slate-900 dark:text-slate-100">Prioritized Action Plan</h4>
      <div className="space-y-8">
        {summary.prioritizedActions.sort((a, b) => a.rank - b.rank).map((action) => (
          <div key={action.rank} className="flex items-start space-x-4 md:space-x-6">
            <div className="text-4xl font-black text-slate-300 dark:text-slate-600 -mt-1">{action.rank}</div>
            <div className="flex-1 border-l-2 border-slate-200 dark:border-slate-700 pl-4 md:pl-6">
              
              <h5 className="font-semibold text-lg text-slate-800 dark:text-slate-200">{action.title}</h5>

              <div className="mt-3 space-y-3">
                 <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full border ${severityStyles[action.severity]}`}>
                      {action.severity} Severity
                    </span>
                    {action.timeToFix && (
                        <span className="inline-flex items-center px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-full">
                            <ClockIcon className="w-4 h-4 mr-1.5" />
                            {action.timeToFix}
                        </span>
                    )}
                 </div>
                 
                 <p className="text-sm text-slate-600 dark:text-slate-300">
                    <strong className="text-slate-700 dark:text-slate-200 block mb-1">Description:</strong>
                    {action.vulnerabilityDescription}
                 </p>

                 <p className="text-sm text-slate-600 dark:text-slate-300">
                    <strong className="text-slate-700 dark:text-slate-200">Location:</strong>{' '}
                    <span className="font-mono bg-slate-100 dark:bg-slate-700 p-1 rounded-sm text-xs">{action.fileName}</span>
                 </p>

                 <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md border border-slate-200 dark:border-slate-700">
                    <strong className="text-slate-700 dark:text-slate-200 block mb-1">Risk Rationale:</strong> 
                    {action.riskRationale}
                 </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
