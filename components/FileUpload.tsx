
import React, { useState, useCallback } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import type { IaCFile } from '../types';
import { IaCType, IAC_TYPES } from '../constants';
import { UploadIcon } from './icons/UploadIcon';
import { FileIcon } from './icons/FileIcon';
import { TrashIcon } from './icons/TrashIcon';

interface FileUploadProps {
  files: IaCFile[];
  onFilesChange: (files: IaCFile[]) => void;
}

export function FileUpload({ files, onFilesChange }: FileUploadProps): React.ReactNode {
  const [isDragging, setIsDragging] = useState(false);

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  const handleAddFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileList = Array.from(newFiles);
    const iacFiles: IaCFile[] = await Promise.all(
      fileList.map(async (file) => ({
        id: `${file.name}-${file.lastModified}`,
        file,
        content: await readFileContent(file),
        type: IaCType.OTHER,
      }))
    );
    // Prevent duplicates
    const allFiles = [...files, ...iacFiles.filter(nf => !files.some(ef => ef.id === nf.id))];
    onFilesChange(allFiles);
  }, [files, onFilesChange]);


  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  }, [handleAddFiles]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleAddFiles(e.target.files);
    }
  };
  
  const handleRemoveFile = (idToRemove: string) => {
    onFilesChange(files.filter(f => f.id !== idToRemove));
  };

  const handleTypeChange = (id: string, newType: IaCType) => {
    onFilesChange(files.map(f => f.id === id ? { ...f, type: newType } : f));
  };


  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-300 ${isDragging ? 'border-brand-secondary bg-blue-50 dark:bg-slate-700' : 'border-slate-300 dark:border-slate-600 hover:border-brand-secondary'}`}
      >
        <input
          type="file"
          id="file-upload"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
            <UploadIcon className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-4" />
            <p className="font-semibold text-brand-secondary">Click to upload or drag and drop</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Terraform, Dockerfile, K8s YAML, etc.</p>
        </label>
      </div>

      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-3 text-slate-700 dark:text-slate-300">Uploaded Files</h3>
          <ul className="space-y-3">
            {files.map((iacFile) => (
              <li key={iacFile.id} className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-3 rounded-lg shadow-sm">
                <div className="flex items-center space-x-3 flex-grow">
                  <FileIcon className="w-6 h-6 text-brand-secondary flex-shrink-0" />
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate" title={iacFile.file.name}>{iacFile.file.name}</span>
                </div>
                <div className="flex items-center space-x-3 ml-2">
                  <select
                    value={iacFile.type}
                    onChange={(e) => handleTypeChange(iacFile.id, e.target.value as IaCType)}
                    className="block w-40 px-2 py-1 text-sm border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary dark:bg-slate-600 dark:border-slate-500 dark:text-white"
                  >
                    {IAC_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <button onClick={() => handleRemoveFile(iacFile.id)} className="p-1 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors">
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
