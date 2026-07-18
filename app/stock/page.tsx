import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Plus, PackageSearch } from "lucide-react";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Warehouse from "@/models/Warehouse";
import { cookies } from "next/headers";
import DeleteProductButton from "./DeleteProductButton";
import { QuantityEditor } from "./QuantityEditor";
import { PriceEditor } from "./PriceEditor";
import { BottlesPerPackEditor } from "./BottlesPerPackEditor";
import mongoose from "mongoose";
import StockSearch from "@/components/StockSearch";
import StockExcelImport from "@/components/StockExcelImport";

import { StringEditor } from "./StringEditor";

import DeleteAllStockButton from "./DeleteAllStockButton";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

async function getProducts() {
    await dbConnect();
    
    // Get active warehouse context
    const cookieStore = await cookies();
    let warehouseId = cookieStore.get("activeWarehouseId")?.value;
    
    if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
        const main = await Warehouse.findOne({ isMain: true });
        if (main) warehouseId = main._id.toString();
        else warehouseId = undefined;
    }
    
    const warehouse = warehouseId ? await Warehouse.findById(warehouseId) : null;
    const filter = warehouseId ? { warehouseId } : {};

    const products = await Product.find(filter).sort({ displayOrder: 1, createdAt: 1 });
    return {
        products: JSON.parse(JSON.stringify(products)),
        warehouseName: warehouse?.name || "Unit"
    };
}

