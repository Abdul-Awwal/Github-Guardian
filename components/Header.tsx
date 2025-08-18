
import React from 'react';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

export function Header(): React.ReactNode {
  return (
    <header className="bg-white dark:bg-slate-900/70 shadow-md backdrop-blur-lg sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-20">
          <div className="flex items-center space-x-3">
            <ShieldCheckIcon className="w-10 h-10 text-brand-secondary"/>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              IaC Guardian
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
}
