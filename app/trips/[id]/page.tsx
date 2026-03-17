"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Package } from "lucide-react";

export default function VerifyTripPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [trip, setTrip] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [inputs, setInputs] = useState<Record<string, number>>({});
    const [verifyDate, setVerifyDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetch("/api/trips")
            .then(res => res.json())
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then((data: any[]) => {
                const found = data.find(t => t._id === id);
                if (found) {
                    setTrip(found);
                    // Init inputs
                    const initial: Record<string, number> = {};
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    found.loadedItems.forEach((item: any) => {
                        initial[item.productId._id] = 0; // Default 0 returned
                    });
                    setInputs(initial);
                }
                setLoading(false);
            });
    }, [id]);

    const handleVerify = async () => {
        if (!confirm("Confirm and close this trip? This action cannot be undone.")) return;
        setVerifying(true);

        const returnedItems = Object.entries(inputs).map(([productId, qtyReturned]) => ({
            productId,
            qtyReturned
        }));

        try {
            const res = await fetch(`/api/trips/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "VERIFIED",
                    returnedItems,
                    verifiedAt: verifyDate
                })
            });

            if (res.ok) {
                router.push("/trips");
                router.refresh();
            } else {
                const json = await res.json();
                alert(json.error);
            }
        } catch (e) {
            alert("Error verifying trip");
        } finally {
            setVerifying(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-gray-500">Loading trip details...</div>;
    if (!trip) return <div className="p-12 text-center text-red-500">Trip not found</div>;

    const isVerified = trip.status === "VERIFIED";

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/trips" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        Trip Verification
                        {isVerified && <span className="bg-teal-100 text-teal-800 text-xs px-2 py-1 rounded-full">VERIFIED</span>}
                    </h1>
                    <p className="text-gray-500 text-sm">Vehicle: {trip.vehicleId?.number}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h2 className="font-bold text-gray-700">Loaded Cargo</h2>
                </div>

                <div className="divide-y divide-gray-100">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {trip.loadedItems.map((item: any) => (
                        <div key={item.productId._id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-ruby-50 p-3 rounded-lg text-ruby-700">
                                    <Package className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">{item.productId.name}</p>
                                    <div className="flex gap-4 text-sm text-gray-500 mt-1">
                                        <span>Loaded: <strong className="text-gray-900">{item.qtyLoaded}</strong></span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 md:gap-8 justify-between md:justify-end bg-gray-50 md:bg-transparent p-4 md:p-0 rounded-lg">
                                {isVerified ? (
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 uppercase font-bold">Returned</p>
                                        <p className="font-bold text-gray-900">{item.qtyReturned}</p>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm font-bold text-gray-700">Returns:</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max={item.qtyLoaded}
                                            value={inputs[item.productId._id] ?? 0}
                                            onChange={(e) => setInputs({ ...inputs, [item.productId._id]: Number(e.target.value) })}
                                            className="w-24 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-ruby-500 text-gray-900 font-bold text-center bg-white shadow-inner"
                                        />
                                    </div>
                                )}

                                <div className="text-right min-w-[80px]">
                                    <p className="text-xs text-gray-500 uppercase font-bold">Sold</p>
                                    <p className="font-bold text-teal-600 text-xl">
                                        {isVerified
                                            ? item.qtyLoaded - (item.qtyReturned || 0)
                                            : item.qtyLoaded - (inputs[item.productId._id] || 0)
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {!isVerified && (
                    <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row items-end md:items-center justify-end gap-4">
                        <div className="flex flex-col gap-1 w-full md:w-auto">
                            <label className="text-sm font-medium text-gray-600">Return Date</label>
                            <input
                                type="date"
                                value={verifyDate}
                                onChange={(e) => setVerifyDate(e.target.value)}
                                className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-ruby-500 text-gray-900 bg-white"
                            />
                        </div>
                        <button
                            onClick={handleVerify}
                            disabled={verifying}
                            className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white px-8 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-50 h-[42px]"
                        >
                            <CheckCircle className="w-5 h-5" />
                            Verify & Close Trip
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
