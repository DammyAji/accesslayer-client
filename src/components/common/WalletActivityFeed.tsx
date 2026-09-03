import { useMemo } from 'react';
import TransactionHistory, {
	type Transaction,
} from '@/components/common/TransactionHistory';
import { useWalletActivity } from '@/hooks/useWallet';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { WalletActivityTrade } from '@/services/walletActivity.service';

interface WalletActivityFeedProps {
	/** Connected wallet address used as the cache key for the activity query. */
	address: string;
}

function toTransaction(entry: WalletActivityTrade): Transaction {
	return {
		id: entry.id,
		type: entry.type,
		creatorId: entry.creatorId,
		creatorHandle: entry.creatorHandle,
		amount: entry.amount,
		price: entry.price,
		timestamp: entry.timestamp,
		txHash: entry.txHash,
		status: entry.status,
	};
}

const WalletActivityFeed: React.FC<WalletActivityFeedProps> = ({ address }) => {
	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
	} = useWalletActivity(address);

	// Collapse the paginated `pages` array into a single flat list of
	// transactions. Deduplicate by `id` so overlapping pages (e.g. when the
	// backend paginates by timestamp boundary) don't render the same trade
	// twice. Accepted criteria #4: "No duplicate trades in the combined list".
	const transactions = useMemo(() => {
		const seen = new Set<string>();
		const result: Transaction[] = [];
		for (const page of data?.pages ?? []) {
			for (const trade of page.trades) {
				if (seen.has(trade.id)) continue;
				seen.add(trade.id);
				result.push(toTransaction(trade));
			}
		}
		return result;
	}, [data]);

	// `useWalletActivity` already gates its own fetch on `!!address`, so
	// `hasNextPage` cannot become true without one — only the loading
	// flags matter here for re-entrancy.
	const sentinelRef = useInfiniteScroll<HTMLDivElement>({
		enabled: !isFetchingNextPage && !isLoading,
		hasMore: !!hasNextPage,
		onLoadMore: () => {
			void fetchNextPage();
		},
	});

	return (
		<>
			<TransactionHistory transactions={transactions} />
			{hasNextPage && (
				<div
					ref={sentinelRef}
					data-testid="activity-feed-sentinel"
					aria-hidden="true"
					className="h-px w-full"
				/>
			)}
		</>
	);
};

export default WalletActivityFeed;
