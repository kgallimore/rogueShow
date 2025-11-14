import type { TierLetter } from '../types';

/**
 * Tier lookup entry for a product group (subfolder in assets)
 * Each subfolder in the assets folder represents one product group
 */
export type TierLookupEntry = {
	/** The tier assigned to this product group */
	tier: TierLetter;
	/** Optional primary image path relative to the subfolder (e.g., "primary.jpg") */
	primaryImage?: string;
	/** Optional list of reasoning strings explaining the tier placement */
	reasonings?: string[];
};

/**
 * Tier lookup map: maps subfolder name (product group ID) to tier information
 *
 * Example structure:
 * {
 *   "reeses-cups": {
 *     tier: "S",
 *     primaryImage: "main.jpg",
 *     reasonings: ["Classic flavor", "Perfect texture"]
 *   },
 *   "reeses-pieces": {
 *     tier: "A",
 *     primaryImage: "primary.png"
 *   }
 * }
 */
export type TierLookup = Record<string, TierLookupEntry>;

/**
 * Default tier lookup configuration
 * Update this map with actual product subfolder names and their tier assignments
 */
export const tierLookup: TierLookup = {
	bar: {
		tier: 'S',
		primaryImage: 'bar.webp'
	},
	bark: {
		tier: 'S',
		primaryImage: 'bark.webp'
	},
	bats: {
		tier: 'S',
		primaryImage: 'bats.webp'
	},
	bells: {
		tier: 'S',
		primaryImage: 'bells.webp'
	},
	bigBunny: {
		tier: 'S',
		primaryImage: 'bigBunny.webp'
	},
	bigCaramel: {
		tier: 'S',
		primaryImage: 'bigCaramel.webp'
	},
	bigEgg: {
		tier: 'S',
		primaryImage: 'bigEgg.webp'
	},
	bigHeart: {
		tier: 'S',
		primaryImage: 'bigHeart.webp'
	},
	bigPBJ: {
		tier: 'S',
		primaryImage: 'bigPBJGrape.webp'
	},
	bigPeanutBrittle: {
		tier: 'S',
		primaryImage: 'reesesPeanutBrittle.webp'
	},
	bigPotato: {
		tier: 'S',
		primaryImage: 'bigPotato.webp'
	},
	bigPretzel: {
		tier: 'S',
		primaryImage: 'bigPretzel.webp'
	},
	bigPuffs: {
		tier: 'S',
		primaryImage: 'bigPuffs.webp'
	},
	bigSanta: {
		tier: 'S',
		primaryImage: 'santa.webp'
	},
	bigStandard: {
		tier: 'S',
		primaryImage: 'bigStandard.webp'
	},
	bunny: {
		tier: 'S',
		primaryImage: 'bunny.webp'
	},
	chocolateLava: {
		tier: 'S',
		primaryImage: 'chocolateLavaBig.webp'
	},
	chocolateLovers: {
		tier: 'S',
		primaryImage: 'chocolateLovers.webp'
	},
	cluster: {
		tier: 'S',
		primaryImage: 'clusters.webp'
	},
	crunchyCookie: {
		tier: 'S',
		primaryImage: 'bigCrunchyCookie.webp'
	},
	crunchyPeanut: {
		tier: 'S',
		primaryImage: 'crunchyPeanut.webp'
	},
	darkChocolate: {
		tier: 'S',
		primaryImage: 'darkMinis.webp'
	},
	egg: {
		tier: 'S',
		primaryImage: 'egg.webp'
	},
	fastBreak: {
		tier: 'S',
		primaryImage: 'fastBreak.webp'
	},
	heartStandard: {
		tier: 'S',
		primaryImage: 'heartStandard.webp'
	},
	holidayLights: {
		tier: 'S',
		primaryImage: 'holidayLights.webp'
	},
	jumbo: {
		tier: 'S',
		primaryImage: 'jumbo.webp'
	},
	mallowTop: {
		tier: 'S',
		primaryImage: 'mallowTop.webp'
	},
	nuts: {
		tier: 'S',
		primaryImage: 'crunchyBar.webp'
	},
	oreo: {
		tier: 'S',
		primaryImage: 'oreo.webp'
	},
	organic: {
		tier: 'S',
		primaryImage: 'darkOrganicChocolate.webp'
	},
	outrageous: {
		tier: 'S',
		primaryImage: 'outrageous.webp'
	},
	outrageousSnack: {
		tier: 'S',
		primaryImage: 'outrageousSnack.webp'
	},
	pbPie: {
		tier: 'S',
		primaryImage: 'pbPieMinis.webp'
	},
	peanutButterLover: {
		tier: 'S',
		primaryImage: 'peanutButterLover.webp'
	},
	peanutButterUltimate: {
		tier: 'S',
		primaryImage: 'peanutButterUltimate.webp'
	},
	pieces: {
		tier: 'S',
		primaryImage: 'bigPieces.webp'
	},
	pinkHearts: {
		tier: 'S',
		primaryImage: 'pinkHearts.webp'
	},
	plant: {
		tier: 'S',
		primaryImage: 'plant.webp'
	},
	pumpkin: {
		tier: 'S',
		primaryImage: 'pumpkin.webp'
	},
	redVelvet: {
		tier: 'S',
		primaryImage: 'redVelvet.webp'
	},
	reeserBunnies: {
		tier: 'S',
		primaryImage: 'reesterBunnies.webp'
	},
	roundEgg: {
		tier: 'S',
		primaryImage: 'roundEgg.webp'
	},
	skeletons: {
		tier: 'S',
		primaryImage: 'skeletons.webp'
	},
	standard: {
		tier: 'S',
		primaryImage: 'reeses.webp'
	},
	sticks: {
		tier: 'S',
		primaryImage: 'sticks.webp'
	},
	sugarCookie: {
		tier: 'S',
		primaryImage: 'bigSugarCookie.webp'
	},
	take5: {
		tier: 'S',
		primaryImage: 'take5.webp'
	},
	thins: {
		tier: 'S',
		primaryImage: 'darkThins.webp'
	},
	unwrapped: {
		tier: 'S',
		primaryImage: 'eggsUnwrapped.webp'
	},
	whiteChocolate: {
		tier: 'S',
		primaryImage: 'whiteGhost.webp'
	},
	zeroSugar: {
		tier: 'S',
		primaryImage: 'zeroSugarMinis.webp'
	}
};

