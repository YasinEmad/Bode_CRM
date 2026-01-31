'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, Save, AlertCircle } from 'lucide-react';

interface KPIIndicator {
  name: string;
  target: number;
  weight: number;
}

interface KPISetting {
  _id?: string;
  indicators: KPIIndicator[];
  totalWeight: number;
}

const indicatorLabels: Record<string, { ar: string; en: string; description: string }> = {
  attendance: {
    ar: 'نسبة الحضور',
    en: 'Attendance',
    description: 'Percentage of days attended',
  },
  deals: {
    ar: 'عدد الصفقات',
    en: 'Deals',
    description: 'Number of closed deals',
  },
  calls: {
    ar: 'عدد المكالمات',
    en: 'Calls',
    description: 'Number of calls made',
  },
  meetings: {
    ar: 'عدد الاجتماعات',
    en: 'Meetings',
    description: 'Number of meetings',
  },
  assessments: {
    ar: 'عدد التقييمات',
    en: 'Assessments',
    description: 'Number of assessments',
  },
  requests: {
    ar: 'عدد الطلبات',
    en: 'Requests',
    description: 'Number of requests',
  },
};

export default function KPISettingsPage() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast, updateToast } = useToast();

  const [kpiSettings, setKpiSettings] = useState<KPISetting | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Check authentication
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch KPI settings
  useEffect(() => {
    if (token) {
      fetchKpiSettings();
    }
  }, [token]);

  const fetchKpiSettings = async () => {
    try {
      setLoadingData(true);
      console.log('Fetching KPI settings with token:', token?.substring(0, 20) + '...');
      
      const res = await fetch('/api/kpi-settings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('Response status:', res.status);
      console.log('Response ok:', res.ok);

      if (!res.ok) {
        let errorMessage = `HTTP ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          const text = await res.text();
          console.error('Response text:', text);
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      console.log('KPI Settings loaded:', data);
      setKpiSettings(data.kpiSettings);
    } catch (error) {
      console.error('Error fetching KPI settings:', error);
      const message = error instanceof Error ? error.message : 'Failed to load KPI settings';
      console.error('Error message:', message);
      addToast(message, 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!kpiSettings?.indicators || kpiSettings.indicators.length === 0) {
      errors.push('No indicators found');
      setFormErrors(errors);
      return false;
    }

    // Validate each indicator
    kpiSettings.indicators.forEach((indicator) => {
      if (!indicator.target || indicator.target <= 0) {
        errors.push(`Target for ${indicator.name} must be greater than 0`);
      }

      if (indicator.weight < 0 || indicator.weight > 100) {
        errors.push(`Weight for ${indicator.name} must be between 0 and 100`);
      }
    });

    // Check total weight
    const totalWeight = kpiSettings.indicators.reduce((sum, ind) => sum + ind.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      errors.push(`Total weight must equal 100%, current total: ${totalWeight.toFixed(2)}%`);
    }

    setFormErrors(errors);
    return errors.length === 0;
  };

  const handleUpdateIndicator = (name: string, field: 'target' | 'weight', value: number) => {
    if (kpiSettings) {
      const updatedIndicators = kpiSettings.indicators.map((indicator) =>
        indicator.name === name ? { ...indicator, [field]: value } : indicator
      );
      setKpiSettings({ ...kpiSettings, indicators: updatedIndicators });
      // Clear errors when user starts editing
      setFormErrors([]);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      addToast('Please fix validation errors', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const toastId = addToast('Saving KPI settings...', 'loading');

      // Create abort controller with 20 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('❌ Request timeout - aborting');
        controller.abort();
      }, 20000);

      try {
        console.log('📤 Sending KPI settings update...');
        console.log('Indicators:', kpiSettings!.indicators);

        const requestBody = { indicators: kpiSettings!.indicators };
        console.log('Request body:', JSON.stringify(requestBody));

        const res = await fetch('/api/kpi-settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('✅ Response received:', res.status);

        if (!res.ok) {
          const error = await res.json();
          console.error('❌ Save failed:', error);
          throw new Error(error.error || 'Failed to save KPI settings');
        }

        const data = await res.json();
        console.log('✅ Settings saved successfully:', data);
        setKpiSettings(data.kpiSettings);
        
        // Update the loading toast to success
        updateToast(toastId, '✅ KPI settings saved successfully!', 'success');
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('❌ Request timeout');
          const errorMsg = 'Request took too long - please check your connection and try again';
          updateToast(toastId, errorMsg, 'error');
          throw new Error(errorMsg);
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Error saving KPI settings:', error);
      addToast(error instanceof Error ? error.message : 'Failed to save KPI settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getTotalWeight = (): number => {
    return kpiSettings?.indicators.reduce((sum, ind) => sum + ind.weight, 0) || 0;
  };

  const getTotalWeightColor = (): string => {
    const total = getTotalWeight();
    if (Math.abs(total - 100) <= 0.01) {
      return 'text-emerald-400';
    }
    return 'text-red-400';
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">KPI Settings</h1>
          <p className="text-slate-400">Configure KPI indicators and weights for employee evaluation</p>
        </div>

        {/* Error Messages */}
        {formErrors.length > 0 && (
          <div className="mb-6 bg-red-900/20 border border-red-700 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-red-200 font-semibold mb-2">Validation Errors</h3>
                <ul className="space-y-1">
                  {formErrors.map((error, idx) => (
                    <li key={idx} className="text-red-300 text-sm">
                      • {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loadingData && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
            <p className="text-slate-400">Loading KPI Settings...</p>
            <p className="text-slate-500 text-sm mt-2">This may take a moment if database is slow</p>
          </div>
        )}

        {/* No Data Error - Retry */}
        {!loadingData && !kpiSettings && (
          <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-6">
            <div className="flex flex-col items-center text-center">
              <AlertCircle className="text-amber-500 mb-4" size={32} />
              <h3 className="text-amber-200 font-semibold mb-2">Failed to Load KPI Settings</h3>
              <p className="text-amber-300 text-sm mb-4">
                There was an error loading the KPI settings from the server.
              </p>
              <button
                onClick={() => fetchKpiSettings()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-all"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!loadingData && kpiSettings && (
          <div className="space-y-6">
            {/* Indicators Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {kpiSettings.indicators.map((indicator) => (
                <div
                  key={indicator.name}
                  className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl border border-slate-700 p-6"
                >
                  {/* Indicator Header */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-1">
                      {indicatorLabels[indicator.name]?.en || indicator.name}
                    </h3>
                    <p className="text-slate-400 text-sm">
                      {indicatorLabels[indicator.name]?.description}
                    </p>
                  </div>

                  {/* Target Input */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Target {indicator.name === 'attendance' && '(%)'}
                      {indicator.name === 'deals' && '(Count)'}
                      {indicator.name === 'calls' && '(Count)'}
                      {indicator.name === 'meetings' && '(Count)'}
                      {indicator.name === 'assessments' && '(Count)'}
                      {indicator.name === 'requests' && '(Count)'}
                    </label>
                    <input
                      type="number"
                      value={isNaN(indicator.target) ? '' : indicator.target}
                      onChange={(e) =>
                        handleUpdateIndicator(indicator.name, 'target', parseFloat(e.target.value) || 0)
                      }
                      placeholder="Enter target value"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      {indicator.name === 'attendance' && 'Example: 95 for 95%'}
                      {indicator.name === 'deals' && 'Example: 2'}
                      {indicator.name === 'calls' && 'Example: 20'}
                      {indicator.name === 'meetings' && 'Example: 5'}
                      {indicator.name === 'assessments' && 'Example: 3'}
                      {indicator.name === 'requests' && 'Example: 10'}
                    </p>
                  </div>

                  {/* Weight Input */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Weight (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={isNaN(indicator.weight) ? '' : indicator.weight}
                        onChange={(e) =>
                          handleUpdateIndicator(indicator.name, 'weight', parseFloat(e.target.value) || 0)
                        }
                        placeholder="Enter weight percentage"
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <span className="absolute right-4 top-3 text-slate-400">%</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">How much this indicator affects the overall KPI</p>
                  </div>

                  {/* Visual Progress Bar for Weight */}
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-slate-400">Weight Distribution</span>
                      <span className="text-sm font-semibold text-blue-400">{indicator.weight.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300"
                        style={{ width: `${Math.min(indicator.weight, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Weight Summary */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl shadow-xl border border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Total Weight</h3>
                  <p className="text-slate-400 text-sm">
                    Sum of all indicator weights (must equal 100%)
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-bold ${getTotalWeightColor()}`}>
                    {getTotalWeight().toFixed(1)}%
                  </div>
                  {Math.abs(getTotalWeight() - 100) <= 0.01 ? (
                    <p className="text-emerald-400 text-sm font-semibold mt-1">✓ Valid</p>
                  ) : (
                    <p className="text-red-400 text-sm font-semibold mt-1">
                      ✗ Need {(100 - getTotalWeight()).toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>

              {/* Progress Bar for Total */}
              <div className="mt-4">
                <div className="h-3 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      Math.abs(getTotalWeight() - 100) <= 0.01
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                        : 'bg-gradient-to-r from-red-600 to-red-400'
                    }`}
                    style={{ width: `${Math.min(getTotalWeight(), 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={isSaving || getTotalWeight() !== 100}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-lg"
              >
                {isSaving ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save KPI Settings
                  </>
                )}
              </button>

              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all"
              >
                Back
              </button>
            </div>

            {/* Info Box */}
            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <h4 className="text-blue-200 font-semibold mb-3">How KPI Calculation Works</h4>
              <ul className="space-y-2 text-blue-300 text-sm">
                <li>• <strong>Achievement %:</strong> = Actual Value / Target</li>
                <li>• <strong>Max %:</strong> Capped at 100% (cannot exceed target reward)</li>
                <li>• <strong>KPI Score:</strong> = Achievement % × Weight %</li>
                <li>• <strong>Total KPI:</strong> = Sum of all KPI Scores</li>
                <li>• <strong>Attendance:</strong> If below target, it's reduced proportionally (e.g., 90% / 95% = 94.7%)</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
