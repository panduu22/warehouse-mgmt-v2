import { NextResponse } from "next/server";
import { generateExcelWorkbook } from "@/lib/excelSync";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from "xlsx";
import { cookies } from "next/headers";
import { requireWarehouseAccess, resolveWarehouseId } from "@/lib/warehouseAccess";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { denied, isSuperAdmin, assignedWarehouseIds } = await requireWarehouseAccess(session);
    if (denied) return denied;

    try {
        const cookieStore = await cookies();
        const cookieWarehouseId = cookieStore.get("activeWarehouseId")?.value;

        const warehouseId = await resolveWarehouseId(
            cookieWarehouseId,
            isSuperAdmin,
            assignedWarehouseIds
        );

        if (!warehouseId) {
            return NextResponse.json({ error: "No warehouse context found" }, { status: 400 });
        }

        // Generate workbook in memory restricted to current warehouse
        const wb = await generateExcelWorkbook(warehouseId);
        
        // Write to buffer
        const fileBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        return new Response(fileBuffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": "attachment; filename=warehouse_data.xlsx"
            }
        });
    } catch (error) {
        console.error("Failed to generate Excel download", error);
        return NextResponse.json({ error: "Failed to generate Excel download" }, { status: 500 });
    }
}
