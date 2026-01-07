import useSWR from 'swr';
import type { TldrIndex } from '../types';

const INDEX_URL = 'https://raw.githubusercontent.com/tldr-pages/tldr-pages.github.io/main/assets/index.json';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
