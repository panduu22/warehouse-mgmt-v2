import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { logActivity } from "@/lib/activity";
import {
    requireWarehouseAccess,
    resolveWarehouseId,
} from "@/lib/warehouseAccess";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // ── RBAC ────────────────────────────────────────────────────────────
        const { denied, isSuperAdmin, assignedWarehouseIds } =
            await requireWarehouseAccess(session);
        if (denied) return denied;

        const user = session.user as any;

        const body = await req.json();
        const salePrice = Number(body.salePrice) || 0;
        const price = Number(body.price) || salePrice;

        const data = {
            ...body,
            name: `${body.pack || ""} ${body.flavour || ""}`.trim(),
            price,
            salePrice,
        };

        await dbConnect();
        const cookieStore = await cookies();
        const cookieWarehouseId = cookieStore.get("activeWarehouseId")?.value;

        const warehouseId = await resolveWarehouseId(
            cookieWarehouseId,
            isSuperAdmin,
            assignedWarehouseIds
        );
        if (!warehouseId) {
            return NextResponse.json(
                { error: "No warehouse context found" },
                { status: 400 }
            );
        }

        // Auto-generate SKU if not provided
        let sku = data.sku;
        if (!sku) {
            const base = (data.name || "").substring(0, 3).toUpperCase();
            const flav = (data.flavour || "").substring(0, 3).toUpperCase();
            const pck = (data.pack || "").substring(0, 3).toUpperCase();
            const random = Math.floor(Math.random() * 10000)
                .toString()
                .padStart(4, "0");
            sku = `${base}-${flav}-${pck}-${random}`.replace(/-+/g, "-");
        }

        const product = await Product.create({
            ...data,
            sku,
            warehouseId,
        });

        await logActivity({
            userId: user.id || user._id,
            warehouseId: product.warehouseId.toString(),
            action: "CREATE_PRODUCT",
            details: `Added new product ${product.name} (SKU: ${product.sku}).`,
            targetId: product._id.toString(),
            targetModel: "Product",
        });

        return NextResponse.json(product, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to create product" },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // ── RBAC ────────────────────────────────────────────────────────────
        const { denied, isSuperAdmin, assignedWarehouseIds } =
            await requireWarehouseAccess(session);
        if (denied) return denied;

        const [, cookieStore] = await Promise.all([dbConnect(), cookies()]);
        const cookieWarehouseId = cookieStore.get("activeWarehouseId")?.value;

        const warehouseId = await resolveWarehouseId(
            cookieWarehouseId,
            isSuperAdmin,
            assignedWarehouseIds
        );

        const filter = warehouseId ? { warehouseId } : {};
        const products = await Product.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(products);
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch products" },
            { status: 500 }
        );
    }
}
