/**
 * Slippage tolerance selector logic — issue #877.
 *
 * A trade preview's `max_price` (for buys) or `min_price` (for sells) is
 * the preview price adjusted by the user's selected slippage tolerance:
 * buys accept paying up to `tolerance%` more than the preview price, sells
 * accept receiving up to `tolerance%` less.
 */

/** Preset tolerance options shown in the slippage selector, in percent. */
export const SLIPPAGE_TOLERANCE_PRESETS = [0.5, 1, 5] as const;

/** Tolerances above this percentage are rejected as invalid. */
export const MAX_SLIPPAGE_TOLERANCE_PERCENT = 50;

/** Tolerances below this percentage are rejected as invalid. */
export const MIN_SLIPPAGE_TOLERANCE_PERCENT = 0;

export type TradeSide = 'buy' | 'sell';

export interface SlippagePriceBounds {
	/**
	 * Highest price the trade will accept paying, for a buy. `null` for
	 * sell-side computations.
	 */
	maxPrice: number | null;
	/**
	 * Lowest price the trade will accept receiving, for a sell. `null` for
	 * buy-side computations.
	 */
	minPrice: number | null;
}

/**
 * Decimal places prices are rounded to. Guards against binary
 * floating-point drift (e.g. `100 * 1.005` landing on 100.49999999999999
 * instead of 100.5) — XLM prices in this app are never displayed or
 * compared at finer than micro-XLM precision.
 */
const PRICE_DECIMAL_PLACES = 7;

function roundPrice(value: number): number {
	const factor = 10 ** PRICE_DECIMAL_PLACES;
	return Math.round(value * factor) / factor;
}

/**
 * Computes the max_price (buy) or min_price (sell) bound for a trade given
 * the preview price and a slippage tolerance percentage.
 *
 * @param previewPrice   The quoted/preview price before slippage is applied.
 * @param tolerancePercent  Slippage tolerance as a percent (e.g. 0.5 for 0.5%).
 * @param side  Whether this is a 'buy' (computes max_price) or 'sell'
 *              (computes min_price).
 */
export function computeSlippagePriceBounds(
	previewPrice: number,
	tolerancePercent: number,
	side: TradeSide
): SlippagePriceBounds {
	const multiplier = tolerancePercent / 100;

	if (side === 'buy') {
		return {
			maxPrice: roundPrice(previewPrice * (1 + multiplier)),
			minPrice: null,
		};
	}

	return {
		maxPrice: null,
		minPrice: roundPrice(previewPrice * (1 - multiplier)),
	};
}

export interface SlippageToleranceValidation {
	valid: boolean;
	/** Human-readable validation error, or `null` when the tolerance is valid. */
	error: string | null;
}

/**
 * Validates a (typically custom) slippage tolerance percentage.
 *
 * Valid range is [0, 50]. Anything above 50% is rejected as an unreasonably
 * high tolerance that would let a trade execute far away from the preview
 * price; negative values and non-finite input are also rejected.
 */
export function validateSlippageTolerance(
	tolerancePercent: number
): SlippageToleranceValidation {
	if (!Number.isFinite(tolerancePercent)) {
		return { valid: false, error: 'Enter a valid slippage tolerance.' };
	}

	if (tolerancePercent < MIN_SLIPPAGE_TOLERANCE_PERCENT) {
		return {
			valid: false,
			error: 'Slippage tolerance cannot be negative.',
		};
	}

	if (tolerancePercent > MAX_SLIPPAGE_TOLERANCE_PERCENT) {
		return {
			valid: false,
			error: `Slippage tolerance cannot exceed ${MAX_SLIPPAGE_TOLERANCE_PERCENT}%.`,
		};
	}

	return { valid: true, error: null };
}
