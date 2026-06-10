import { useCallback } from 'react';
import { FilterState } from '@/hooks/use-filters';
import { listingRepository } from '../api/listing-repository';
import { usePaginatedList } from './use-paginated-list';

export function useListingsFeed(filters: FilterState, pageSize: number) {
  const loader = useCallback(
    (page: number) => listingRepository.listPublished({ page, pageSize, filters }),
    [filters, pageSize]
  );
  return usePaginatedList(loader, pageSize);
}

export function useOpportunitiesFeed(filters: FilterState, pageSize: number) {
  const loader = useCallback(
    (page: number) => listingRepository.listOpportunities({ page, pageSize, filters }),
    [filters, pageSize]
  );
  return usePaginatedList(loader, pageSize);
}

export function useMyListings(userId: string | undefined, table: 'cars' | 'cars_drafts', pageSize: number) {
  const loader = useCallback(
    (page: number) => userId ? listingRepository.listMine(userId, table, page, pageSize) : Promise.resolve([]),
    [pageSize, table, userId]
  );
  return usePaginatedList(loader, pageSize);
}
