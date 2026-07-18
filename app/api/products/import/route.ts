import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import Warehouse from "@/models/Warehouse";
import mongoose from "mongoose";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session.user as any;
    if (user.role !== "SUPER_ADMIN" && user.role !== "WAREHOUSE_ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        await dbConnect();

        // Resolve active warehouse context
        const cookieStore = await cookies();
        let warehouseId = cookieStore.get("activeWarehouseId")?.value;

        if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
            const main = await Warehouse.findOne({ isMain: true });
            if (!main) return NextResponse.json({ error: "No warehouse context found" }, { status: 400 });
            warehouseId = main._id.toString();
        }

        // Parse file from form data
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert sheet to row objects
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (rows.length === 0) {
            return NextResponse.json({ error: "Excel file is empty or has no data rows." }, { status: 400 });
        }



        let created = 0;
        let updated = 0;
        const errors: string[] = [];

        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            try {
                // Flexible case-insensitive column finder
                const get = (keys: string[]) => {
                    for (const key of keys) {
                        const found = Object.keys(row).find(
                            (k) => k.trim().toLowerCase() === key.toLowerCase()
                        );
                        if (found !== undefined && row[found] !== "") return row[found];
                    }
                    return undefined;
                };

                let pack = String(get(["pack", "package", "size", "volume"]) || "").trim();
                let flavour = String(get(["flavour", "flavor", "variant", "type"]) || "").trim();
                const productName = String(get(["product", "product name", "name", "description"]) || "").trim();

                // Fallback to parsing from productName if columns are missing
                if ((!pack || !flavour) && productName) {
                    const PACK_PREFIXES = [
                        "150 ml Tetra",
                        "200 ml RGB",
                        "250 ml PET",
                        "300 ml RGB",
                        "330 ml CAN",
                        "350 ml CAN",
                        "400 ml PET",
                        "500 ml PET",
                        "600 ml PET",
                        "750 ml RGB",
                        "1 Ltr PET",
                        "1.25 Ltr PET",
                        "2 Ltr PET"
                    ];

                    for (const prefix of PACK_PREFIXES) {
                        if (productName.startsWith(prefix)) {
                            pack = prefix;
                            flavour = productName.substring(prefix.length).trim();
                            break;
                        }
                    }

                    // Ultimate fallback
                    if (!pack) {
                        pack = "Other";
                        flavour = productName;
                    }
                }

                if (!pack || !flavour) {
                    errors.push(`Row ${rowIndex + 2}: skipped — missing Pack and Flavour`);
                    continue;
                }

                const name = `${pack} ${flavour}`;

                // Bottles/Pack = Bottles per Pack
                const bottlesPerPack = Number(
                    get(["bottles per pack", "bottles/pack", "bpp", "bottles_per_pack", "bottle per pack"]) || 24
                );

                // Invoice Cost
                const invoiceCost = Number(get(["invoice cost", "invoicecost", "invoice"]) || 0);

                // MRP (Base)
                const mrp = Number(get(["mrp", "mrp (base)", "base mrp", "label price"]) || 0);

                // Sale Price
                const salePrice = Number(
                    get(["sale price", "saleprice", "selling price", "retail price"]) || 0
                );

                // Quantity = Total PC (in bottles)
                const rawQty = get(["total pc", "totalpc", "total_pc", "quantity", "qty", "stock", "balance"]);
                const quantity = Number(rawQty || 0);

                // displayOrder = Excel row index (0-based)
                const displayOrder = rowIndex;

                // Generate a stable, deterministic SKU from name (no random suffix for cross-warehouse consistency)
                const skuBase = name
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "-")
                    .replace(/-+/g, "-")
                    .slice(0, 30);

                // === ACTIVE WAREHOUSE: upsert with actual quantity ===
                const existingInActive = await Product.findOne({ name, warehouseId });
                if (existingInActive) {
                    await Product.updateOne(
                        { _id: existingInActive._id },
                        {
                            $set: {
                                quantity,
                                invoiceCost,
                                mrp,
                                salePrice,
                                price: salePrice,
                                bottlesPerPack,
                                displayOrder,
                                pack,
                                flavour,
                                sku: skuBase + "-" + warehouseId.slice(-4),
                            },
                        }
                    );
                    updated++;
                } else {
                    await Product.create({
                        name,
                        sku: skuBase + "-" + warehouseId.slice(-4),
                        quantity,
                        price: salePrice,
                        invoiceCost,
                        mrp,
                        salePrice,
                        bottlesPerPack,
                        displayOrder,
                        pack,
                        flavour,
                        warehouseId,
                    });
                    created++;
                }


            } catch (rowErr: any) {
                errors.push(`Row ${rowIndex + 2} error: ${rowErr.message}`);
            }
        }

        return NextResponse.json({ success: true, created, updated, errors });
    } catch (error: any) {
        console.error("Excel Import Error:", error);
        return NextResponse.json({ error: error.message || "Failed to import Excel" }, { status: 500 });
    }
}
