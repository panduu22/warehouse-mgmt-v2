// scripts/update_master.ts

/**
 * This script updates the Product collection with the latest values for
 * Bottles Per Pack (BPP), MRP, Invoice Cost, and Sale Price.
 * It matches products by `pack` and `flavour` (derived from the product name).
 *
 * Usage (from project root):
 *   npx ts-node scripts/update_master.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Product";
dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is required");
  process.exit(1);
}

// ----- Master data --------------------------------------------------------
interface MasterEntry {
  pack: string;
  flavour: string;
  bpp: number;
  mrp: number;
  invoiceCost: number;
  salePrice: number;
}

const MASTER_DATA: MasterEntry[] = [
  // 150 ml Tetra
  { pack: "150 ml Tetra", flavour: "Mazza", bpp: 40, mrp: 10, invoiceCost: 341.75, salePrice: 360 },
  { pack: "150 ml Tetra", flavour: "MM Apple", bpp: 40, mrp: 10, invoiceCost: 341.75, salePrice: 360 },
  { pack: "150 ml Tetra", flavour: "MM Limca G C", bpp: 40, mrp: 10, invoiceCost: 341.75, salePrice: 360 },
  // 200 ml RGB
  { pack: "200 ml RGB", flavour: "Thums up", bpp: 24, mrp: 10, invoiceCost: 174.77, salePrice: 192 },
  { pack: "200 ml RGB", flavour: "Sprite", bpp: 24, mrp: 10, invoiceCost: 174.77, salePrice: 192 },
  { pack: "200 ml RGB", flavour: "Limca", bpp: 24, mrp: 10, invoiceCost: 174.77, salePrice: 192 },
  { pack: "200 ml RGB", flavour: "Fanta", bpp: 24, mrp: 10, invoiceCost: 174.77, salePrice: 192 },
  { pack: "200 ml RGB", flavour: "Coke", bpp: 24, mrp: 10, invoiceCost: 174.77, salePrice: 192 },
  { pack: "200 ml RGB", flavour: "Mazza", bpp: 24, mrp: 14, invoiceCost: 259.54, salePrice: 282 },
  // 250 ml PET
  { pack: "250 ml PET", flavour: "Thums up Charge", bpp: 28, mrp: 20, invoiceCost: 470.80, salePrice: 505 },
  { pack: "250 ml PET", flavour: "Thums up", bpp: 28, mrp: 20, invoiceCost: 475.77, salePrice: 505 },
  { pack: "250 ml PET", flavour: "Sprite", bpp: 28, mrp: 20, invoiceCost: 475.77, salePrice: 505 },
  { pack: "250 ml PET", flavour: "Limca", bpp: 28, mrp: 20, invoiceCost: 470.80, salePrice: 505 },
  { pack: "250 ml PET", flavour: "Fanta", bpp: 28, mrp: 20, invoiceCost: 470.80, salePrice: 505 },
  { pack: "250 ml PET", flavour: "Coke", bpp: 28, mrp: 20, invoiceCost: 470.80, salePrice: 505 },
  { pack: "250 ml PET", flavour: "Kinley Soda", bpp: 28, mrp: 11, invoiceCost: 235.59, salePrice: 250 },
  { pack: "250 ml PET", flavour: "Sprite LI MINT", bpp: 28, mrp: 25, invoiceCost: 598.90, salePrice: 632 },
  { pack: "250 ml PET", flavour: "Zero Thums up", bpp: 28, mrp: 10, invoiceCost: 204.00, salePrice: 230 },
  { pack: "250 ml PET", flavour: "Zero Sprite", bpp: 28, mrp: 10, invoiceCost: 204.00, salePrice: 230 },
  { pack: "250 ml PET", flavour: "RimZim Fiz", bpp: 28, mrp: 10, invoiceCost: 219.65, salePrice: 240 },
  { pack: "250 ml PET", flavour: "Mazza", bpp: 30, mrp: 19, invoiceCost: 510.14, salePrice: 540 },
  { pack: "250 ml PET", flavour: "MM Pulpy orange", bpp: 30, mrp: 25, invoiceCost: 633.27, salePrice: 675 },
  // 300 ml RGB
  { pack: "300 ml RGB", flavour: "Thums up", bpp: 24, mrp: 25, invoiceCost: 453.30, salePrice: 493 },
  { pack: "300 ml RGB", flavour: "Sprite", bpp: 24, mrp: 25, invoiceCost: 453.30, salePrice: 493 },
  // 330 ml CAN
  { pack: "330 ml CAN", flavour: "Thums up", bpp: 24, mrp: 70, invoiceCost: 959.04, salePrice: 1010 },
  { pack: "330 ml CAN", flavour: "Sprite", bpp: 24, mrp: 70, invoiceCost: 959.04, salePrice: 1010 },
  { pack: "330 ml CAN", flavour: "Coke", bpp: 24, mrp: 70, invoiceCost: 959.04, salePrice: 1010 },
  // 300 ml CAN
  { pack: "300 ml CAN", flavour: "Thums up", bpp: 24, mrp: 40, invoiceCost: 821.36, salePrice: 878 },
  { pack: "300 ml CAN", flavour: "Sprite", bpp: 24, mrp: 40, invoiceCost: 821.36, salePrice: 878 },
  { pack: "300 ml CAN", flavour: "Limca", bpp: 24, mrp: 40, invoiceCost: 817.58, salePrice: 878 },
  { pack: "300 ml CAN", flavour: "Fanta", bpp: 24, mrp: 40, invoiceCost: 817.58, salePrice: 878 },
  { pack: "300 ml CAN", flavour: "Coke", bpp: 24, mrp: 40, invoiceCost: 817.58, salePrice: 878 },
  { pack: "300 ml CAN", flavour: "D'Coke", bpp: 24, mrp: 40, invoiceCost: 817.58, salePrice: 878 },
  { pack: "300 ml CAN", flavour: "Predator", bpp: 24, mrp: 60, invoiceCost: 1042.65, salePrice: 1110 },
  // 300 ml (Kinley Water)
  { pack: "300 ml", flavour: "Kinley Water", bpp: 24, mrp: 7, invoiceCost: 126.24, salePrice: 140 },
  // 350 ml CAN - Monster
  { pack: "350 ml CAN", flavour: "Monster", bpp: 24, mrp: 125, invoiceCost: 2050.54, salePrice: 2175 },
  // 400 ml csd
  { pack: "400 ml csd", flavour: "Thums up", bpp: 24, mrp: 20, invoiceCost: 399.19, salePrice: 420 },
  { pack: "400 ml csd", flavour: "Sprite", bpp: 24, mrp: 20, invoiceCost: 399.19, salePrice: 420 },
  { pack: "400 ml csd", flavour: "Coke", bpp: 24, mrp: 20, invoiceCost: 399.19, salePrice: 420 },
  // 500 ml - Kinley Water
  { pack: "500 ml", flavour: "Kinley Water", bpp: 24, mrp: 9, invoiceCost: 194.76, salePrice: 210 },
  // 600 ml PET - Mazza
  { pack: "600 ml PET", flavour: "Mazza", bpp: 24, mrp: 35, invoiceCost: 748.13, salePrice: 795 },
  // 740 ml
  { pack: "740 ml", flavour: "Thums up", bpp: 24, mrp: 35, invoiceCost: 741.24, salePrice: 795 },
  { pack: "740 ml", flavour: "Sprite", bpp: 24, mrp: 35, invoiceCost: 741.24, salePrice: 795 },
  { pack: "740 ml", flavour: "Limca", bpp: 24, mrp: 35, invoiceCost: 741.24, salePrice: 795 },
  { pack: "740 ml", flavour: "Fanta", bpp: 24, mrp: 35, invoiceCost: 741.24, salePrice: 795 },
  { pack: "740 ml", flavour: "Coke", bpp: 24, mrp: 40, invoiceCost: 839.68, salePrice: 900 },
  // 750 ml - Kinley Soda
  { pack: "750 ml", flavour: "Kinley Soda", bpp: 24, mrp: 20, invoiceCost: 422.19, salePrice: 447 },
  // 850 ml - MM Pulpy orange
  { pack: "850 ml", flavour: "MM Pulpy orange", bpp: 15, mrp: 50, invoiceCost: 670.32, salePrice: 710 },
  // 1 ltr PET
  { pack: "1 ltr PET", flavour: "Thums up", bpp: 15, mrp: 50, invoiceCost: 661.22, salePrice: 710 },
  { pack: "1 ltr PET", flavour: "Sprite", bpp: 15, mrp: 50, invoiceCost: 661.22, salePrice: 710 },
  { pack: "1 ltr PET", flavour: "Limca", bpp: 15, mrp: 50, invoiceCost: 661.22, salePrice: 710 },
  { pack: "1 ltr PET", flavour: "Fanta", bpp: 15, mrp: 50, invoiceCost: 661.22, salePrice: 710 },
  { pack: "1 ltr PET", flavour: "Coke", bpp: 15, mrp: 50, invoiceCost: 661.22, salePrice: 710 },
  { pack: "1 ltr PET", flavour: "MM Pulpy orange", bpp: 12, mrp: 90, invoiceCost: 906.89, salePrice: 960 },
  // 1 ltr - Kinley Water
  { pack: "1 ltr", flavour: "Kinley Water", bpp: 15, mrp: 18, invoiceCost: 160.77, salePrice: 175 },
  // 1.2 ltr - Mazza
  { pack: "1.2 ltr", flavour: "Mazza", bpp: 12, mrp: 75, invoiceCost: 803.03, salePrice: 840 },
  // 1.25 Ltr PET - Kinley Soda
  { pack: "1.25 Ltr PET", flavour: "Kinley Soda", bpp: 12, mrp: 30, invoiceCost: 316.15, salePrice: 336 },
  // 1.75 ltr - Mazza
  { pack: "1.75 ltr", flavour: "Mazza", bpp: 12, mrp: 95, invoiceCost: 906.91, salePrice: 960 },
  // 2 ltr - Kinley Water
  { pack: "2 ltr", flavour: "Kinley Water", bpp: 9, mrp: 28, invoiceCost: 174.57, salePrice: 190 },
  // 1.5 ltr PET - Sprite
  { pack: "1.5 ltr PET", flavour: "Sprite", bpp: 12, mrp: 70, invoiceCost: 721.25, salePrice: 771 },
  // 2.25 Ltr PET variations
  { pack: "2.25 Ltr PET", flavour: "Thums up", bpp: 9, mrp: 100, invoiceCost: 790.89, salePrice: 845 },
  { pack: "2.25 Ltr PET", flavour: "Sprite", bpp: 9, mrp: 100, invoiceCost: 790.89, salePrice: 845 },
  { pack: "2.25 Ltr PET", flavour: "Limca", bpp: 9, mrp: 100, invoiceCost: 787.20, salePrice: 845 },
  { pack: "2.25 Ltr PET", flavour: "Fanta", bpp: 9, mrp: 100, invoiceCost: 787.20, salePrice: 845 },
  { pack: "2.25 Ltr PET", flavour: "Coke", bpp: 9, mrp: 100, invoiceCost: 790.89, salePrice: 845 },
];

async function updateProducts() {
  await mongoose.connect(MONGODB_URI as string);
  console.log("Connected to MongoDB");

  let updated = 0;
let notFound = 0;

  // Normalization helper that removes spaces, non‑alphanumerics and lower‑cases
  const normalize = (s: string | undefined) =>
    (s || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");

  // Get distinct warehouse IDs
  const warehouseIds: any[] = await Product.distinct('warehouseId');

  for (const entry of MASTER_DATA) {
    // For each warehouse, upsert the product
    for (const wid of warehouseIds) {
      // Build filter using normalized pack and flavour
      const filter = {
        pack: entry.pack,
        flavour: entry.flavour,
        warehouseId: wid,
      };

      // Prepare update fields
      const update = {
        $set: {
          bottlesPerPack: entry.bpp,
          mrp: entry.mrp,
          invoiceCost: entry.invoiceCost,
          salePrice: entry.salePrice,
        },
        $setOnInsert: {
          name: `${entry.pack} - ${entry.flavour}`,
          sku: `${entry.pack}-${entry.flavour}`.replace(/\s+/g, '').toLowerCase(),
          pack: entry.pack,
          flavour: entry.flavour,
          warehouseId: wid,
        },
      };

      // Perform upsert
      const result = await Product.updateOne(filter, update, { upsert: true });
      if ((result as any).upsertedCount > 0) {
        console.log(`🆕 Created ${entry.pack} - ${entry.flavour} for warehouse ${wid}`);
      } else if ((result as any).modifiedCount > 0) {
        console.log(`✅ Updated ${entry.pack} - ${entry.flavour} for warehouse ${wid}`);
      }
      updated++;
    }
  }
  console.log(`\nSummary: ${updated} products updated, ${notFound} not found.`);
  process.exit(0);
}

updateProducts().catch((err) => {
  console.error("Error updating products:", err);
  process.exit(1);
});
