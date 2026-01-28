'use client';

import { useState, useRef } from 'react';
import { Upload, Loader } from 'lucide-react';
import { useToast } from '@/components/Toast';

interface ImportedLead {
  _id: string;
  name: string;
  budget: number;
  phone: string;
  status: string;
  source: string;
  notes: string;
}

interface Employee {
  _id: string;
  name: string;
}

interface BulkImportProps {
  token: string;
  onImportSuccess: (leads: ImportedLead[]) => void;
  employees: Employee[];
}

export default function BulkImportComponent({
  token,
  onImportSuccess,
  employees,
}: BulkImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast, updateToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported?: number; leads?: ImportedLead[]; errors?: any[] } | null>(null);

  const uploadFile = async (file: File | null) => {
    if (!file) return;

    setFileName(file.name);
    setIsUploading(true);
    setResult(null);
    const toastId = addToast('Uploading and importing leads...', 'loading');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/leads/bulk-import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to import leads');
      }

      updateToast(
        toastId,
        `✅ Successfully imported ${data.imported || (data.leads?.length ?? 0)} leads!`,
        'success'
      );

      setResult({ imported: data.imported, leads: data.leads, errors: data.errors });
      onImportSuccess(data.leads || []);
    } catch (error) {
      updateToast(
        toastId,
        error instanceof Error ? error.message : 'Failed to import leads',
        'error'
      );
      setResult({ errors: [{ message: error instanceof Error ? error.message : 'Unknown error' }] });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    uploadFile(file);
  };

  const handleDrop = (ev: React.DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    const file = ev.dataTransfer.files?.[0] ?? null;
    uploadFile(file);
  };

  const handleDragOver = (ev: React.DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
  };

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-xl p-6 border border-slate-700">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1">Bulk Import Leads</h3>
            <p className="text-sm text-slate-300">Upload an Excel or CSV file to import multiple leads. Use the sample CSV to match the required columns.</p>
            <a
              href="/sample-leads.csv"
              download
              className="mt-3 inline-block text-sm text-blue-400 hover:text-blue-300"
            >
              Download sample CSV
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              <Upload size={16} />
              {isUploading ? 'Importing...' : 'Select File'}
            </button>
          </div>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="mt-4 border-2 border-dashed border-slate-600 rounded-lg p-6 flex items-center justify-center text-center bg-slate-900/30 hover:border-slate-500 transition"
        >
          <div>
            <p className="text-slate-300">Drag & drop your .xlsx, .xls or .csv file here, or click <span className="text-blue-400">Select File</span>.</p>
            {fileName && (
              <p className="text-sm text-slate-400 mt-2">Selected file: <span className="text-white">{fileName}</span></p>
            )}

            {isUploading && (
              <div className="mt-4">
                <div className="h-2 bg-slate-700 rounded overflow-hidden">
                  <div className="h-2 bg-blue-500 animate-pulse" style={{ width: '60%' }} />
                </div>
                <p className="text-sm text-slate-400 mt-2">Uploading and importing, please wait...</p>
              </div>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        {result && (
          <div className="mt-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
            {result.imported !== undefined && (
              <p className="text-sm text-emerald-300 font-semibold">Imported: {result.imported}</p>
            )}
            {result.leads && result.leads.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-slate-300 font-medium">Imported leads (preview):</p>
                <ul className="mt-2 text-sm text-slate-300 space-y-1 max-h-28 overflow-auto">
                  {result.leads.slice(0, 10).map((l) => (
                    <li key={l._id} className="flex items-center justify-between">
                      <span>{l.name}{l.email ? ` — ${l.email}` : ''}</span>
                      <span className="text-slate-400 text-xs">${l.budget.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="mt-3 bg-red-900/30 p-2 rounded">
                <p className="text-sm text-red-300 font-semibold">Errors:</p>
                <ul className="text-sm text-red-200 mt-1 space-y-1 max-h-28 overflow-auto">
                  {result.errors.map((err, idx) => (
                    <li key={idx}>{err.message || JSON.stringify(err)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
