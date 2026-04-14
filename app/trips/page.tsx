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
        <div className="max-w-[1200px] mx-auto animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/50 backdrop-blur-sm p-4 md:p-6 rounded-2xl border shadow-sm mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Trips & Verification</h1>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Manage loaded vehicles and verify returns
                    </p>
                </div>
                <Link
                    href="/trips/new"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all hover:scale-105 active:scale-95"
                >
                    New Trip
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
            ) : trips.length === 0 ? (
                <div className="text-center p-12 bg-card rounded-xl border border-dashed border-border">
                    <p className="text-muted-foreground">No trips found.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {// eslint-disable-next-line @typescript-eslint/no-explicit-any
                        trips.map((trip: any) => (
                            <Link
                                href={`/trips/${trip._id}`}
                                key={trip._id}
                                className="block bg-card p-4 sm:p-6 rounded-xl shadow-sm border border-border/50 hover:border-primary/50 transition-all hover:shadow-md group"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={clsx("p-3 rounded-xl transition-colors", {
                                            "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20": trip.status === "LOADED",
                                            "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20": trip.status === "VERIFIED",
                                            "bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20": trip.status === "RETURNED"
                                        })}>
                                            {trip.status === "VERIFIED" ? <CheckCircle className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-foreground group-hover:text-primary transition-colors text-lg">
                                                {trip.vehicleId?.number || "Unknown Vehicle"}
                                            </h3>
                                            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1 font-medium">
                                                <span>
                                                    {trip.status === "VERIFIED" && trip.endTime
                                                        ? `Verified: ${new Date(trip.endTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`
                                                        : `Started: ${new Date(trip.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`
                                                    }
                                                </span>
                                                <span className="w-1 h-1 bg-border rounded-full hidden sm:block"></span>
                                                <span className="hidden sm:block text-foreground">{trip.loadedItems.length} items loaded</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
                                        <p className="text-sm sm:hidden text-muted-foreground font-medium">{trip.loadedItems.length} items</p>
                                        <div className="text-right flex items-center gap-3">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Status</p>
                                                <p className={clsx("font-bold text-xs px-2.5 py-1 rounded-md inline-block", {
                                                    "bg-amber-500/10 text-amber-600 border border-amber-500/20": trip.status === "LOADED",
                                                    "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20": trip.status === "VERIFIED",
                                                })}>
                                                    {trip.status === "LOADED" ? "IN TRANSIT" : trip.status}
                                                </p>
                                            </div>
                                            {trip.status === "LOADED" && <AlertCircle className="text-amber-500 w-5 h-5 animate-pulse" />}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                </div>
            )}
        </div>
    );
}
