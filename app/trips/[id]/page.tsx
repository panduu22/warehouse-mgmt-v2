"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Truck, PackageCheck, AlertCircle, Save, CheckCircle } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import axios from "axios";

export default function TripDetailsPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params); // Unwrap params
    const router = useRouter();
    const [trip, setTrip] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);

    // State for returns: { productId: qtyReturned }
    const [returns, setReturns] = useState<Record<string, number>>({});

    useEffect(() => {
        fetchTrip();
    }, [params.id]);

    const fetchTrip = async () => {
        try {
            const res = await axios.get(`/api/trips/${params.id}`);
            const data = res.data || {};
            setTrip(data);

            // Initialize returns with 0 (or existing if verified?)
            const initialReturns: Record<string, number> = {};
            const loadedItems = Array.isArray(data.loadedItems) ? data.loadedItems : [];

            if (data.status === "VERIFIED") {
                // If Verified, show what was returned
                loadedItems.forEach((item: any) => {
                    initialReturns[item.productId] = item.qtyReturned || 0;
                });
            } else {
                // Pending verification, default to 0
                loadedItems.forEach((item: any) => {
                    initialReturns[item.productId] = 0;
                });
            }
            setReturns(initialReturns);
        } catch (error) {
            console.error("Failed to fetch trip", error);
        } finally {
            setLoading(false);
        }
    };

    const handleReturnChange = (productId: string, val: string) => {
        const qty = parseInt(val) || 0;
        setReturns(prev => ({ ...prev, [productId]: qty }));
    };

    const handleVerify = async () => {
        if (!confirm("Confirm trip verification? This will finalize the trip and update stock.")) return;

        setVerifying(true);
        try {
            const returnedItems = Object.entries(returns).map(([productId, qtyReturned]) => ({
                productId,
                qtyReturned
            }));

            await axios.patch(`/api/trips/${params.id}`, {
                status: "VERIFIED",
                returnedItems
            });

            alert("Trip verified successfully!");
            fetchTrip();
        } catch (error: any) {
            alert(error.response?.data?.error || "Verification failed");
        } finally {
            setVerifying(false);
        }
    };

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!trip) return <div className="p-12 text-center text-red-500">Trip not found</div>;

    const isVerified = trip.status === "VERIFIED";

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/trips" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900">Trip Details</h1>
                        <span className={clsx("px-3 py-1 rounded-full text-xs font-bold uppercase", {
                            "bg-amber-100 text-amber-700": trip.status === "LOADED",
                            "bg-teal-100 text-teal-700": trip.status === "VERIFIED",
                        })}>
                            {trip.status === "LOADED" ? "IN TRANSIT" : trip.status}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">ID: {trip.id}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-4">
                        <div className="bg-ruby-50 p-3 rounded-full text-ruby-700">
                            <Truck className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">{trip.vehicle?.number || "Unknown Vehicle"}</h3>
                            <p className="text-sm text-gray-500">{trip.vehicle?.driverName}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500">Start Time</div>
                        <div className="font-medium text-gray-900">{new Date(trip.startTime).toLocaleString()}</div>
                    </div>
                </div>

                <div className="p-6">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <PackageCheck className="w-5 h-5 text-gray-500" />
                        Manifest & Verification
                    </h3>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
                                <tr>
                                    <th className="px-4 py-3">Product</th>
                                    <th className="px-4 py-3 text-right">Loaded Qty</th>
                                    <th className="px-4 py-3 text-right text-emerald-600">Sold (Calc)</th>
                                    <th className="px-4 py-3 text-right text-amber-600 w-32">Returned Qty</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {Array.isArray(trip.loadedItems) && trip.loadedItems.map((item: any) => {
                                    const returned = returns[item.productId] || 0;
                                    const loaded = item.qtyLoaded;
                                    const sold = loaded - returned;

                                    return (
                                        <tr key={item.productId}>
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                {item.product?.name || "Unknown Product"}
                                                <div className="text-xs text-gray-400">{item.product?.pack} {item.product?.flavour}</div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">{loaded}</td>
                                            <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                                {sold}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {isVerified ? (
                                                    <span className="font-bold text-amber-600">{item.qtyReturned}</span>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={loaded}
                                                        value={returns[item.productId] || 0}
                                                        onChange={(e) => handleReturnChange(item.productId, e.target.value)}
                                                        className="w-20 px-2 py-1 text-right border rounded focus:ring-2 focus:ring-ruby-500 outline-none"
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {!isVerified && (
                    <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                        <button
                            onClick={handleVerify}
                            disabled={verifying}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
                        >
                            {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                            Verify & Complete Trip
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
