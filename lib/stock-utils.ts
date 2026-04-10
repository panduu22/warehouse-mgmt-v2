/**
 * Utility for handling the custom "packs.bottles" stock format.
 * 1.10 means 1 pack and 10 bottles.
 */

/**
 * Extracts the bottles per pack from a string.
 * Uses the list provided by the user for precise mapping.
 */
export function parsePack(packStr: string | number | undefined, productName?: string): number {
    const p = String(packStr || "").toLowerCase();
    const n = String(productName || "").toLowerCase();
    const combined = `${n} ${p}`;

    // Specific product overrides
    if (combined.includes("maaza") && combined.includes("250 ml")) return 30;
    if (combined.includes("mm pulpy orange") && combined.includes("250 ml")) return 30;
    if (combined.includes("mm pulpy orange") && combined.includes("1 ltr")) return 12;

    // Standard mappings
    if (combined.includes("150 ml tetra")) return 40;
    if (combined.includes("200 ml rgb")) return 24;
    if (combined.includes("250 ml pet")) return 28;
    if (combined.includes("300 ml rgb")) return 24;
    if (combined.includes("330 ml can")) return 24;
    if (combined.includes("300 ml can")) return 24;
    if (combined.includes("350 ml can")) return 24;
    if (combined.includes("400 ml")) return 24;
    if (combined.includes("500 ml")) return 24;
    if (combined.includes("600 ml pet")) return 24;
    if (combined.includes("740 ml")) return 24;
    if (combined.includes("750 ml")) return 24;
    if (combined.includes("850 ml")) return 15;
    if (combined.includes("1 ltr pet")) return 15;
    if (combined.includes("1 ltr water")) return 15;
    if (combined.includes("1.2 ltr")) return 12;
    if (combined.includes("1.25 ltr")) return 12;
    if (combined.includes("1.5 ltr pet")) return 12;
    if (combined.includes("1.75 ltr")) return 12;
    if (combined.includes("2 ltr")) return 9;
    if (combined.includes("2.25 ltr pet")) return 9;

    // Fallback checks for volume partials if not caught above
    if (combined.includes("2.25")) return 9;
    if (combined.includes("1.5")) return 12;
    if (combined.includes("1.25")) return 12;
    if (combined.includes("600")) return 24;
    if (combined.includes("250")) return 28;
    if (combined.includes(" tetra")) return 40;

    // Fallback: try to extract the first number if possible
    const match = p.match(/^\d+/);
    if (match) return parseInt(match[0], 10);

    return 24; // Default baseline
}

/**
 * Converts a pack-format input (packs, bottles) to total bottles.
 */
export function toBottlesRaw(packs: number | string, bottles: number | string, bpp: number): number {
    const p = parseInt(String(packs) || "0", 10);
    const b = parseInt(String(bottles) || "0", 10);
    return (p * bpp) + b;
}

/**
 * LEGACY: Converts a pack-format string (e.g., "2.9") to total bottles.
 * We will phase this out in favor of separate integer inputs.
 */
export function toBottles(inputValue: string | number, bottlesPerPack: number): number {
    if (!inputValue) return 0;
    const str = String(inputValue).trim();
    if (!str || str === "0") return 0;

    const parts = str.split(".");
    const packs = parseInt(parts[0] || "0", 10);
    const bottles = parts.length > 1 ? parseInt(parts[1] || "0", 10) : 0;

    return (packs * bottlesPerPack) + bottles;
}

/**
 * Converts total bottles to separate pack and bottle units.
 */
export function toPacksAndBottles(totalBottles: number, bpp: number) {
    const intBottles = Math.round(totalBottles);
    const packs = Math.floor(intBottles / bpp);
    const bottles = intBottles % bpp;
    return { packs, bottles };
}

/**
 * Formats total bottles into a readable "X Packs + Y Bottles" string.
 */
export function formatPacksAndBottles(totalBottles: number, bpp: number, short = false): string {
    const { packs, bottles } = toPacksAndBottles(totalBottles, bpp);

    if (short) {
        if (packs > 0 && bottles > 0) return `${packs}P + ${bottles}B`;
        if (packs > 0) return `${packs}P`;
        return `${bottles}B`;
    }

    if (packs > 0 && bottles > 0) return `${packs} Packs + ${bottles} Bottles`;
    if (packs > 0) return `${packs} ${packs === 1 ? 'Pack' : 'Packs'}`;
    return `${bottles} ${bottles === 1 ? 'Bottle' : 'Bottles'}`;
}

/**
 * Custom sort order for products as requested by the user.
 */
