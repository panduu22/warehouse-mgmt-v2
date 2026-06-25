"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import { isoDateIST } from "@/lib/dateUtils";

export default function DashboardDateFilter() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initialize with empty string to avoid SSR/hydration mismatch.
    // The real IST date is computed on the client inside useEffect so it
    // always reflects the user's current IST date — never a stale server value.
    const [date, setDate] = useState<string>("");

    useEffect(() => {
        // On the client, compute the correct IST date.
        // If the URL already has a ?date= param, respect it; otherwise default to today IST.
        const paramDate = searchParams.get("date");
        setDate(paramDate || isoDateIST());
    }, [searchParams]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        setDate(newDate);
        if (newDate) {
            router.push(`/dashboard?date=${newDate}`);
        } else {
            router.push("/dashboard");
        }
    };

    return (
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm hover:border-ruby-200 transition-colors">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-500 hidden sm:inline">View Date:</span>
            <input
                type="date"
                value={date}
                onChange={handleDateChange}
                className="text-sm font-bold text-gray-900 bg-transparent border-none focus:ring-0 p-0 cursor-pointer"
            />
        </div>
    );
}
