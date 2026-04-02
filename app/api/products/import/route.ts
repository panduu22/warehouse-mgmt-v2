import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import Warehouse from "@/models/Warehouse";
import mongoose from "mongoose";
import * as XLSX from "xlsx";
import { parsePack } from "@/lib/stock-utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session.user as any;
    if (user.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        await dbConnect();

        // Resolve warehouse context
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

        // Convert sheet to row objects. Header row expected:
        // Name | SKU | Flavour | Pack | Quantity | Invoice Cost | MRP | Sale Price | Today's Price
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (rows.length === 0) {
            return NextResponse.json({ error: "Excel file is empty or has no data rows." }, { status: 400 });
        }

        let created = 0;
        let updated = 0;
        const errors: string[] = [];

        for (const row of rows) {
            try {
                // Flexible column name mapping (case-insensitive)
                const get = (keys: string[]) => {
                    for (const key of keys) {
                        const found = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
                        if (found !== undefined && row[found] !== "") return row[found];
                    }
                    return undefined;
                };

                const name = String(get(["name", "product name", "product", "description"]) || "").trim();
                if (!name) { errors.push(`Row skipped: missing product name`); continue; }

                let flavour = String(get(["flavour", "flavor", "variant", "type"]) || "").trim();
                let pack = String(get(["pack", "package", "packaging", "size", "volume", "vol", "unit"]) || "").trim();

                // FALLBACK: Parse flavour and pack from Name if missing
                if (!flavour || !pack) {
                    const parts = name.split(" ");
                    if (!flavour && parts.length > 0) {
                        // If it's Thums Up, handle as two words
                        if (parts[0].toLowerCase() === "thums" && parts[1]?.toLowerCase() === "up") {
                            flavour = "Thums Up";
                        } else {
                            flavour = parts[0];
                        }
                    }
                    if (!pack && flavour) {
                        const remaining = name.slice(name.indexOf(flavour) + flavour.length).trim();
                        if (remaining) pack = remaining;
                    }
                }

                const rawQuantity = get(["quantity", "qty", "stock", "balance", "opening stock"]);
                let quantity = 0;
                const bpp = parsePack(pack, name);

                if (typeof rawQuantity === "number") {
                    if (!Number.isInteger(rawQuantity)) {
                        // Legacy P.B format detected (e.g. 2.9)
                        const packs = Math.floor(rawQuantity);
                        const bottles = Math.round((rawQuantity % 1) * 10);
                        quantity = (packs * bpp) + bottles;
                    } else {
                        quantity = rawQuantity;
                    }
                } else if (typeof rawQuantity === "string" && rawQuantity.includes(".")) {
                    const [pStr, bStr] = rawQuantity.split(".");
                    quantity = (parseInt(pStr || "0", 10) * bpp) + parseInt(bStr || "0", 10);
                } else {
                    quantity = Number(rawQuantity || 0);
                }

                const invoiceCost = Number(get(["invoice cost", "invoicecost", "invoice", "cost", "purchase price"]) || 0);
                const mrp = Number(get(["mrp", "mrp (base)", "base mrp", "label price"]) || 0);
                const salePrice = Number(get(["sale price", "saleprice", "selling price", "retail price", "rate"]) || 0);
                const price = Number(get(["today's price", "todays price", "price", "today price", "current price"]) || salePrice);

                let sku = String(get(["sku", "sku code", "code", "barcode"]) || "").trim();
                if (!sku) {
                    // Auto-generate SKU based on the potentially parsed flavour/pack
                    const base = name.substring(0, 3).toUpperCase();
                    const flav = flavour.substring(0, 3).toUpperCase();
                    const pck = pack.substring(0, 3).toUpperCase();
                    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
                    sku = `${base}-${flav}-${pck}-${rand}`.replace(/-+/g, "-");
                }
                
                // Upsert by SKU + warehouseId
                const existing = await Product.findOne({ sku, warehouseId });
                if (existing) {
                    await Product.updateOne({ _id: existing._id }, {
                        name, quantity, invoiceCost, mrp, salePrice, price, flavour, pack
                    });
                    updated++;
                } else {
                    await Product.create({ name, sku, quantity, invoiceCost, mrp, salePrice, price, flavour, pack, warehouseId });
                    created++;
                }
            } catch (rowErr: any) {
                errors.push(`Row error: ${rowErr.message}`);
            }
        }

        return NextResponse.json({ success: true, created, updated, errors });
    } catch (error: any) {
        console.error("Excel Import Error:", error);
        return NextResponse.json({ error: error.message || "Failed to import Excel" }, { status: 500 });
    }
}
