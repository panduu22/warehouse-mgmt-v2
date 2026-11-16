"use client";

import React from "react";
import { X, Printer, Calendar, Clock, Warehouse, User, Package, Hash } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface RestockProductDetail {
    productId: string;
    productNameSnapshot: string;
    flavourSnapshot?: string;
    packSizeSnapshot?: string;
    casesRestocked: number;
    bottlesRestocked: number;
    bottlesPerPack: number;
    invoiceCostPerCase: number;
    caseCost: number;
    bottleCost: number;
    totalCost: number;
}

export interface RestockTransactionDetail {
    _id: string;
    transactionId: string;
    warehouseId: string;
    warehouseName: string;
    createdBy: {
        userId?: string;
        userName: string;
        userEmail?: string;
    };
    restockDate: string;
    restockTime: string;
    products: RestockProductDetail[];
    totalProducts: number;
    totalCases: number;
    totalBottles: number;
    grandTotal: number;
    createdAt: string;
}

interface Props {
    transaction: RestockTransactionDetail | null;
    open: boolean;
    onClose: () => void;
}

const formatCurrency = (amount: number = 0) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);

const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const [y, m, d] = dateStr.split("-");
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
};

export default function RestockTransactionDetailsModal({ transaction, open, onClose }: Props) {
    if (!transaction) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-card border shadow-2xl rounded-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <DialogHeader className="p-6 pb-4 bg-muted/40 border-b flex-shrink-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                                    Restock Transaction
                                </span>
                                <span className="font-mono text-sm font-black text-foreground">
                                    {transaction.transactionId}
                                </span>
                            </div>
                            <DialogTitle className="text-xl font-bold text-foreground mt-2">
                                Restocking Details
                            </DialogTitle>
                        </div>
                        <div className="flex items-center gap-2 print:hidden self-end sm:self-auto">
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-sm"
                                title="Print transaction details"
                            >
                                <Printer className="w-3.5 h-3.5" /> Print
                            </button>
                        </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-border/60 text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                            <div>
                                <div className="text-[10px] uppercase font-bold text-muted-foreground/70">Date</div>
                                <div className="font-semibold text-foreground">{formatDate(transaction.restockDate)}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                            <div>
                                <div className="text-[10px] uppercase font-bold text-muted-foreground/70">Time</div>
                                <div className="font-semibold text-foreground">{transaction.restockTime || "—"}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Warehouse className="w-3.5 h-3.5 text-primary shrink-0" />
                            <div>
                                <div className="text-[10px] uppercase font-bold text-muted-foreground/70">Warehouse</div>
                                <div className="font-semibold text-foreground truncate max-w-[130px]">{transaction.warehouseName}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="w-3.5 h-3.5 text-primary shrink-0" />
                            <div>
                                <div className="text-[10px] uppercase font-bold text-muted-foreground/70">Entered By</div>
                                <div className="font-semibold text-foreground truncate max-w-[130px]">{transaction.createdBy?.userName || "Unknown"}</div>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                {/* Table Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="rounded-xl border border-border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/60 text-xs uppercase font-bold text-muted-foreground border-b border-border">
                                <tr>
                                    <th className="py-3 px-4 text-left">Product Name</th>
                                    <th className="py-3 px-4 text-right">Cases</th>
                                    <th className="py-3 px-4 text-right">Bottles</th>
                                    <th className="py-3 px-4 text-right">Invoice Cost / Case</th>
                                    <th className="py-3 px-4 text-right">Total Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {transaction.products.map((item, idx) => {
                                    const subtitleParts = [item.packSizeSnapshot, item.flavourSnapshot].filter(Boolean);
                                    return (
                                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <div className="font-semibold text-foreground">
                                                    {item.productNameSnapshot}
                                                </div>
                                                {subtitleParts.length > 0 && (
                                                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                                        {item.packSizeSnapshot && (
                                                            <span className="bg-muted px-1.5 py-0.5 rounded text-[11px]">
                                                                {item.packSizeSnapshot}
                                                            </span>
                                                        )}
                                                        {item.flavourSnapshot && (
                                                            <span className="text-muted-foreground/80">
                                                                · {item.flavourSnapshot}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] text-muted-foreground/60">
                                                            ({item.bottlesPerPack} BPP)
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-bold text-foreground">
                                                {item.casesRestocked}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-semibold text-foreground">
                                                {item.bottlesRestocked}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-medium text-muted-foreground">
                                                {formatCurrency(item.invoiceCostPerCase)}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-black text-foreground">
                                                {formatCurrency(item.totalCost)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Totals */}
                <div className="p-4 sm:p-6 bg-muted/30 border-t border-border flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 flex-shrink-0">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div>
                            <span className="font-medium">Products: </span>
                            <span className="font-bold text-foreground">{transaction.totalProducts}</span>
                        </div>
                        <div>
                            <span className="font-medium">Total Restocked: </span>
                            <span className="font-bold text-teal-600">
                                {transaction.totalCases} Cases{transaction.totalBottles > 0 ? ` + ${transaction.totalBottles} Bottles` : ""}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-baseline justify-between sm:justify-end gap-3 bg-card sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0">
                        <span className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider">
                            Transaction Grand Total:
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-primary">
                            {formatCurrency(transaction.grandTotal)}
                        </span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

