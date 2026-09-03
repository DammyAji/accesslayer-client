// src/services/walletActivity.service.ts
import { BaseApiService, type APIResponse } from './api.service';
import { cacheManager } from '@/utils/cache.utils';

/**
 * Single wallet trade entry returned from the activity feed.
 *
 * Mirrors the shape consumed by the existing `TransactionHistory`
 * component so the feed can pass entries straight through.
 */
export interface WalletActivityTrade {
	id: string;
	type: 'buy' | 'sell';
	/** Raw creator identifier from the API — never shown in the UI. */
	creatorId: string;
	/** Human-readable handle used for display (e.g. instructorId). */
	creatorHandle: string;
	amount: number;
	price: number;
	timestamp: number;
	txHash: string;
	status: 'completed' | 'pending' | 'failed';
}

export interface WalletActivityPage {
	trades: WalletActivityTrade[];
	/**
	 * The next page token. Returning `null` signals "no more pages"
	 * which stops the infinite query from refetching.
	 */
	nextPage: number | null;
}

export interface GetWalletActivityParams {
	address: string;
	/** 1-indexed page number. */
	page: number;
	/** Page size; defaults to the backend's first-page count. */
	limit?: number;
}

const ACTIVITY_CACHE_PREFIX = 'wallet_activity_';
const ACTIVITY_PAGE_TTL_MS = 15_000;

class WalletActivityService extends BaseApiService {
	async getWalletActivity({
		address,
		page,
		limit,
	}: GetWalletActivityParams): Promise<WalletActivityPage> {
		const cacheKey = `${ACTIVITY_CACHE_PREFIX}${address}_${page}_${limit ?? 'default'}`;
		const cached = cacheManager.get<WalletActivityPage>(cacheKey);
		if (cached) return cached;

		try {
			const response = await this.api.get<APIResponse<WalletActivityPage>>(
				`/wallet/${address}/activity`,
				{ params: { page, ...(limit ? { limit } : {}) } }
			);

			const data = response.data.data;
			cacheManager.set(cacheKey, data, ACTIVITY_PAGE_TTL_MS);
			return data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const walletActivityService = new WalletActivityService();

/**
 * Convenience wrapper exposing the service call as a plain function so
 * it can be swapped via `vi.spyOn` from integration tests without needing
 * to mock the service class instance itself.
 */
export async function fetchWalletActivityPage(
	address: string,
	page: number
): Promise<WalletActivityPage> {
	return walletActivityService.getWalletActivity({ address, page });
}
