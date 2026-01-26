"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Receipt, CheckCircle, ArrowRight } from "lucide-react";
import { useGodown } from "@/components/GodownProvider";
import axios from "axios";

export default function BillsPage() {
    const { selectedWarehouse, isLoading: isWarehouseLoading } = useGodown();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [bills, setBills] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [pendingTrips, setPendingTrips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState("");

    // Manage invoice dates for pending items
    const [dates, setDates] = useState<Record<string, string>>({});

    useEffect(() => {
        if (selectedWarehouse && !isWarehouseLoading) {
            fetchData();
        }
    }, [selectedWarehouse, isWarehouseLoading]);

    const fetchData = async () => {
        if (!selectedWarehouse) return;
        setLoading(true);
        try {
            // New API returns { bills, pendingTrips }
            const res = await axios.get(`/api/bills?warehouseId=${selectedWarehouse.id}`);
            const { bills = [], pendingTrips = [] } = res.data || {};

            setBills(Array.isArray(bills) ? bills : []);
            setPendingTrips(Array.isArray(pendingTrips) ? pendingTrips : []);

            // Initialize dates
            const initialDates: Record<string, string> = {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (Array.isArray(pendingTrips) ? pendingTrips : []).forEach((t: any) => {
                initialDates[t.id] = new Date().toISOString().split('T')[0];
            });
            setDates(initialDates);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const generateBill = async (tripId: string) => {
        if (!confirm("Generate Invoice for this trip?")) return;
        setGenerating(tripId);
        try {
            await axios.post("/api/bills", {
                tripId,
                date: dates[tripId]
            });
            fetchData(); // Refresh list
        } catch (e: any) {
            alert(e.response?.data?.error || "Failed to generate bill");
        } finally {
            setGenerating("");
        }
    };

    if (isWarehouseLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!selectedWarehouse) return <div className="p-8 text-center text-gray-500">Select a warehouse to view billing.</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing & Invoicing</h1>

            {/* Pending Section */}
            <div className="mb-12">
                <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-teal-600" />
                    Verified Trips (Pending Billing)
                </h2>
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-gray-400" /></div>
                ) : !Array.isArray(pendingTrips) || pendingTrips.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500 border border-gray-100">
                        No pending verified trips. Verify a trip first to unlock billing.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingTrips.map(trip => (
                            <div key={trip.id} className="bg-white p-6 rounded-xl border border-teal-100 shadow-sm">
                                <div className="mb-4">
                                    <h3 className="font-bold text-gray-900">{trip.vehicle?.number || "Unknown Vehicle"}</h3>
                                    <p className="text-sm text-gray-500">Verified on {new Date(trip.endTime).toLocaleDateString()}</p>
                                </div>

                                <div className="mb-4">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Invoice Date</label>
                                    <input
                                        type="date"
                                        value={dates[trip.id] || ""}
                                        onChange={(e) => setDates({ ...dates, [trip.id]: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>

                                <button
                                    onClick={() => generateBill(trip.id)}
                                    disabled={generating === trip.id}
                                    className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                                >
                                    {generating === trip.id ? <Loader2 className="animate-spin w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                                    Generate Bill
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* History Section */}
            <div>
                <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-ruby-700" />
                    Invoice History
                </h2>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Invoice Date</th>
                                <th className="px-6 py-4">Verified Date</th>
                                <th className="px-6 py-4">Vehicle</th>
                                <th className="px-6 py-4 text-right">Profit</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="animate-spin inline" /></td></tr>
                            ) : !Array.isArray(bills) || bills.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No invoices generated yet.</td></tr>
                            ) : (
                                bills.map(bill => (
                                    <tr key={bill.id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4 text-gray-900 font-medium">
                                            {new Date(bill.generatedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {bill.trip?.endTime ? new Date(bill.trip.endTime).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {bill.trip?.vehicle?.number}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-emerald-600">
                                            ₹{(bill.totalProfit || 0).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-ruby-700">
                                            ₹{bill.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link href={`/bills/${bill.id}`} className="text-gray-400 hover:text-ruby-700 inline-flex items-center gap-1 font-medium text-xs uppercase tracking-wide">
                                                View <ArrowRight className="w-4 h-4" />
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
    );
}
