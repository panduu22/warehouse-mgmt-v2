const XLSX = require('xlsx');

// Create a workbook like generateExcelWorkbook
const productRows = [{
    "Product ID": "123",
    "Name": "Sprite - 1.5 ltr PET",
    "SKU": "SPRITE-1.5-LTR-PET",
    "Flavour": "Sprite",
    "Pack": "1.5 ltr PET",
    "Quantity": 10
}];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(productRows);
XLSX.utils.book_append_sheet(wb, ws, "Products & Stock");
const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

// Read it like import route
const workbook = XLSX.read(buffer, { type: "buffer" });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

const row = rows[0];
console.log("Parsed row:", row);

const get = (keys) => {
    for (const key of keys) {
        const found = Object.keys(row).find(
            (k) => k.trim().toLowerCase() === key.toLowerCase()
        );
        if (found !== undefined && row[found] !== "") return row[found];
    }
    return undefined;
};

console.log("Pack:", get(["pack", "package", "size", "volume"]));
console.log("Flavour:", get(["flavour", "flavor", "variant", "type"]));
console.log("Name:", get(["name", "product name", "product", "description"]));
