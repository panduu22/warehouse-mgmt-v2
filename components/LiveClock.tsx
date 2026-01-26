"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function LiveClock() {
    const [time, setTime] = useState<string | null>(null);

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            const formatted = now.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
            });
            setTime(formatted);
        };

        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!time) return null; // Avoid hydration mismatch

    return (
        <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
            <Clock className="w-4 h-4 text-ruby-600 animate-pulse" />
            <span className="text-sm font-bold text-gray-700 font-mono tabular-nums uppercase">
                {time}
            </span>
        </div>
    );
}
