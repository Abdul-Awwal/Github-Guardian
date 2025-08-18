
import React, { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import type { AnalysisResult, Vulnerability, Source } from '../types';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ExecutiveReport } from './ExecutiveReport';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ListBulletIcon } from './icons/ListBulletIcon';
import { ClockIcon } from './icons/ClockIcon';

interface ResultsDisplayProps {
  result: AnalysisResult;
  repoUrl: string;
}

const severityStyles = {
  Critical: 'bg-red-100 text-red-800 border-red-500 dark:bg-red-900/30 dark:text-red-300',
  High: 'bg-orange-100 text-orange-800 border-orange-500 dark:bg-orange-900/30 dark:text-orange-300',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-500 dark:bg-yellow-900/30 dark:text-yellow-300',
  Low: 'bg-blue-100 text-blue-800 border-blue-500 dark:bg-blue-900/30 dark:text-blue-300',
  Informational: 'bg-gray-100 text-gray-800 border-gray-500 dark:bg-gray-700/30 dark:text-gray-300',
};

const LinkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
    <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 005.656 5.656l3-3a4 4 0 00-.225-5.865z" />
  </svg>
);


const SourceList: React.FC<{ sources?: Source[] }> = ({ sources }) => {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-3">
      <h5 className="font-semibold text-xs text-slate-700 dark:text-slate-300 mb-2">Sources:</h5>
      <ul className="space-y-1">
        {sources.map((source, i) => (
          <li key={i}>
            <a 
              href={source.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center text-sm text-brand-secondary hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              <LinkIcon className="w-4 h-4 mr-1.5 flex-shrink-0"/>
              <span className="truncate">{source.title}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

const VulnerabilityCard: React.FC<{ vulnerability: Vulnerability }> = ({ vulnerability }) => (
  <div className={`border-l-4 p-4 rounded-r-lg shadow-md ${severityStyles[vulnerability.severity]}`}>
    <div className="flex items-start justify-between">
      <div className="flex-grow">
        <span className={`font-bold text-sm uppercase`}>{vulnerability.severity}</span>
        <p className="font-semibold mt-1 text-slate-900 dark:text-slate-100">{vulnerability.description}</p>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          In <span className="font-mono bg-slate-200 dark:bg-slate-600 px-1 py-0.5 rounded">{vulnerability.fileName}</span>
          {vulnerability.line && ` around line ${vulnerability.line}`}
        </p>
      </div>
      <div className="flex flex-col items-end flex-shrink-0 ml-4 space-y-2">
        <AlertTriangleIcon className="w-6 h-6 opacity-70" />
        {vulnerability.timeToFix && (
            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-700/50 rounded-full">
                <ClockIcon className="w-3 h-3 mr-1" />
                {vulnerability.timeToFix}
            </span>
        )}
      </div>
    </div>
    <div className="mt-4">
      <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">Recommendation:</h4>
      <pre className="bg-slate-100 dark:bg-slate-900/50 p-3 rounded-md text-sm whitespace-pre-wrap font-mono overflow-x-auto text-slate-700 dark:text-slate-300">
        <code>{vulnerability.recommendation}</code>
      </pre>
      <SourceList sources={vulnerability.sources} />
    </div>
  </div>
);

const TabButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    role="tab"
    aria-selected={isActive}
    className={`flex items-center px-4 py-3 font-semibold text-sm transition-colors duration-200 focus:outline-none -mb-px
      ${isActive
        ? 'border-b-2 border-brand-secondary text-brand-secondary dark:text-blue-400 dark:border-blue-400'
        : 'border-b-2 border-transparent text-slate-500 hover:text-brand-secondary dark:hover:text-blue-400'
      }`}
  >
    {icon}
    {label}
  </button>
);


export function ResultsDisplay({ result, repoUrl }: ResultsDisplayProps): React.ReactNode {
  const { vulnerabilities, holisticRecommendations, executiveSummary } = result;
  const [activeTab, setActiveTab] = useState('executive');

  const handleDownloadPdf = useCallback(() => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const FONT_SIZES = { h1: 22, h2: 18, h3: 14, body: 11, small: 9, code: 10 };
    const MARGIN = 15;
    const PAGE_WIDTH = doc.internal.pageSize.getWidth();
    const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2;
    let cursorY = MARGIN;

    const severityColors = {
        Critical: { bg: [220, 38, 38] }, High: { bg: [249, 115, 22] },
        Medium: { bg: [234, 179, 8] }, Low: { bg: [59, 130, 246] },
        Informational: { bg: [107, 114, 128] },
    };

    const addPageIfNeeded = (spaceNeeded: number) => {
        if (cursorY + spaceNeeded > doc.internal.pageSize.getHeight() - MARGIN) {
            doc.addPage();
            cursorY = MARGIN;
        }
    };

    // --- Report Header ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONT_SIZES.h1);
    doc.text("IaC Guardian Security Report", PAGE_WIDTH / 2, cursorY, { align: 'center' });
    cursorY += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_SIZES.body);
    doc.setTextColor(80, 80, 80);
    doc.text(`Repository: ${repoUrl}`, PAGE_WIDTH / 2, cursorY, { align: 'center' });
    cursorY += 15;

    // --- Executive Summary Section ---
    if (executiveSummary) {
        addPageIfNeeded(60);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZES.h2);
        doc.setTextColor(0,0,0);
        doc.text("Executive Summary", MARGIN, cursorY);
        cursorY += 10;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FONT_SIZES.body);
        doc.setTextColor(40, 40, 40);
        const overviewLines = doc.splitTextToSize(executiveSummary.overview, MAX_WIDTH);
        doc.text(overviewLines, MARGIN, cursorY);
        cursorY += overviewLines.length * 5 + 10;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZES.h3);
        doc.text("Prioritized Action Plan", MARGIN, cursorY);
        cursorY += 8;
        
        const renderDetailBlock = (label, text) => {
            addPageIfNeeded(15);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0,0,0);
            doc.text(label, MARGIN + 5, cursorY);
            cursorY += 5;

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            const textLines = doc.splitTextToSize(text, MAX_WIDTH - 10);
            doc.text(textLines, MARGIN + 5, cursorY);
            cursorY += textLines.length * 4.5 + 4;
        };

        executiveSummary.prioritizedActions.sort((a,b) => a.rank - b.rank).forEach(action => {
            addPageIfNeeded(50);
            
            // Action Header with Rank
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(FONT_SIZES.h3);
            doc.setTextColor(0, 0, 0);
            const titleText = `${action.rank}. ${action.title}`;
            const titleLines = doc.splitTextToSize(titleText, MAX_WIDTH);
            doc.text(titleLines, MARGIN, cursorY);
            cursorY += titleLines.length * 5 + 4;

            // Severity & Time to Fix Row
            const severityColor = severityColors[action.severity];
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(FONT_SIZES.small);
            doc.setTextColor(severityColor.bg[0], severityColor.bg[1], severityColor.bg[2]);
            const severityText = `Severity: ${action.severity}`;
            doc.text(severityText, MARGIN + 5, cursorY);

            if (action.timeToFix) {
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(80, 80, 80);
              const timeText = `Est. Fix Time: ${action.timeToFix}`;
              const severityTextWidth = doc.getTextWidth(severityText);
              doc.text(timeText, MARGIN + 5 + severityTextWidth + 5, cursorY);
            }
            cursorY += 8;

            // Details
            renderDetailBlock("Description:", action.vulnerabilityDescription);
            renderDetailBlock("Location:", action.fileName);
            renderDetailBlock("Risk Rationale:", action.riskRationale);
            
            // Add a separator line
            if (action.rank < executiveSummary.prioritizedActions.length) {
                doc.setDrawColor(220, 220, 220);
                doc.line(MARGIN, cursorY, PAGE_WIDTH - MARGIN, cursorY);
                cursorY += 8;
            }
        });
        cursorY += 10;
    }


    // --- Vulnerabilities Section ---
    if (vulnerabilities.length > 0) {
        addPageIfNeeded(20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SIZES.h2);
        doc.setTextColor(0, 0, 0);
        doc.text(`Detailed Vulnerabilities (${vulnerabilities.length})`, MARGIN, cursorY);
        cursorY += 10;

        vulnerabilities.forEach(vuln => {
            addPageIfNeeded(40);
            
            const color = severityColors[vuln.severity];
            doc.setFillColor(color.bg[0], color.bg[1], color.bg[2]);
            doc.rect(MARGIN, cursorY, 3, 10, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(FONT_SIZES.small);
            doc.setTextColor(color.bg[0], color.bg[1], color.bg[2]);
            doc.text(vuln.severity.toUpperCase(), MARGIN + 5, cursorY + 4);
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(FONT_SIZES.h3);
            doc.setTextColor(0, 0, 0);
            const titleLines = doc.splitTextToSize(vuln.description, MAX_WIDTH - 25);
            doc.text(titleLines, MARGIN + 5, cursorY + 10);
            cursorY += titleLines.length * 5 + 8;
            
            addPageIfNeeded(10);
            doc.setFont('courier', 'normal');
            doc.setFontSize(FONT_SIZES.small);
            doc.setTextColor(80, 80, 80);
            doc.text(`In: ${vuln.fileName}${vuln.line ? ` (line ~${vuln.line})` : ''}`, MARGIN + 5, cursorY);
            cursorY += 6;

            if (vuln.timeToFix) {
              addPageIfNeeded(5);
              doc.text(`Est. Fix Time: ${vuln.timeToFix}`, MARGIN + 5, cursorY);
              cursorY += 6;
            } else {
              cursorY += 2;
            }

            addPageIfNeeded(15);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(FONT_SIZES.body);
            doc.setTextColor(0,0,0);
            doc.text("Recommendation:", MARGIN + 5, cursorY);
            cursorY += 6;

            addPageIfNeeded(20);
            const recLines = doc.splitTextToSize(vuln.recommendation, MAX_WIDTH - 9);
            const recHeight = (recLines.length * FONT_SIZES.code * 0.35) + 4;
            doc.setFillColor(243, 244, 246);
            doc.rect(MARGIN + 5, cursorY - 4, MAX_WIDTH - 5, recHeight, 'F');
            doc.setFont('courier', 'normal');
            doc.setFontSize(FONT_SIZES.code);
            doc.setTextColor(29, 78, 216);
            doc.text(recLines, MARGIN + 7, cursorY);
            cursorY += recHeight;

            if (vuln.sources && vuln.sources.length > 0) {
                // ... Source rendering logic
            }
            cursorY += 10;
        });
    }
    
    const repoFileName = repoUrl.split('/').slice(-2).join('_').replace(/\.git$/, '');
    doc.save(`IaC-Guardian-Report_${repoFileName}.pdf`);
  }, [result, repoUrl]);

  const hasContent = executiveSummary?.prioritizedActions.length > 0 || vulnerabilities.length > 0;
  const noFilesFound = holisticRecommendations.some(rec => rec.title === "No Analyzable Code Files Found") && vulnerabilities.length === 0;


  return (
    <div className="space-y-6">
      {hasContent && (
        <div className="flex justify-end items-center">
            <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center justify-center px-4 py-2 font-semibold text-white bg-brand-accent rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-slate-400 disabled:cursor-not-allowed dark:disabled:bg-slate-600 transition-all duration-300 transform hover:scale-105"
            >
                <DownloadIcon className="w-5 h-5 mr-2" />
                Download Report
            </button>
        </div>
      )}

      {noFilesFound ? (
         <div className="text-center p-12 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl shadow-md">
            <h2 className="mt-4 text-2xl font-bold text-blue-800 dark:text-blue-300">{holisticRecommendations[0].title}</h2>
            <p className="mt-2 text-blue-700 dark:text-blue-400">
             {holisticRecommendations[0].description}
            </p>
          </div>
      ) : vulnerabilities.length === 0 && executiveSummary.prioritizedActions.length === 0 ? (
          <div className="text-center p-12 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl shadow-md">
            <CheckCircleIcon className="w-16 h-16 mx-auto text-green-500" />
            <h2 className="mt-4 text-2xl font-bold text-green-800 dark:text-green-300">No Vulnerabilities Found!</h2>
            <p className="mt-2 text-green-700 dark:text-green-400">
              Congratulations! Your infrastructure code appears to be secure based on our analysis.
            </p>
          </div>
        ) : (
        <div>
            <div className="border-b border-slate-300 dark:border-slate-700" role="tablist">
                <TabButton icon={<ClipboardListIcon className="w-5 h-5 mr-2" />} label="Executive Summary" isActive={activeTab === 'executive'} onClick={() => setActiveTab('executive')} />
                <TabButton icon={<ListBulletIcon className="w-5 h-5 mr-2" />} label="Detailed Findings" isActive={activeTab === 'details'} onClick={() => setActiveTab('details')} />
            </div>

            <div className="mt-6">
                {activeTab === 'executive' && <ExecutiveReport summary={executiveSummary} />}
                {activeTab === 'details' && (
                     <div className="space-y-12">
                        {vulnerabilities.length > 0 && (
                        <div>
                            <h3 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100">Vulnerabilities Found ({vulnerabilities.length})</h3>
                            <div className="space-y-4">
                            {vulnerabilities.map((vuln, index) => (
                                <VulnerabilityCard key={index} vulnerability={vuln} />
                            ))}
                            </div>
                        </div>
                        )}

                        {holisticRecommendations.length > 0 && (
                        <div>
                            <h3 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100">Holistic Recommendations</h3>
                            <div className="space-y-4">
                            {holisticRecommendations.map((rec, index) => (
                                <div key={index} className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5">
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                        <ShieldCheckIcon className="w-6 h-6 text-brand-accent" />
                                        </div>
                                        <div className="ml-4 flex-1">
                                        <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{rec.title}</h4>
                                        <p className="mt-1 text-slate-600 dark:text-slate-300">{rec.description}</p>
                                        <SourceList sources={rec.sources} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            </div>
                        </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
}
