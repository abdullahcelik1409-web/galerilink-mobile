import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

export type PageLoader<T> = (page: number) => Promise<T[]>;

export function usePaginatedList<T>(loader: PageLoader<T>, pageSize: number) {
  const [items, setItems] = useState<T[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMoreLoading, setIsMoreLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loadingMoreRef = useRef(false);

  const fetchPage = useCallback(async (pageNum = 0, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setIsMoreLoading(true);
      } else {
        setIsLoading(true);
      }

      const nextItems = await loader(pageNum);
      setItems(prev => isLoadMore ? [...prev, ...nextItems] : nextItems);
      setHasMore(nextItems.length === pageSize);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsMoreLoading(false);
    }
  }, [loader, pageSize]);

  useFocusEffect(
    useCallback(() => {
      setPage(0);
      setHasMore(true);
      void fetchPage(0, false);
    }, [fetchPage])
  );

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setPage(0);
    setHasMore(true);
    void fetchPage(0, false);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || isLoading || isMoreLoading || !hasMore) return;
    loadingMoreRef.current = true;
    const nextPage = page + 1;
    setPage(nextPage);
    try {
      await fetchPage(nextPage, true);
    } finally {
      loadingMoreRef.current = false;
    }
  }, [fetchPage, hasMore, isLoading, isMoreLoading, page]);

  const removeItem = useCallback((predicate: (item: T) => boolean) => {
    setItems(current => current.filter(item => !predicate(item)));
  }, []);

  return {
    items,
    setItems,
    isRefreshing,
    isLoading,
    isMoreLoading,
    hasMore,
    refresh,
    loadMore,
    removeItem,
    refetch: fetchPage,
  };
}
