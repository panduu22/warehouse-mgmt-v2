import { NextResponse } from "next/server";
import { triggerExcelSync } from "@/lib/excelSync";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as fs from "fs";
import * as path from "path";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Trigger a fresh sync right before download to ensure absolute latest data
        await triggerExcelSync();

        const filePath = path.join(process.cwd(), "data/warehouse_data.xlsx");
        
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: "Excel report not found" }, { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filePath);

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
