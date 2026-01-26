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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
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
        `✅ Successfully imported ${data.imported} leads to database!`,
        'success'
      );

      // Refresh the leads list
      onImportSuccess(data.leads || []);
    } catch (error) {
      updateToast(
        toastId,
        error instanceof Error ? error.message : 'Failed to import leads',
        'error'
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Bulk Import Leads</h3>
            <p className="text-sm text-gray-600">
              Upload an Excel file to import multiple leads at once. They will be saved to the database and you can assign them to sales later.
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition whitespace-nowrap"
          >
            {isUploading ? (
              <>
                <Loader size={20} className="animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload size={20} />
                Import Excel
              </>
            )}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
      </div>
    </div>
  );
}
