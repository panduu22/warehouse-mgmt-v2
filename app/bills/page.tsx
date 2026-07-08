"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Receipt, CheckCircle, ArrowRight } from "lucide-react";
import { formatIST, isoDateIST } from "@/lib/dateUtils";
import { useWarehouse } from "@/components/WarehouseContext";

export default function BillsPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [bills, setBills] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [pendingTrips, setPendingTrips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState("");
    const { activeWarehouse } = useWarehouse();

    // Manage invoice dates for pending items
    const [dates, setDates] = useState<Record<string, string>>({});

    const fetchData = async () => {
        setLoading(true);
        try {
            const [billsRes, tripsRes] = await Promise.all([
                fetch("/api/bills"),
                fetch("/api/trips")
            ]);
            const billsData = await billsRes.json();
            const tripsData = await tripsRes.json();

            setBills(billsData || []);

            // Filter verified trips that don't have a bill
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const billTripIds = new Set((billsData || []).map((b: any) => b.tripId?._id).filter(Boolean));
            const pending = (tripsData || []).filter(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (t: any) => t.status === "VERIFIED" && !billTripIds.has(t._id)
            );
            setPendingTrips(pending);
            const initialDates: Record<string, string> = {};
            pending.forEach((t: any) => {
                // Default to today in IST
                initialDates[t._id] = isoDateIST();
            });
            setDates(initialDates);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeWarehouse?.id]);

    const generateBill = async (tripId: string) => {
        setGenerating(tripId);
        try {
            const res = await fetch("/api/bills", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tripId,
                    date: dates[tripId]
                })
            });
            if (res.ok) {
                fetchData(); // Refresh both lists
            } else {
                const json = await res.json();
                alert(json.error);
            }
        } catch (e) {
            alert("Failed to generate bill");
        } finally {
            setGenerating("");
        }
    };

    return (
        <div className="max-w-[1200px] mx-auto animate-in fade-in duration-500 pb-10">
            <h1 className="text-3xl font-bold text-foreground mb-8">Billing & Invoicing</h1>

            {/* Pending Section */}
            <div className="mb-12">
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    Verified Trips (Pending Billing)
                </h2>
                {loading ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin text-muted-foreground w-8 h-8" /></div>
                ) : pendingTrips.length === 0 ? (
                    <div className="text-center p-12 bg-card rounded-xl border border-dashed border-border">
                        <p className="text-muted-foreground text-sm">No pending verified trips.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingTrips.map(trip => (
                            <div key={trip._id} className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-all">
                                <div className="mb-4">
                                    <h3 className="font-bold text-foreground text-lg">{trip.vehicleId?.number}</h3>
                                    <p className="text-sm text-muted-foreground">Verified on {formatIST(trip.endTime, { dateStyle: 'medium' })}</p>
                                </div>

                                <div className="mb-4">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Invoice Date</label>
                                    <input
                                        type="date"
                                        value={dates[trip._id] || ""}
                                        onChange={(e) => setDates({ ...dates, [trip._id]: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-border text-sm text-foreground bg-background focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                                    />
                                </div>

                                <button
                                    onClick={() => generateBill(trip._id)}
                                    disabled={generating === trip._id}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                                >
                                    {generating === trip._id ? <Loader2 className="animate-spin w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                                    Generate Bill
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* History Section */}
            <div>
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-primary" />
                    Invoice History
                </h2>

                <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[800px]">
                            <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                                <tr>
                                    <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest">Invoice Date</th>
                                    <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest">Verified Date</th>
                                    <th className="px-6 py-4 font-bold uppercase text-[10px] tracking-widest">Vehicle</th>
                                    <th className="px-6 py-4 text-right font-bold uppercase text-[10px] tracking-widest">Amount</th>
                                    <th className="px-6 py-4 text-right font-bold uppercase text-[10px] tracking-widest">UPI</th>
                                    <th className="px-6 py-4 text-right font-bold uppercase text-[10px] tracking-widest">Cash</th>
                                    <th className="px-6 py-4 text-right font-bold uppercase text-[10px] tracking-widest text-rose-600">Balance</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    <tr><td colSpan={8} className="p-12 text-center"><Loader2 className="animate-spin inline w-8 h-8 text-muted-foreground" /></td></tr>
                                ) : bills.length === 0 ? (
                                    <tr><td colSpan={8} className="p-12 text-center text-muted-foreground italic">No invoices generated yet.</td></tr>
                                ) : (
                                    bills.map(bill => (
                                        <tr key={bill._id} className="hover:bg-muted/30 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-foreground">{formatIST(bill.generatedAt, { dateStyle: 'medium' })}</td>
                                            <td className="px-6 py-4 text-muted-foreground">{bill.tripId?.endTime ? formatIST(bill.tripId.endTime, { dateStyle: 'medium' }) : '-'}</td>
                                            <td className="px-6 py-4 font-bold text-foreground">{bill.tripId?.vehicleId?.number}</td>
                                            <td className="px-6 py-4 text-right font-black text-primary text-base">₹{bill.totalAmount.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right font-semibold text-foreground text-sm">
                                                {bill.tripId?.upiAmount > 0 ? `₹${bill.tripId.upiAmount.toLocaleString()}` : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-semibold text-foreground text-sm">
                                                {bill.tripId?.cashAmount > 0 ? `₹${bill.tripId.cashAmount.toLocaleString()}` : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-sm">
                                                {(bill.tripId?.balanceAmount || 0) < 0.01
                                                    ? <span className="text-emerald-600">₹0</span>
                                                    : <span className="text-rose-600">₹{bill.tripId.balanceAmount.toLocaleString()}</span>
                                                }
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link href={`/bills/${bill._id}`} className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 font-bold text-[10px] uppercase tracking-widest transition-all hover:gap-2">
                                                    View Invoice <ArrowRight className="w-4 h-4" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
