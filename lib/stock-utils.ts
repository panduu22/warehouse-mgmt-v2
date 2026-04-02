/**
 * Utility for handling the custom "packs.bottles" stock format.
 * 1.10 means 1 pack and 10 bottles.
 */

/**
 * Extracts the bottles per pack from a string.
 * Uses the list provided by the user for precise mapping.
 */
export function parsePack(packStr: string | number | undefined, productName?: string): number {
    const combinedStr = `${productName || ""} ${packStr || ""}`.toLowerCase();
    
    // 2.25 Ltr -> 9
    if (combinedStr.includes("2.25")) return 9;
    // 2 Ltr -> 9
    if (combinedStr.includes("2 ltr")) return 9;
    // 1.75 Ltr -> 9
    if (combinedStr.includes("1.75")) return 9;
    
    // 1.5 Ltr -> 12
    if (combinedStr.includes("1.5")) return 12;
    // 1.25 Ltr -> 12
    if (combinedStr.includes("1.25")) return 12;
    // 1.2 Ltr -> 12
    if (combinedStr.includes("1.2 ltr")) return 12;
    // 1 Ltr -> 12
    if (combinedStr.includes("1 ltr")) return 12;
    // 850 ml -> 12
    if (combinedStr.includes("850")) return 12;
    // 750 ml -> 12
    if (combinedStr.includes("750")) return 12;
    // 740 ml -> 12
    if (combinedStr.includes("740")) return 12;

    // 600 ml -> 24
    if (combinedStr.includes("600")) return 24;
    // 500 ml -> 24
    if (combinedStr.includes("500")) return 24;
    // 400 ml -> 24
    if (combinedStr.includes("400")) return 24;
    // 350 ml -> 24
    if (combinedStr.includes("350")) return 24;
    // 300 ml -> 24
    if (combinedStr.includes("300")) return 24;
    // 250 ml -> 24
    if (combinedStr.includes("250")) return 24;
    // 200 ml -> 24
    if (combinedStr.includes("200")) return 24;

    // 150 ml Tetra -> 27
    if (combinedStr.includes("150")) return 27;

    // Fallback: try to extract the first number if possible
    const match = String(packStr).match(/^\d+/);
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
 * Converts total bottles (integer) back to the legacy pack-format string (e.g., "17.15").
 */
export function toPackFormat(totalBottles: number, bottlesPerPack: number): string {
    if (!bottlesPerPack || bottlesPerPack <= 0) return String(Math.round(totalBottles));
    const { packs, bottles } = toPacksAndBottles(totalBottles, bottlesPerPack);
    if (bottles === 0) return String(packs);
    return `${packs}.${bottles}`;
}