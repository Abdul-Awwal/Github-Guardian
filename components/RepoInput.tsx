
import React from 'react';
import { GithubIcon } from './icons/GithubIcon';

interface RepoInputProps {
  repoUrl: string;
  onRepoUrlChange: (url: string) => void;
  disabled: boolean;
}

export function RepoInput({ repoUrl, onRepoUrlChange, disabled }: RepoInputProps): React.ReactNode {
  return (
    <div>
      <label htmlFor="repo-url" className="block text-lg font-semibold text-slate-800 dark:text-slate-200">
        GitHub Repository URL
      </label>
      <div className="mt-2 relative rounded-md shadow-sm">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <GithubIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </div>
        <input
          type="text"
          name="repo-url"
          id="repo-url"
          value={repoUrl}
          onChange={(e) => onRepoUrlChange(e.target.value)}
          disabled={disabled}
          className="block w-full rounded-md border-0 py-2.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-secondary dark:bg-slate-700 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-brand-secondary sm:text-sm sm:leading-6 transition-colors"
          placeholder="https://github.com/owner/repository-name"
          aria-label="GitHub Repository URL"
        />
      </div>
    </div>
  );
}
