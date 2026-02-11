'use client';

import { X, Upload, Trash2 } from 'lucide-react';
import { useState, useRef } from 'react';

interface CloseDealModalProps {
  isOpen: boolean;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadProject?: string;
  onClose: () => void;
  onSubmit: (formData: DealClosingFormData) => Promise<void>;
  isSubmitting: boolean;
  token: string;
}

export interface DealClosingFormData {
  tcrType: string;
  clientName: string;
  clientNumber: string;
  developer: string;
  project?: string;
  unitCode: string;
  unitArea: number;
  unitType: string;
  contractPrice: number;
  contractDate: string;
  finishingType: string;
  deliveryDate: number;
  paymentPlan: string;
  downPaymentPercentage: number;
  downPaymentAmount: number;
  paymentByMonth: number; // Monthly installment amount
  attachments: string[];
  info: string;
}

// Unit type & finishing type are free-text fields now (no predefined choices)

const paymentPlans = ['0', '1 year', '2 years', '3 years', '4 years', '5 years', '6 years', '7 years', '8 years', '9 years', '10 years', '11 years', '12 years', '13 years', '14 years', '15 years'];

export default function CloseDealModal({
  isOpen,
  leadId,
  leadName,
  leadPhone,
  leadProject,
  onClose,
  onSubmit,
  isSubmitting,
  token,
}: CloseDealModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [customTcrType, setCustomTcrType] = useState('');
  const [formData, setFormData] = useState<DealClosingFormData>({
    tcrType: 'Contract',
    clientName: '',
    clientNumber: '',
    developer: '',
    project: leadProject || '',
    unitCode: '',
    unitArea: 0,
    unitType: '',
    contractPrice: 0,
    contractDate: new Date().toISOString().split('T')[0],
    finishingType: '',
    deliveryDate: new Date().getFullYear(),
    paymentPlan: '0',
    downPaymentPercentage: 0,
    downPaymentAmount: 0,
    paymentByMonth: 0,
    attachments: [],
    info: '',
  });

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value,
    });
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    const newUrls: string[] = [];

    try {
      const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
      const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

      if (!publicKey) {
        throw new Error('ImageKit public key not configured');
      }

      const readFileAsDataUrl = (file: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formDataUpload = new FormData();
        let dataUrl: string | null = null;

        // Convert actual File objects to data URI to allow unsigned/publicKey client uploads
        if (file instanceof File) {
          dataUrl = await readFileAsDataUrl(file);
          formDataUpload.append('file', dataUrl);
        } else {
          formDataUpload.append('file', file as any);
        }

        formDataUpload.append('publicKey', publicKey);
        formDataUpload.append('fileName', `deal-closing-${Date.now()}-${i}`);
        formDataUpload.append('useUniqueFileName', 'true');

        // Debug: ensure public key is present in client (public key is safe to log)
        console.debug('ImageKit publicKey present:', !!publicKey);

        const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
          method: 'POST',
          body: formDataUpload,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('ImageKit upload response error', errorData);

          // If ImageKit requires authorization (account disallows unsigned uploads),
          // fallback to server-side upload using the private key.
          const needAuth =
            (typeof errorData.message === 'string' && errorData.message.toLowerCase().includes('authorization')) ||
            (typeof errorData.error === 'string' && errorData.error.toLowerCase().includes('authorization')) ||
            (errorData.message && errorData.message.includes('missing authorization'));

          if (needAuth && dataUrl) {
            try {
              const serverRes = await fetch('/api/uploads/imagekit', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ file: dataUrl, fileName: `deal-closing-${Date.now()}-${i}` }),
              });

              const serverJson = await serverRes.json().catch(() => ({}));
              if (!serverRes.ok) {
                console.error('Server-side ImageKit upload failed', serverJson);
                throw new Error(serverJson.error || serverJson.message || 'Server upload failed');
              }

              const serverUrl = serverJson.url || serverJson.raw?.url;
              if (serverUrl) {
                newUrls.push(serverUrl);
                continue;
              }
              throw new Error('Server upload returned no URL');
            } catch (serverErr) {
              console.error('Server upload error', serverErr);
              throw serverErr;
            }
          }

          throw new Error(errorData.message || errorData.error || 'Upload failed');
        }

        const data = await response.json();
        let imageUrl = '';

        if (data.url) {
          imageUrl = data.url;
        } else if (data.filePath && urlEndpoint) {
          const cleanUrlEndpoint = urlEndpoint.replace(/\/$/, '');
          const cleanFilePath = data.filePath.replace(/^\//, '');
          imageUrl = `${cleanUrlEndpoint}/${cleanFilePath}`;
        }

        if (imageUrl) {
          newUrls.push(imageUrl);
        } else {
          throw new Error('ImageKit did not return a valid URL');
        }
      }

      setFormData({
        ...formData,
        attachments: [...formData.attachments, ...newUrls],
      });
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields based on tcrType
    if (!formData.clientName || !formData.clientNumber || !formData.developer || !formData.project || !formData.info) {
      alert('Please fill in all required fields');
      return;
    }

    // Check that TCR Type is not empty
    if (!formData.tcrType || formData.tcrType.trim() === '') {
      alert('Please select or enter a TCR Type');
      return;
    }

    // For non-EOI types, these fields are required
    if (formData.tcrType !== 'EOI') {
      if (!formData.unitCode || !formData.unitArea || !formData.contractPrice) {
        alert('Please fill in all required fields');
        return;
      }
    }

    try {
      // Trim the tcrType value before submission
      const trimmedFormData = {
        ...formData,
        tcrType: formData.tcrType.trim(),
      };
      await onSubmit(trimmedFormData);
      setFormData({
        tcrType: 'Contract',
        clientName: '',
        clientNumber: '',
        developer: '',
        unitCode: '',
        unitArea: 0,
        unitType: '',
        contractPrice: 0,
        contractDate: new Date().toISOString().split('T')[0],
        finishingType: '',
        deliveryDate: new Date().getFullYear(),
        paymentPlan: '0',
        downPaymentPercentage: 0,
        downPaymentAmount: 0,
        paymentByMonth: 0,
        attachments: [],
        info: '',
      });
      setCustomTcrType('');
    } catch (error) {
      console.error('Error submitting deal:', error);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-3 sm:p-4 md:p-6 backdrop-blur-sm bg-black/30 dark:bg-black/50">
      <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 rounded-lg shadow-2xl w-full max-w-lg sm:max-w-2xl md:max-w-4xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-4 sm:px-5 md:px-6 py-4 sm:py-5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-10">
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Close Deal</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {leadName} • {leadPhone}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors p-2 rounded-md outline-none">
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-4 sm:px-6 md:px-8 py-6 sm:py-7 md:py-8 space-y-6">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                TCR Type *
              </label>
              {customTcrType === '__custom__' ? (
                <input
                  type="text"
                  value={formData.tcrType}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({ ...formData, tcrType: value });
                  }}
                  onBlur={() => {
                    if (!formData.tcrType.trim()) {
                      setCustomTcrType('');
                    }
                  }}
                  placeholder="Enter custom TCR Type"
                  className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white bg-white dark:bg-slate-700/60 border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-400 transition-colors"
                  autoFocus
                />
              ) : (
                <select
                  value={formData.tcrType}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'other') {
                      setCustomTcrType('__custom__');
                      setFormData({ ...formData, tcrType: '' });
                    } else {
                      setFormData({ ...formData, tcrType: value });
                    }
                  }}
                  className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white bg-white dark:bg-slate-700/60 border-slate-300 dark:border-slate-600 transition-colors"
                >
                  <option value="">-- Select TCR Type --</option>
                  <option value="Reservation">Reservation</option>
                  <option value="Contract">Contract</option>
                  <option value="EOI">EOI</option>
                  <option value="other">Other (Custom)</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Client Name *
              </label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleInputChange}
                placeholder="Client Name"
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white bg-white dark:bg-slate-700/60 border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-400 transition-colors"
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  Client Number *
                </label>
              <input
                type="text"
                name="clientNumber"
                value={formData.clientNumber}
                onChange={handleInputChange}
                placeholder="Client Number"
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white bg-white dark:bg-slate-700/60 border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Developer *
              </label>
              <input
                type="text"
                name="developer"
                value={formData.developer}
                onChange={handleInputChange}
                placeholder="Developer"
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white bg-white dark:bg-slate-700/60 border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Project
              </label>
              <input
                type="text"
                name="project"
                value={formData.project}
                onChange={handleInputChange}
                placeholder="Project Name"
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white bg-white dark:bg-slate-700/60 border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-400 transition-colors"
              />
            </div>
          </div>

          {/* Row 3 */}
          {formData.tcrType !== 'EOI' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Unit Code *
              </label>
              <input
                type="text"
                name="unitCode"
                value={formData.unitCode}
                onChange={handleInputChange}
                placeholder="Unit Code"
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white bg-white dark:bg-slate-700/60 border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Unit Area (sq.m) *
              </label>
              <input
                type="number"
                name="unitArea"
                value={formData.unitArea}
                onChange={handleInputChange}
                placeholder="Unit Area"
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white bg-white dark:bg-slate-700/60 border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Unit Type *
              </label>
              <input
                type="text"
                name="unitType"
                value={formData.unitType}
                onChange={handleInputChange}
                placeholder="Unit Type"
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white bg-white dark:bg-slate-700/60 border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-400 transition-colors"
              />
            </div>
          </div>
          )}

          {/* Row 4 */}
          {formData.tcrType !== 'EOI' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Contract Price *
              </label>
              <input
                type="number"
                name="contractPrice"
                value={formData.contractPrice}
                onChange={handleInputChange}
                placeholder="Contract Price"
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white bg-white dark:bg-slate-700/60 border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Contract Date *
              </label>
              <input
                type="date"
                name="contractDate"
                value={formData.contractDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white bg-white dark:bg-slate-700/60 border-slate-300 dark:border-slate-600 transition-colors"
              />
            </div>
          </div>
          )}

          {/* Row 5 */}
          {formData.tcrType !== 'EOI' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Finishing Type *
              </label>
              <input
                type="text"
                name="finishingType"
                value={formData.finishingType}
                onChange={handleInputChange}
                placeholder="Finishing Type"
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white bg-white dark:bg-slate-700/60 border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Delivery Date (Year) *
              </label>
              <input
                type="number"
                name="deliveryDate"
                value={formData.deliveryDate}
                onChange={handleInputChange}
                placeholder="Delivery Year"
                min="2025"
                max="2050"
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white bg-white dark:bg-slate-700/60 border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-400 transition-colors"
              />
            </div>
          </div>
          )}

          {/* Row 6 */}
          {formData.tcrType !== 'EOI' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Payment Plan *
              </label>
              <select
                name="paymentPlan"
                value={formData.paymentPlan}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white bg-white dark:bg-slate-700/60 border-slate-300 dark:border-slate-600 transition-colors"
              >
                {paymentPlans.map((plan) => (
                  <option key={plan} value={plan}>
                    {plan}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Down Payment Percentage (%) *
              </label>
              <input
                type="number"
                name="downPaymentPercentage"
                value={formData.downPaymentPercentage}
                onChange={handleInputChange}
                placeholder="نسبة الدفعة المقدمة"
                min="0"
                max="100"
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white bg-white dark:bg-slate-700/60 border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-400 transition-colors"
              />
            </div>
          </div>
          )}

          {/* Row 7 */}
          {formData.tcrType !== 'EOI' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Down Payment Amount *
              </label>
              <input
                type="number"
                name="downPaymentAmount"
                value={formData.downPaymentAmount}
                onChange={handleInputChange}
                placeholder="Down Payment Amount"
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white bg-white dark:bg-slate-700/60 border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Payment by Month (Monthly Installment) *
              </label>
              <input
                type="number"
                name="paymentByMonth"
                value={formData.paymentByMonth}
                onChange={handleInputChange}
                placeholder="Monthly installment amount"
                className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white bg-white dark:bg-slate-700/60 border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-400 transition-colors"
              />
            </div>
          </div>
          )}

          {/* Attachments */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Attachments (Multiple Images)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleImageUpload(e.target.files)}
              disabled={uploadingImages}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImages}
              className="w-full px-4 py-2.5 border-2 border-dashed rounded-lg text-sm text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 outline-none"
            >
              <Upload size={18} />
              {uploadingImages ? 'Uploading...' : 'Click to upload images'}
            </button>

            {/* Uploaded Images */}
            {formData.attachments.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {formData.attachments.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Attachment ${index + 1}`}
                      className="w-full h-20 sm:h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Additional Information *
            </label>
            <textarea
              name="info"
              value={formData.info}
              onChange={handleInputChange}
              placeholder="Additional deal information"
              rows={4}
              className="w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white bg-white dark:bg-slate-700/60 border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-400 transition-colors resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-4 sm:px-5 md:px-6 py-4 sm:py-5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex gap-3 flex-col sm:flex-row sticky bottom-0 z-10">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-semibold transition-colors shadow-sm text-sm outline-none"
          >
            {isSubmitting ? 'Closing Deal...' : 'Close Deal'}
          </button>
          <button
            onClick={onClose}
            className="w-full sm:flex-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2.5 rounded-lg font-semibold transition-colors border border-slate-300 dark:border-slate-600 text-sm outline-none"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
