import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("MONGODB_URI is required");
    process.exit(1);
}

const productSchema = new mongoose.Schema({
    name: String,
    pack: String,
    mrp: Number,
}, { strict: false });

const Product = mongoose.models.Product || mongoose.model("Product", productSchema);

/**
 * Returns the MRP for a given product based on its name and pack.
 * Returns undefined if no mapping found (preserve existing MRP).
 */
function getMRP(name: string, pack: string): number | undefined {
    const n = name.toLowerCase().replace(/\s+/g, " ");
    const p = pack.toLowerCase().replace(/\s+/g, " ");
    const combined = `${n} ${p}`;

    const rx = (re: RegExp) => re.test(combined);

    // ── 150 ml Tetra ─────────────────────────────────────────────
    if (rx(/\b150\s*ml\b/) && rx(/\btetra\b/)) {
        if (rx(/\bmaaz[az]\b/) || rx(/\bmazza\b/)) return 10;
        if (rx(/\bmm\s*apple\b/) || rx(/\bapple\b/)) return 10;
        if (rx(/\bmm\s*limca\b/) || rx(/\blimca\b/)) return 10;
    }

    // ── 200 ml RGB ───────────────────────────────────────────────
    if (rx(/\b200\s*ml\b/)) {
        if (rx(/\bthums\s*up\b/)) return 10;
        if (rx(/\bsprite\b/)) return 10;
        if (rx(/\blimca\b/)) return 10;
        if (rx(/\bfanta\b/)) return 10;
        if (rx(/\bcoke\b/)) return 10;
        if (rx(/\bmaaz[az]\b/) || rx(/\bmazza\b/)) return 14;
    }

    // ── 250 ml PET ───────────────────────────────────────────────
    if (rx(/\b250\s*ml\b/)) {
        if (rx(/\bthums\s*up\s*charge\b/) || rx(/\bcharge\b/)) return 20;
        if (rx(/\bkinley\s*soda\b/)) return 11;
        if (rx(/\bsprite\s*li\s*mint\b/) || rx(/\bli\s*mint\b/) || rx(/\blimint\b/)) return 25;
        if (rx(/\bzero\s*thums\s*up\b/)) return 10;
        if (rx(/\bzero\s*sprite\b/)) return 10;
        if (rx(/\bzero\s*coke\b/)) return 10;
        if (rx(/\brimzim\b/) || rx(/\brim\s*zim\b/)) return 10;
        if (rx(/\bmaaz[az]\b/) || rx(/\bmazza\b/)) return 19;
        if (rx(/\bmm\s*pulpy\b/) || rx(/\bpulpy\s*orange\b/) || rx(/\bpulpy\b/)) return 25;
        if (rx(/\bthums\s*up\b/)) return 20;
        if (rx(/\bsprite\b/)) return 20;
        if (rx(/\blimca\b/)) return 20;
        if (rx(/\bfanta\b/)) return 20;
        if (rx(/\bcoke\b/)) return 20;
    }

    // ── 300 ml RGB ───────────────────────────────────────────────
    if (rx(/\b300\s*ml\b/) && rx(/\brgb\b/)) {
        if (rx(/\bthums\s*up\b/)) return 25;
        if (rx(/\bsprite\b/)) return 25;
    }

    // ── 330 ml CAN ───────────────────────────────────────────────
    if (rx(/\b330\s*ml\b/) && rx(/\bcan\b/)) {
        if (rx(/\bthums\s*up\b/)) return 70;
        if (rx(/\bsprite\b/)) return 70;
        if (rx(/\bcoke\b/)) return 70;
    }

    // ── 300 ml CAN ───────────────────────────────────────────────
    if (rx(/\b300\s*ml\b/) && rx(/\bcan\b/)) {
        if (rx(/\bpredator\b/)) return 60;
        if (rx(/\bd['']?\s*coke\b/) || rx(/\bdcoke\b/)) return 40;
        if (rx(/\bthums\s*up\b/)) return 40;
        if (rx(/\bsprite\b/)) return 40;
        if (rx(/\blimca\b/)) return 40;
        if (rx(/\bfanta\b/)) return 40;
        if (rx(/\bcoke\b/)) return 40;
        if (rx(/\bmonster\b/)) return 125; // 300 ml CAN Monster if it exists
    }

    // ── 300 ml Kinley Water ──────────────────────────────────────
    if (rx(/\b300\s*ml\b/) && rx(/\bkinley\s*water\b/)) return 7;
    if (rx(/\b300\s*ml\b/) && !rx(/\bcan\b/) && !rx(/\brgb\b/)) {
        if (rx(/\bkinley\b/) && rx(/\bwater\b/)) return 7;
    }

    // ── 350 ml CAN ───────────────────────────────────────────────
    if (rx(/\b350\s*ml\b/) && rx(/\bcan\b/)) {
        if (rx(/\bmonster\b/)) return 125;
    }

    // ── 400 ml csd ───────────────────────────────────────────────
    if (rx(/\b400\s*ml\b/)) {
        if (rx(/\bthums\s*up\b/)) return 20;
        if (rx(/\bsprite\b/)) return 20;
        if (rx(/\bcoke\b/)) return 20;
    }

    // ── 500 ml Kinley Water ──────────────────────────────────────
    if (rx(/\b500\s*ml\b/)) {
        if (rx(/\bkinley\s*water\b/) || (rx(/\bkinley\b/) && rx(/\bwater\b/))) return 9;
    }

    // ── 600 ml PET ───────────────────────────────────────────────
    if (rx(/\b600\s*ml\b/)) {
        if (rx(/\bmaaz[az]\b/) || rx(/\bmazza\b/)) return 35;
    }

    // ── 740 ml ───────────────────────────────────────────────────
    if (rx(/\b740\s*ml\b/)) {
        if (rx(/\bcoke\b/)) return 40;
        if (rx(/\bthums\s*up\b/)) return 35;
        if (rx(/\bsprite\b/)) return 35;
        if (rx(/\blimca\b/)) return 35;
        if (rx(/\bfanta\b/)) return 35;
    }

    // ── 750 ml Kinley Soda ───────────────────────────────────────
    if (rx(/\b750\s*ml\b/)) {
        if (rx(/\bkinley\s*soda\b/)) return 20;
    }

    // ── 850 ml ───────────────────────────────────────────────────
    if (rx(/\b850\s*ml\b/)) {
        if (rx(/\bpulpy\b/) || rx(/\bmm\s*pulpy\b/)) return 50;
    }

    // ── 1 Ltr PET ────────────────────────────────────────────────
    if (rx(/\b1\s*(ltr|l|liter)\b/) && !rx(/\b1\.(2|5|7|25)\b/)) {
        if (rx(/\bkinley\s*water\b/) || (rx(/\bkinley\b/) && rx(/\bwater\b/))) return 15;
        if (rx(/\bpulpy\b/) || rx(/\bmm\s*pulpy\b/)) return 90;
        if (rx(/\bthums\s*up\b/)) return 50;
        if (rx(/\bsprite\b/)) return 50;
        if (rx(/\blimca\b/)) return 50;
        if (rx(/\bfanta\b/)) return 50;
        if (rx(/\bcoke\b/)) return 50;
    }

    // ── 1.2 Ltr ──────────────────────────────────────────────────
    if (rx(/\b1\.2\s*(ltr|l)?\b/) && !rx(/\b1\.25\b/)) {
        if (rx(/\bmaaz[az]\b/) || rx(/\bmazza\b/)) return 75;
    }

    // ── 1.25 Ltr PET ─────────────────────────────────────────────
    if (rx(/\b1\.25\s*(ltr|l)?\b/)) {
        if (rx(/\bkinley\s*soda\b/)) return 30;
    }

    // ── 1.5 Ltr PET ──────────────────────────────────────────────
    if (rx(/\b1\.5\s*(ltr|l)?\b/)) {
        if (rx(/\bsprite\b/)) return 70;
    }

    // ── 1.75 Ltr ─────────────────────────────────────────────────
    if (rx(/\b1\.75\s*(ltr|l)?\b/)) {
        if (rx(/\bmaaz[az]\b/) || rx(/\bmazza\b/)) return 95;
    }

    // ── 2 Ltr Kinley Water ───────────────────────────────────────
    if (rx(/\b2\s*(ltr|l|liter)\b/) && !rx(/\b2\.25\b/)) {
        if (rx(/\bkinley\s*water\b/) || (rx(/\bkinley\b/) && rx(/\bwater\b/))) return 28;
    }

    // ── 2.25 Ltr PET ─────────────────────────────────────────────
    if (rx(/\b2\.25\s*(ltr|l)?\b/)) {
        if (rx(/\bthums\s*up\b/)) return 100;
        if (rx(/\bsprite\b/)) return 100;
        if (rx(/\blimca\b/)) return 100;
        if (rx(/\bfanta\b/)) return 100;
        if (rx(/\bcoke\b/)) return 100;
    }

    return undefined; // No mapping found → skip
}

async function updateMRP() {
    await mongoose.connect(MONGODB_URI as string);
    const products = await Product.find({});

    let updatedCount = 0;
    let skippedCount = 0;

    for (const p of products) {
        const mrp = getMRP(p.name || "", p.pack || "");

        if (mrp === undefined) {
            console.log(`⚠ SKIP  ${p.name} - ${p.pack}: no mapping found (current MRP: ${p.mrp})`);
            skippedCount++;
            continue;
        }

        if (p.mrp !== mrp) {
            console.log(`✓ UPDATE ${p.name} - ${p.pack}: ₹${p.mrp} → ₹${mrp}`);
            await Product.updateOne({ _id: p._id }, { $set: { mrp } });
            updatedCount++;
        }
    }

    console.log(`\nDone. Updated ${updatedCount} product(s), skipped ${skippedCount} (no mapping).`);
    process.exit(0);
}

updateMRP().catch(console.error);
