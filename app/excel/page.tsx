import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { triggerExcelSync } from "@/lib/excelSync";

// Force dynamic rendering on each request
export const dynamic = "force-dynamic";

interface RowData {
  [key: string]: any;
}

export default async function ExcelPage() {
  let rows: RowData[] = [];
  try {
    await triggerExcelSync();
    const filePath = path.join(process.cwd(), "public", "warehouse_data.xlsx");
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames.find((n) => /Products \& Stock/i.test(n)) || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json(worksheet);
  } catch (e) {
    console.error("Excel page load error", e);
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Warehouse Stock Overview</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200">
          <thead className="bg-muted">
            <tr>
              {rows.length > 0 &&
                Object.keys(rows[0]).map((header) => (
                  <th key={header} className="px-4 py-2 text-left border-b">
                    {header}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-2 text-center" colSpan={Object.keys(rows[0] || { length: 1 }).length}>
                  No data found in the Excel sheet.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx} className="odd:bg-gray-50">
                  {Object.values(row).map((cell, i) => (
                    <td key={i} className="px-4 py-2 border-b">
                      {cell?.toString() ?? ""}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
