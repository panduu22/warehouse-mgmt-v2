"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Truck, CheckCircle, MapPin, AlertCircle } from "lucide-react";
import clsx from "clsx";

export default function TripsPage() {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/trips")
            .then((res) => res.json())
            .then((data) => {
                setTrips(data);
                setLoading(false);
            });
    }, []);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Trips & Verification</h1>
                <Link
                    href="/trips/new"
                    className="bg-ruby-700 hover:bg-ruby-800 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                >
                    New Trip
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-ruby-700 w-8 h-8" /></div>
            ) : trips.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500">No trips found.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {// eslint-disable-next-line @typescript-eslint/no-explicit-any
                        trips.map((trip: any) => (
                            <Link
                                href={`/trips/${trip._id}`}
                                key={trip._id}
                                className="block bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-ruby-200 transition-all hover:shadow-md group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={clsx("p-3 rounded-full", {
                                            "bg-amber-100 text-amber-600": trip.status === "LOADED",
                                            "bg-teal-100 text-teal-600": trip.status === "VERIFIED",
                                            "bg-blue-100 text-blue-600": trip.status === "RETURNED"
                                        })}>
                                            {trip.status === "VERIFIED" ? <CheckCircle className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 group-hover:text-ruby-700 transition-colors">
                                                {trip.vehicleId?.number || "Unknown Vehicle"}
                                            </h3>
                                            <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                                <span>
                                                    {trip.status === "VERIFIED" && trip.endTime
                                                        ? `Verified: ${new Date(trip.endTime).toLocaleDateString()}`
                                                        : `Started: ${new Date(trip.startTime).toLocaleDateString()}`
                                                    }
                                                </span>
                                                <span>•</span>
                                                <span>{trip.loadedItems.length} items loaded</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-xs uppercase font-bold text-gray-400 tracking-wider">Status</p>
                                            <p className={clsx("font-bold text-sm", {
                                                "text-amber-600": trip.status === "LOADED",
                                                "text-teal-600": trip.status === "VERIFIED",
                                            })}>
                                                {trip.status === "LOADED" ? "IN TRANSIT" : trip.status}
                                            </p>
                                        </div>
                                        {trip.status === "LOADED" && <AlertCircle className="text-amber-500 w-5 h-5 animate-pulse" />}
                                    </div>
                                </div>
                            </Link>
                        ))}
                </div>
            )}
        </div>
    );
}
