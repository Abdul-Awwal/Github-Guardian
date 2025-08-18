
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { RepoInput } from './components/RepoInput';
import { ResultsDisplay } from './components/ResultsDisplay';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { analyzeGitHubRepository } from './services/geminiService';
import type { AnalysisResult } from './types';

// More permissive regex to validate a potential GitHub repo URL format.
// The heavy lifting of parsing is done in the service.
const GITHUB_URL_REGEX = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+/;

export default function App(): React.ReactNode {
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!repoUrl) {
      setError("Please enter a GitHub repository URL.");
      return;
    }
    if (!GITHUB_URL_REGEX.test(repoUrl)) {
      setError("Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo).");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await analyzeGitHubRepository(repoUrl);
      setAnalysisResult(result);
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during analysis.";
      setError(`Analysis failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [repoUrl]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-brand-dark text-slate-800 dark:text-slate-200 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-lg text-slate-600 dark:text-slate-400 mb-8">
            Enter the URL of a public GitHub repository to scan its code and Infrastructure as Code files for vulnerabilities and receive intelligent, context-aware recommendations with source citations.
          </p>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 md:p-8 mb-8">
            <RepoInput 
              repoUrl={repoUrl}
              onRepoUrlChange={setRepoUrl}
              disabled={isLoading}
            />
            <div className="mt-6 text-center">
              <button
                onClick={handleAnalyze}
                disabled={isLoading || !repoUrl}
                className="inline-flex items-center justify-center px-8 py-3 font-semibold text-white bg-brand-secondary rounded-lg shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed dark:disabled:bg-slate-600 transition-all duration-300 transform hover:scale-105"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5 mr-2" />
                    Analyze Repository
                  </>
                )}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-8 shadow-md" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {analysisResult && !isLoading && (
            <ResultsDisplay result={analysisResult} repoUrl={repoUrl} />
          )}
        </div>
      </main>
      <footer className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
        <p>Powered by Google Gemini</p>
      </footer>
    </div>
  );
}
