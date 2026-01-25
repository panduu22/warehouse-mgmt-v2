"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";

export default function DashboardDateFilter() {
    const router = useRouter();
    const searchParams = useSearchParams();
    // Default to today if no param, or use param
    const initialDate = searchParams.get("date") || new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(initialDate);

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
