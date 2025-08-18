import React from 'react';

export function ClipboardListIcon(props: React.SVGProps<SVGSVGElement>): React.ReactNode {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H6.31A2.25 2.25 0 004.06 6v12a2.25 2.25 0 002.25 2.25h7.438a2.25 2.25 0 002.25-2.25V16.5M16.5 8.25L19.5 12m0 0l3 3m-3-3l-3 3m-6-4.5h4.5m-4.5 3h4.5" />
    </svg>
  );
}
