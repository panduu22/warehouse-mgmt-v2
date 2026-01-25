import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(process.cwd(), 'data/stock.xlsx');

try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Get headers
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const headers = jsonData[0];

    console.log("Headers found:", headers);

    // Show first row of data
    if (jsonData.length > 1) {
        console.log("First row data:", jsonData[1]);
    }
} catch (error) {
    console.error("Error reading excel:", error);
}