export default async function StockPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const { q: query } = await searchParams;
    const session = await getServerSession(authOptions);
    const { products: allProducts, warehouseName } = await getProducts();
    const isAdmin = (session?.user as any)?.role === "SUPER_ADMIN" || (session?.user as any)?.role === "WAREHOUSE_ADMIN";

    // Filtering
    const products = query ? allProducts.filter((p: any) =>
        p.name?.toLowerCase().includes(query.toLowerCase()) ||
        p.flavour?.toLowerCase().includes(query.toLowerCase()) ||
        p.pack?.toLowerCase().includes(query.toLowerCase()) ||
        p.sku?.toLowerCase().includes(query.toLowerCase())
    ) : allProducts;
    // Products arrive already sorted by displayOrder from the DB (Excel row order)

    // Calculations for the footer
    const totalPacks = products.reduce((sum: number, p: any) => {
        const bpp = p.bottlesPerPack || 1;
        return sum + Math.floor(p.quantity / bpp);
    }, 0);
    const totalBottles = products.reduce((sum: number, p: any) => {
        const bpp = p.bottlesPerPack || 1;
        return sum + (p.quantity % bpp);
    }, 0);
    const inventoryValue = products.reduce((sum: number, p: any) => {
        const bpp = p.bottlesPerPack || 1;
        return sum + ((p.quantity / bpp) * (p.invoiceCost || 0));
    }, 0);
    const salesValue = products.reduce((sum: number, p: any) => {
        const bpp = p.bottlesPerPack || 1;
        return sum + ((p.quantity / bpp) * (p.salePrice || 0));
    }, 0);

    const formatCurrency = (amount?: number) => {
        if (amount === undefined || amount === null) return "₹0";
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(amount);
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/50 backdrop-blur-sm p-4 md:p-6 rounded-2xl border shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Stock Management</h1>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2">
                        <PackageSearch className="w-4 h-4" /> Managing inventory for <span className="font-bold text-primary">{warehouseName}</span>
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    {isAdmin && <StockExcelImport />}
                    {isAdmin && <DeleteAllStockButton />}
                    <Link href="/stock/add" className={cn(buttonVariants({ variant: "default" }), "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all hover:scale-105 active:scale-95 gap-2")}>
                        <Plus className="w-5 h-5" />
                        Add Stock
                    </Link>
                </div>
            </div>

            <div className="flex w-full max-w-sm">
                <StockSearch />
            </div>

            <Card className="border shadow-erp-card rounded-2xl overflow-hidden bg-card text-card-foreground">
                <CardContent className="p-0">
                    <Table className="min-w-[1000px]">
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="font-bold">Pack</TableHead>
                                <TableHead className="font-bold">Flavour</TableHead>
                                <TableHead className="font-bold">Bottles/Pack</TableHead>
                                <TableHead className="font-bold">Invoice Cost</TableHead>
                                <TableHead className="text-right font-bold hidden md:table-cell">Invoice Amount</TableHead>
                                <TableHead className="font-bold">MRP (Base)</TableHead>
                                <TableHead className="font-bold hidden lg:table-cell">Profit/Margin</TableHead>
                                <TableHead className="font-bold">Sale Price</TableHead>
                                <TableHead className="text-right font-bold hidden md:table-cell">Sales Amount</TableHead>
                                <TableHead className="text-right font-bold">Quantity</TableHead>
                                <TableHead className="text-right font-bold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                                        No products found in {warehouseName}.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                products.map((product: any) => {
                                    const profit = (product.salePrice || 0) - (product.invoiceCost || 0);
                                    
                                    // Amount calculations
                                    const bottlesPerPack = product.bottlesPerPack;
                                    const totalPacks = product.quantity / bottlesPerPack;
                                    const invoiceAmount = totalPacks * (product.invoiceCost || 0);
                                    const salesAmount = totalPacks * (product.salePrice || 0);

                                    return (
                                        <TableRow key={product._id} className="hover:bg-muted/50 transition-colors group">
                                            <TableCell className="font-medium text-foreground w-44">
                                                <StringEditor productId={product._id} initialValue={product.pack || ""} field="pack" />
                                            </TableCell>
                                            <TableCell className="font-medium text-foreground w-44">
                                                <StringEditor productId={product._id} initialValue={product.flavour || ""} field="flavour" />
                                            </TableCell>
                                            <TableCell className="w-24">
                                                <BottlesPerPackEditor productId={product._id} initialBpp={product.bottlesPerPack} />
                                            </TableCell>
                                            <TableCell className="text-muted-foreground font-medium w-32">
                                                <PriceEditor productId={product._id} initialPrice={product.invoiceCost || 0} field="invoiceCost" />
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground/70 italic hidden md:table-cell">
                                                {formatCurrency(invoiceAmount)}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground font-medium w-32">
                                                <PriceEditor productId={product._id} initialPrice={product.mrp || 0} field="mrp" />
                                            </TableCell>

                                            <TableCell className={`font-bold hidden lg:table-cell ${profit >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                                                {formatCurrency(profit)}
                                            </TableCell>
                                            <TableCell className="text-foreground font-bold w-32">
                                                <PriceEditor productId={product._id} initialPrice={product.salePrice || 0} field="salePrice" />
                                            </TableCell>
                                            <TableCell className="text-right text-primary font-extrabold hidden md:table-cell">
                                                {formatCurrency(salesAmount)}
                                            </TableCell>
                                            <TableCell className="text-right w-48">
                                                <QuantityEditor 
                                                    productId={product._id} 
                                                    initialQuantity={product.quantity} 
                                                    bottlesPerPack={product.bottlesPerPack} 
                                                />
                                            </TableCell>
                                            <TableCell className="text-right w-16">
                                                <div className="flex justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <DeleteProductButton productId={product._id} />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                        {products.length > 0 && (
                            <TableFooter className="bg-muted/95 border-t-2 border-border font-extrabold text-foreground sticky bottom-0 backdrop-blur-sm z-10 shadow-lg">
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={11} className="p-4 sm:p-6">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                            {/* Card 1: Total Products */}
                                            <div className="bg-card border rounded-2xl p-3.5 shadow-sm flex flex-col justify-center items-center transition-all hover:shadow-erp-hover hover:scale-[1.02]">
                                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Products</span>
                                                <span className="text-base sm:text-lg font-black text-foreground mt-1">{products.length}</span>
                                            </div>
                                            {/* Card 2: Total Quantity */}
                                            <div className="bg-card border rounded-2xl p-3.5 shadow-sm flex flex-col justify-center items-center transition-all hover:shadow-erp-hover hover:scale-[1.02]">
                                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Quantity</span>
                                                <span className="text-base sm:text-lg font-black text-teal-600 mt-1">{totalPacks}P + {totalBottles}B</span>
                                            </div>
                                            {/* Card 3: Inventory Value */}
                                            <div className="bg-card border rounded-2xl p-3.5 shadow-sm flex flex-col justify-center items-center transition-all hover:shadow-erp-hover hover:scale-[1.02]">
                                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Inventory Value</span>
                                                <span className="text-base sm:text-lg font-black text-foreground mt-1">{formatCurrency(inventoryValue)}</span>
                                            </div>
                                            {/* Card 4: Sales Value */}
                                            <div className="bg-card border rounded-2xl p-3.5 shadow-sm flex flex-col justify-center items-center transition-all hover:shadow-erp-hover hover:scale-[1.02]">
                                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Sales Value</span>
                                                <span className="text-base sm:text-lg font-black text-primary mt-1">{formatCurrency(salesValue)}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            </TableFooter>
                        )}
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
