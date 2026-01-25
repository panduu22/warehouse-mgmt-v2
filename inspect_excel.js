const XLSX = require('xlsx');
const fs = require('fs');

const file = 'data/stock.xlsx';
if (!fs.existsSync(file)) {
    console.error("File not found:", file);
    process.exit(1);
}

const workbook = XLSX.readFile(file);
const sheetName = workbook.SheetNames[0]; // First sheet
const sheet = workbook.Sheets[sheetName];

// Convert to JSON to see headers
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
if (data.length > 0) {
    console.log("Headers:", data[0]);
    console.log("First Row:", data[1]);
} else {
    console.log("Empty sheet");
}