export const PRODUCT_SORT_ORDER = [
    "150 ml Tetra - Maaza",
    "150 ml Tetra - MM Apple",
    "150 ml Tetra - MM LMN Fresh",

    "200 ml RGB - Thums up",
    "200 ml RGB - Sprite",
    "200 ml RGB - Limca",
    "200 ml RGB - Fanta",
    "200 ml RGB - Coke",
    "200 ml RGB - Maaza",

    "250 ml PET - Thums up Charge",
    "250 ml PET - Thums up",
    "250 ml PET - Sprite",
    "250 ml PET - Limca",
    "250 ml PET - Fanta",
    "250 ml PET - Coke",
    "250 ml PET - Kinley Soda",
    "250 ml PET - RimZim Fiz",
    "250 ml PET - Zero Thums up",
    "250 ml PET - Zero Sprite",
    "250 ml PET - Maaza",
    "250 ml PET - MM Pulpy orange",

    "300 ml RGB - Thums up",
    "300 ml RGB - Sprite",
    "300 ml RGB - Fanta",
    "300 ml RGB - Coke",

    "330 ml CAN - Thums up",
    "330 ml CAN - Sprite",
    "330 ml CAN - Coke",

    "300 ml CAN - Thums up",
    "300 ml CAN - Sprite",
    "300 ml CAN - Limca",
    "300 ml CAN - Fanta",
    "300 ml CAN - Coke",
    "300 ml CAN - D'Coke",
    "300 ml CAN - Predator",

    "300 ml - Kinley Water",

    "350 ml CAN - Monster",

    "400 mlcsd - Thums up",
    "400 mlcsd - Sprite",
    "400 mlcsd - Coke",

    "500 ml - Kinley Water",

    "600 ml PET - Maaza",

    "740 ml - Thums up",
    "740 ml - Sprite",
    "740 ml - Limca",
    "740 ml - Fanta",
    "740 ml - Coke",

    "750 ml - Kinley Soda",

    "850 ml - MM Pulpy orange",

    "1 ltr PET - Thums up",
    "1 ltr PET - Sprite",
    "1 ltr PET - Limca",
    "1 ltr PET - Fanta",
    "1 ltr PET - Coke",
    "1 ltr PET - MM Pulpy orange",

    "1 ltr - Kinley Water",

    "1.2 ltr - Maaza",

    "1.25 Ltr PET - Kinley Soda",

    "1.5 ltr PET - Thums up",
    "1.5 ltr PET - Sprite",

    "1.75 ltr - Maaza",

    "2 ltr - Kinley Water",

    "2.25 Ltr PET - Thums up",
    "2.25 Ltr PET - Sprite",
    "2.25 Ltr PET - Limca",
    "2.25 Ltr PET - Fanta",
    "2.25 Ltr PET - Coke"
];

/**
 * Sorts products strictly based on the custom order defined in PRODUCT_SORT_ORDER.
 */
export function sortProductsByCustomOrder(products: any[]) {
    return [...products].sort((a, b) => {
        const getOrderIndex = (p: any) => {
            const name = p.name?.toLowerCase() || "";
            const pack = p.pack?.toLowerCase() || "";

            // Try to find a match in the sort order
            const index = PRODUCT_SORT_ORDER.findIndex(orderStr => {
                const [orderPack, orderName] = orderStr.toLowerCase().split(" - ");

                // Normalization helper for more robust matching (handles Maaza/Mazza, Thums up/Thumsup, etc.)
                const normalize = (s: string) => s
                    .replace(/maaza|mazza/g, "maaza")
                    .replace(/thumsup|thums up/g, "thums up")
                    .replace(/mm pulpy orange|pulpy orange/g, "mm pulpy orange")
                    .replace(/(\d+)\s*ml/g, "$1ml") // normalize "300 ml" to "300ml"
                    .replace(/(\d+\.?\d*)\s*ltr/g, "$1ltr") // normalize "1.2 ltr" to "1.2ltr"
                    .replace(/[^a-z0-9]/g, ""); // remove all non-alphanumeric at the end for ultimate comparison

                const normalizedPack = normalize(pack);
                const normalizedName = normalize(name);
                const normalizedOrderPack = normalize(orderPack);
                const normalizedOrderName = normalize(orderName);
                const combinedProduct = normalize(name + " " + pack);

                // Match if name+pack combined contains both components of the order string
                return (combinedProduct.includes(normalizedOrderPack) && combinedProduct.includes(normalizedOrderName)) ||
                    (normalizedName.includes(normalizedOrderName) && normalizedPack.includes(normalizedOrderPack));
            });

            return index === -1 ? 999 : index;
        };

        const indexA = getOrderIndex(a);
        const indexB = getOrderIndex(b);

        if (indexA !== indexB) {
            return indexA - indexB;
        }

        // Secondary sort by name if both are not in the list or have same index
        return (a.name || "").localeCompare(b.name || "");
    });
}