import useSWR from 'swr';
import type { TldrIndex } from '../types';

const INDEX_URL = 'index.json';
const CACHE_KEY = 'tldr_index_v1';
const CACHE_EXPIRY = 3 * 24 * 60 * 60 * 1000; // 7 days

const fetcher = async (url: string) => {
  // Try to get from local storage first
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_EXPIRY) {
        return data;
      }
    }
  } catch (e) {
    console.warn('Failed to parse cached tldr index', e);
  }

  // Fetch from network
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch index');
  const data = await res.json();

  // Save to local storage
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.warn('Failed to save tldr index to localStorage (quota exceeded?)', e);
  }

  return data;
};

export function useTldrIndex() {
  const { data, error, isLoading } = useSWR<TldrIndex>(INDEX_URL, fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    dedupingInterval: 3600000, // Cache for 1 hour
  });

  return {
    commands: data?.commands || [],
    isLoading,
    error,
  };
}