/**
 * Get tier information for a product subfolder
 * @param subfolderName - The name of the subfolder (product group ID)
 * @returns Tier lookup entry or null if not found
 */
export function getTierForSubfolder(subfolderName: string): TierLookupEntry | null {
	return tierLookup[subfolderName] || null;
}

/**
 * Get all product subfolders that have been assigned tiers
 * @returns Array of subfolder names
 */
export function getAssignedSubfolders(): string[] {
	return Object.keys(tierLookup);
}

/**
 * Convert subfolder name to a display name
 * @param subfolderName - The subfolder name (e.g., "bigBunny")
 * @returns Display name (e.g., "Big Bunny")
 */
function formatProductName(subfolderName: string): string {
	return subfolderName
		.replace(/([A-Z])/g, ' $1')
		.replace(/^./, (str) => str.toUpperCase())
		.trim();
}

/**
 * Get image URL for a product using Vite's import.meta.glob
 * This dynamically imports all images from the assets folder at build time
 * Using ?url query to get the URL directly
 */
const imageModules = import.meta.glob('/src/lib/assets/reeses/**/*.webp', {
	eager: true,
	query: '?url',
	import: 'default'
}) as Record<string, string>;

/**
 * Get image URL for a product
 * @param subfolderName - The subfolder name
 * @param imageFileName - The image file name
 * @returns URL path to the image
 */
function getImageUrl(subfolderName: string, imageFileName: string): string {
	const imagePath = `/src/lib/assets/reeses/${subfolderName}/${imageFileName}`;
	// Try to get the URL from the glob import
	const moduleUrl = imageModules[imagePath];
	if (moduleUrl) {
		return moduleUrl;
	}
	// Fallback to direct path (may not work in production)
	return imagePath;
}

/**
 * Load all products from the tier lookup
 * @returns Array of Product objects ready for the game
 */
export function loadProductsFromTierLookup(): import('../types').Product[] {
	const products: import('../types').Product[] = [];

	for (const [subfolderName, lookupEntry] of Object.entries(tierLookup)) {
		const productName = formatProductName(subfolderName);
		const imageUrl = lookupEntry.primaryImage
			? getImageUrl(subfolderName, lookupEntry.primaryImage)
			: null;

		products.push({
			id: subfolderName,
			name: productName,
			imageUrl,
			tier: null, // Will be revealed later
			// Store the subfolder name in a way we can retrieve it for tier lookup
			bucket: [subfolderName] // Using bucket to store the lookup key
		});
	}

	return products;
}

/**
 * Get the tier for a product by its ID (subfolder name)
 * @param productId - The product ID (subfolder name)
 * @returns The tier or null if not found
 */
export function getTierForProduct(productId: string): import('../types').TierLetter | null {
	const entry = tierLookup[productId];
	return entry ? entry.tier : null;
}
