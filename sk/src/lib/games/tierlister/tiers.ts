export type TierLetter = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export const tierOrder: TierLetter[] = ['S', 'A', 'B', 'C', 'D', 'F'];

export interface TierStyle {
	label: TierLetter;
	color: string; // Text/border color (hex)
	bg: string; // Background color (hex)
	gradient: {
		from: string;
		to: string;
	};
}

export const tierStyles: Record<TierLetter, TierStyle> = {
	S: {
		label: 'S',
		color: '#ff6b6b',
		bg: '#ffe5e5',
		gradient: {
			from: '#ffb86b',
			to: '#ff6b6b'
		}
	},
	A: {
		label: 'A',
		color: '#f97316',
		bg: '#ffedd5',
		gradient: {
			from: '#f97316',
			to: '#f59e0b'
		}
	},
	B: {
		label: 'B',
		color: '#3b82f6',
		bg: '#dbeafe',
		gradient: {
			from: '#60a5fa',
			to: '#3b82f6'
		}
	},
	C: {
		label: 'C',
		color: '#10b981',
		bg: '#d1fae5',
		gradient: {
			from: '#34d399',
			to: '#10b981'
		}
	},
	D: {
		label: 'D',
		color: '#7c3aed',
		bg: '#ede9fe',
		gradient: {
			from: '#a78bfa',
			to: '#7c3aed'
		}
	},
	F: {
		label: 'F',
		color: '#64748b',
		bg: '#f1f5f9',
		gradient: {
			from: '#94a3b8',
			to: '#64748b'
		}
	}
};

/**
 * Get tier style by letter
 */
export function getTierStyle(tier: TierLetter | string | null): TierStyle {
	if (!tier) return tierStyles.F;
	const upperTier = tier.toUpperCase();
	if (upperTier in tierStyles) {
		return tierStyles[upperTier as TierLetter];
	}
	return tierStyles.F;
}
