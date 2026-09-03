import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
	computeSlippagePriceBounds,
	validateSlippageTolerance,
	SLIPPAGE_TOLERANCE_PRESETS,
	type TradeSide,
} from '@/utils/slippageTolerance.utils';

export interface SlippageToleranceSelectorProps {
	/** The quoted/preview price the tolerance is applied against. */
	previewPrice: number;
	/** Whether this trade is a buy (computes max_price) or sell (min_price). */
	side: TradeSide;
	/** Called whenever the selected tolerance changes with a valid value. */
	onToleranceChange?: (tolerancePercent: number) => void;
	/**
	 * Called with the confirm-eligibility state whenever it changes, so a
	 * parent trade dialog can disable its own confirm button in lockstep.
	 */
	onValidityChange?: (canConfirm: boolean) => void;
	/** Called when the confirm button is clicked while the tolerance is valid. */
	onConfirm?: (bounds: {
		maxPrice: number | null;
		minPrice: number | null;
	}) => void;
	className?: string;
}

/**
 * Slippage tolerance selector — issue #877 / #784 trade flow.
 *
 * Lets the user pick a preset tolerance (0.5% / 1% / 5%) or enter a custom
 * percentage, and displays the resulting max_price (buy) / min_price (sell)
 * bound. A custom tolerance above 50% is rejected with a validation error
 * and disables the confirm action.
 */
const SlippageToleranceSelector: React.FC<SlippageToleranceSelectorProps> = ({
	previewPrice,
	side,
	onToleranceChange,
	onValidityChange,
	onConfirm,
	className,
}) => {
	const [selectedPreset, setSelectedPreset] = useState<number | null>(
		SLIPPAGE_TOLERANCE_PRESETS[0]
	);
	const [customValue, setCustomValue] = useState('');
	const [isCustom, setIsCustom] = useState(false);

	const activeToleranceText = isCustom
		? customValue
		: String(selectedPreset ?? '');
	const parsedTolerance = activeToleranceText.trim()
		? Number(activeToleranceText)
		: NaN;

	const validation = useMemo(
		() => validateSlippageTolerance(parsedTolerance),
		[parsedTolerance]
	);

	const bounds = useMemo(() => {
		if (!validation.valid) return { maxPrice: null, minPrice: null };
		return computeSlippagePriceBounds(previewPrice, parsedTolerance, side);
	}, [validation.valid, previewPrice, parsedTolerance, side]);

	const canConfirm = validation.valid;

	const selectPreset = (preset: number) => {
		setIsCustom(false);
		setSelectedPreset(preset);
		onToleranceChange?.(preset);
		onValidityChange?.(true);
	};

	const handleCustomChange = (rawValue: string) => {
		setIsCustom(true);
		setSelectedPreset(null);
		setCustomValue(rawValue);

		const parsed = rawValue.trim() ? Number(rawValue) : NaN;
		const result = validateSlippageTolerance(parsed);
		onValidityChange?.(result.valid);
		if (result.valid) {
			onToleranceChange?.(parsed);
		}
	};

	return (
		<div className={cn('space-y-2', className)}>
			<div className="text-sm text-white/70">Slippage tolerance</div>
			<div className="flex flex-wrap items-center gap-2">
				{SLIPPAGE_TOLERANCE_PRESETS.map(preset => (
					<button
						key={preset}
						type="button"
						onClick={() => selectPreset(preset)}
						aria-pressed={!isCustom && selectedPreset === preset}
						data-testid={`slippage-preset-${preset}`}
						className={cn(
							'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
							!isCustom && selectedPreset === preset
								? 'bg-amber-500/20 text-amber-300'
								: 'bg-white/5 text-white/60 hover:bg-white/10'
						)}
					>
						{preset}%
					</button>
				))}
				<input
					type="text"
					inputMode="decimal"
					placeholder="Custom %"
					value={customValue}
					onChange={event => handleCustomChange(event.target.value)}
					onFocus={() => setIsCustom(true)}
					aria-label="Custom slippage tolerance"
					data-testid="slippage-custom-input"
					className={cn(
						'w-24 rounded-md border bg-white/[0.04] px-2 py-1 text-xs text-white outline-none transition-colors',
						'border-white/10 focus:border-amber-500/50',
						isCustom && !validation.valid ? 'border-red-500/60' : ''
					)}
				/>
			</div>

			{isCustom && !validation.valid && (
				<p
					role="alert"
					data-testid="slippage-validation-error"
					className="text-xs text-red-300"
				>
					{validation.error}
				</p>
			)}

			{validation.valid && (
				<p className="text-xs text-white/45" data-testid="slippage-price-bound">
					{side === 'buy'
						? `Max price: ${bounds.maxPrice} XLM`
						: `Min price: ${bounds.minPrice} XLM`}
				</p>
			)}

			<button
				type="button"
				onClick={() => onConfirm?.(bounds)}
				disabled={!canConfirm}
				data-testid="slippage-confirm-button"
				className="rounded-md bg-amber-500/90 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
			>
				Confirm
			</button>
		</div>
	);
};

export default SlippageToleranceSelector;
