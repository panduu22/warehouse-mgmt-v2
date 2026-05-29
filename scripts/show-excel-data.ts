import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: ".env.local" });

async function main() {
    // Step 1: Trigger Excel sync via API endpoint
    console.log("🔄 Reading Excel file from disk...");
    const tmpPath = path.join(process.cwd(), 'data', 'warehouse_data.xlsx');
    console.log('✅ Excel file ready');

    // Step 2: Read and print Excel contents
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    const XLSX = require("xlsx");
    const wb = XLSX.readFile(tmpPath);

    for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        console.log(`\n${"═".repeat(60)}`);
        console.log(`📋 SHEET: ${sheetName}  (${rows.length} rows)`);
        console.log("═".repeat(60));

        if (rows.length === 0) {
            console.log("  (no data in this sheet)");
            continue;
        }

        const cols = Object.keys(rows[0]);
        console.log("COLUMNS:", cols.join("  |  "));
        console.log("─".repeat(60));

        rows.slice(0, 5).forEach((row, i) => {
            console.log(`\nRow ${i + 1}:`);
            cols.forEach(col => {
                console.log(`  ${col}: ${row[col] ?? ""}`);
            });
        });

        if (rows.length > 5) {
            console.log(`\n  ... and ${rows.length - 5} more rows`);
        }
    }

    process.exit(0);
}

main().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});
