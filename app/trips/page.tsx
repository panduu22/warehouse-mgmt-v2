"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Truck, CheckCircle, MapPin, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { formatIST } from "@/lib/dateUtils";
import { useWarehouse } from "@/components/WarehouseContext";

export default function TripsPage() {
    const { activeWarehouse } = useWarehouse();
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

    useEffect(() => {
        setLoading(true);
        fetch("/api/trips")
            .then((res) => res.json())
            .then((data) => {
                setTrips(data || []);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    }, [activeWarehouse?.id]);

    return (
        <div className="max-w-[1200px] mx-auto pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 bg-card border border-border px-6 py-5 rounded-2xl shadow-erp-card mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Trips & Verification</h1>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" /> Manage loaded vehicles and verify returns
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                        className="h-10 px-4 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center gap-2"
                    >
                        Sort: {sortOrder === "desc" ? "Newest First" : "Oldest First"}
                    </button>
                    <Link
                        href="/trips/new"
                        className="h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center"
                    >
                        New Trip
                    </Link>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
            ) : trips.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border shadow-sm flex flex-col items-center gap-3">
                    <Truck className="w-10 h-10 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No trips found.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {// eslint-disable-next-line @typescript-eslint/no-explicit-any
                        [...trips].sort((a: any, b: any) => {
                            const dateA = new Date(a.createdAt).getTime();
                            const dateB = new Date(b.createdAt).getTime();
                            return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
                        }).map((trip: any) => (
                            <Link
                                href={`/trips/${trip._id}`}
                                key={trip._id}
                                className="block bg-card p-5 sm:p-6 rounded-2xl shadow-erp-card border border-border hover:border-primary/40 transition-all duration-200 hover:shadow-erp-hover group"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors", {
                                            "bg-amber-50 text-amber-600 group-hover:bg-amber-100": trip.status === "LOADED",
                                            "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100": trip.status === "VERIFIED",
                                            "bg-blue-50 text-blue-600 group-hover:bg-blue-100": trip.status === "RETURNED"
                                        })}>
                                            {trip.status === "VERIFIED" ? <CheckCircle className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-foreground group-hover:text-primary transition-colors text-lg tracking-tight">
                                                {trip.vehicleId?.number || "Unknown Vehicle"}
                                            </h3>
                                            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                                                <span>
                                                    {trip.status === "VERIFIED" && trip.endTime
                                                        ? `Verified: ${formatIST(trip.endTime)}`
                                                        : `Started: ${formatIST(trip.startTime)}`
                                                    }
                                                </span>
                                                <span className="w-1 h-1 bg-border rounded-full hidden sm:block"></span>
                                                <span className="hidden sm:block font-medium">{trip.loadedItems.length} items loaded</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/60">
                                        <p className="text-sm sm:hidden text-muted-foreground font-medium">{trip.loadedItems.length} items</p>
                                        <div className="text-right flex items-center gap-3">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-widest mb-1">Status</p>
                                                <p className={clsx("badge", {
                                                    "badge-amber": trip.status === "LOADED",
                                                    "badge-green": trip.status === "VERIFIED",
                                                })}>
                                                    {trip.status === "LOADED" ? "IN TRANSIT" : trip.status}
                                                </p>
                                            </div>
                                            {trip.status === "LOADED" && <AlertCircle className="text-amber-500 w-5 h-5 animate-pulse shrink-0" />}
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
