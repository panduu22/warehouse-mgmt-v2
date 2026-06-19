import { NextResponse } from "next/server";
import { generateExcelWorkbook } from "@/lib/excelSync";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Generate workbook in memory
        const wb = await generateExcelWorkbook();
        
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
