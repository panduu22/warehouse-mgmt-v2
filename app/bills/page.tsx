"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Receipt, CheckCircle, ArrowRight } from "lucide-react";
import { useGodown } from "@/components/GodownProvider";
import axios from "axios";
import clsx from "clsx";

export default function BillsPage() {
    const { selectedWarehouse, isLoading: isWarehouseLoading } = useGodown();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [bills, setBills] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [pendingTrips, setPendingTrips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState<string>("ALL");

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

    // FILTER LOGIC
    const filteredBills = bills.filter(bill => {
        const matchesSearch = bill.trip?.vehicle?.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bill.id.toLowerCase().includes(searchTerm.toLowerCase());

        const billDate = new Date(bill.generatedAt).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];

        let matchesDate = true;
        if (dateFilter === "TODAY") {
            matchesDate = billDate === today;
        } else if (dateFilter !== "ALL") {
            matchesDate = billDate === dateFilter;
        }

        return matchesSearch && matchesDate;
    });

    // SUMMARY STATS CALCULATION
    let summaryBills = bills;
    let periodLabel = "All Time";

    if (dateFilter === "TODAY") {
        const today = new Date().toISOString().split('T')[0];
        summaryBills = bills.filter(bill => new Date(bill.generatedAt).toISOString().split('T')[0] === today);
        periodLabel = "Today";
    } else if (dateFilter !== "ALL") {
        summaryBills = bills.filter(bill => new Date(bill.generatedAt).toISOString().split('T')[0] === dateFilter);
        periodLabel = new Date(dateFilter).toLocaleDateString();
    }

    const summaryTotal = summaryBills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);

    // Group by vehicle
    const vehicleStats = summaryBills.reduce((acc, bill) => {
        const vehicleNum = bill.trip?.vehicle?.number || "Unknown";
        acc[vehicleNum] = (acc[vehicleNum] || 0) + (bill.totalAmount || 0);
        return acc;
    }, {} as Record<string, number>);

    if (isWarehouseLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!selectedWarehouse) return <div className="p-8 text-center text-gray-500">Select a warehouse to view billing.</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing & Invoicing</h1>

            {/* Daily Summary Card */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white mb-8 shadow-lg">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div>
                        <h2 className="text-gray-400 text-sm font-medium mb-1">Total Collection ({periodLabel})</h2>
                        <div className="text-4xl font-bold text-emerald-400">₹{summaryTotal.toLocaleString()}</div>
                        <p className="text-sm text-gray-500 mt-2">{summaryBills.length} invoices generated</p>
                    </div>

                    <div className="flex-1">
                        <h3 className="text-gray-400 text-sm font-medium mb-3">Vehicle Breakdown ({periodLabel})</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {Object.entries(vehicleStats).map(([vehicle, amount]) => (
                                <div key={vehicle} className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                                    <div className="text-xs text-gray-300 font-medium mb-1">{vehicle}</div>
                                    <div className="text-lg font-bold">₹{Number(amount).toLocaleString()}</div>
                                </div>
                            ))}
                            {summaryBills.length === 0 && (
                                <div className="text-gray-500 text-sm col-span-full">No invoices generated for this period.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

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
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-4">
                    <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-ruby-700" />
                        Invoice History
                    </h2>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search Vehicle..."
                                className="pl-3 pr-10 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-64 focus:ring-ruby-500 focus:border-ruby-500 text-gray-900 bg-white placeholder-gray-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex bg-gray-100 p-1 rounded-lg items-center gap-1">
                            <button
                                onClick={() => setDateFilter("ALL")}
                                className={clsx("px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap", dateFilter === "ALL" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900")}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setDateFilter("TODAY")}
                                className={clsx("px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap", dateFilter === "TODAY" ? "bg-white text-ruby-600 shadow-sm" : "text-gray-500 hover:text-gray-900")}
                            >
                                Today
                            </button>
                            <div className="h-4 w-px bg-gray-300 mx-1"></div>
                            <input
                                type="date"
                                value={dateFilter !== "ALL" && dateFilter !== "TODAY" ? dateFilter : ""}
                                onChange={(e) => setDateFilter(e.target.value || "ALL")}
                                className="bg-transparent text-sm text-gray-700 focus:outline-none border-none p-1"
                            />
                        </div>
                    </div>
                </div>

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
                                <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="animate-spin inline" /></td></tr>
                            ) : filteredBills.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No invoices found matching your filters.</td></tr>
                            ) : (
                                filteredBills.map(bill => (
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
