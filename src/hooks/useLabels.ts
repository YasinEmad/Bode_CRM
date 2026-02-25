'use client';

import { useEffect, useState } from 'react';

export default function useLabels() {
  const [labels, setLabels] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLabels = async () => {
    try {
      console.log('📡 Fetching labels from API...');
      const res = await fetch('/api/system-settings');
      if (!res.ok) {
        console.error('❌ API returned status:', res.status);
        return;
      }
      const data = await res.json();
      console.log('📦 API Response:', data);
      console.log('📝 Labels from API:', data.settings?.labels);
      setLabels(data.settings?.labels || null);
      console.log('✅ Labels state updated');
    } catch (e) {
      console.error('Failed to load labels:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLabels();
  }, []);

  const get = (key: string, fallback: string) => {
    if (!labels) return fallback;
    return (labels[key] as string) || fallback;
  };

  const refetchLabels = async () => {
    await loadLabels();
  };

  return { labels, loading, get, setLabels, refetchLabels };
}
