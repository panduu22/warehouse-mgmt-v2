"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Receipt, CheckCircle, ArrowRight } from "lucide-react";

export default function BillsPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [bills, setBills] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [pendingTrips, setPendingTrips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState("");

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

            setBills(billsData);

            // Filter verified trips that don't have a bill
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const billTripIds = new Set(billsData.map((b: any) => b.tripId._id));
            const pending = tripsData.filter(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (t: any) => t.status === "VERIFIED" && !billTripIds.has(t._id)
            );
            setPendingTrips(pending);

            // Initialize dates
            const initialDates: Record<string, string> = {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pending.forEach((t: any) => {
                // Default to today
                initialDates[t._id] = new Date().toISOString().split('T')[0];
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
    }, []);

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
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing & Invoicing</h1>

            {/* Pending Section */}
            <div className="mb-12">
                <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-teal-600" />
                    Verified Trips (Pending Billing)
                </h2>
                {loading ? (
                    <Loader2 className="animate-spin text-gray-400" />
                ) : pendingTrips.length === 0 ? (
                    <p className="text-gray-500 text-sm">No pending verified trips.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingTrips.map(trip => (
                            <div key={trip._id} className="bg-white p-6 rounded-xl border border-teal-100 shadow-sm">
                                <div className="mb-4">
                                    <h3 className="font-bold text-gray-900">{trip.vehicleId?.number}</h3>
                                    <p className="text-sm text-gray-500">Verified on {new Date(trip.endTime).toLocaleDateString()}</p>
                                </div>

                                <div className="mb-4">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Invoice Date</label>
                                    <input
                                        type="date"
                                        value={dates[trip._id] || ""}
                                        onChange={(e) => setDates({ ...dates, [trip._id]: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>

                                <button
                                    onClick={() => generateBill(trip._id)}
                                    disabled={generating === trip._id}
                                    className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
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
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="animate-spin inline" /></td></tr>
                            ) : bills.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No invoices generated yet.</td></tr>
                            ) : (
                                bills.map(bill => (
                                    <tr key={bill._id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4">{new Date(bill.generatedAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-gray-500">{bill.tripId?.endTime ? new Date(bill.tripId.endTime).toLocaleDateString() : '-'}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{bill.tripId?.vehicleId?.number}</td>
                                        <td className="px-6 py-4 text-right font-bold text-ruby-700">₹{bill.totalAmount.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <Link href={`/bills/${bill._id}`} className="text-gray-400 hover:text-ruby-700 inline-flex items-center gap-1 font-medium text-xs uppercase tracking-wide">
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
