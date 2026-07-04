"use client";

import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, startOfDay, endOfDay } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown, Check, RefreshCw, X } from "lucide-react";
import clsx from "clsx";

export type DateRange = {
    start: Date;
    end: Date;
    label: string;
};

interface DashboardDateFilterAdvancedProps {
    dateRange: DateRange;
    setDateRange: (range: DateRange) => void;
    compareEnabled: boolean;
    setCompareEnabled: (enabled: boolean) => void;
    onRefresh: () => void;
    isRefreshing: boolean;
    lastUpdated: Date;
}

export function DashboardDateFilterAdvanced({
    dateRange,
    setDateRange,
    compareEnabled,
    setCompareEnabled,
    onRefresh,
    isRefreshing,
    lastUpdated
}: DashboardDateFilterAdvancedProps) {
    const [isOpen, setIsOpen] = useState(false);
    
    // We use Local dates to avoid timezone shift on date inputs
    const [customStart, setCustomStart] = useState<string>(format(dateRange.start, "yyyy-MM-dd"));
    const [customEnd, setCustomEnd] = useState<string>(format(dateRange.end, "yyyy-MM-dd"));

    const presets: DateRange[] = [
        { label: "Today", start: startOfDay(new Date()), end: endOfDay(new Date()) },
        { label: "Yesterday", start: startOfDay(subDays(new Date(), 1)), end: endOfDay(subDays(new Date(), 1)) },
        { label: "Last 7 Days", start: startOfDay(subDays(new Date(), 6)), end: endOfDay(new Date()) },
        { label: "Last 30 Days", start: startOfDay(subDays(new Date(), 29)), end: endOfDay(new Date()) },
        { label: "This Month", start: startOfMonth(new Date()), end: endOfMonth(new Date()) },
        { label: "Last Month", start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) },
        { label: "This Year", start: startOfYear(new Date()), end: endOfYear(new Date()) },
    ];

    const handlePresetSelect = (preset: DateRange) => {
        setDateRange(preset);
        setCustomStart(format(preset.start, "yyyy-MM-dd"));
        setCustomEnd(format(preset.end, "yyyy-MM-dd"));
        setIsOpen(false);
    };

    const handleCustomApply = (e: React.FormEvent) => {
        e.preventDefault();
        if (customStart && customEnd) {
            // Set boundary times correctly
            const start = new Date(customStart);
            start.setHours(0, 0, 0, 0);
            const end = new Date(customEnd);
            end.setHours(23, 59, 59, 999);
            
            setDateRange({
                start,
                end,
                label: "Custom Range"
            });
            setIsOpen(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-[280px]">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full h-10 px-4 py-2 bg-card hover:bg-muted/50 border border-border rounded-xl text-left font-semibold text-sm flex items-center justify-between shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                    <span className="flex items-center gap-2 text-foreground">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        {dateRange.label === "Custom Range" ? (
                            <span>
                                {format(dateRange.start, "dd MMM yy")} - {format(dateRange.end, "dd MMM yy")}
                            </span>
                        ) : (
                            <span>{dateRange.label}</span>
                        )}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </button>

                {isOpen && (
                    <div className="absolute top-12 left-0 z-50 w-[320px] sm:w-[480px] bg-card border border-border rounded-2xl shadow-xl flex flex-col sm:flex-row overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Presets Column */}
                        <div className="border-b sm:border-b-0 sm:border-r border-border p-3 space-y-1 w-full sm:w-[160px] bg-muted/20">
                            <div className="text-[10px] font-black uppercase text-muted-foreground mb-2 px-2 tracking-widest">Presets</div>
                            {presets.map((preset) => (
                                <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => handlePresetSelect(preset)}
                                    className={clsx(
                                        "w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition-colors",
                                        dateRange.label === preset.label 
                                            ? "bg-primary/10 text-primary" 
                                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {preset.label}
                                    {dateRange.label === preset.label && <Check className="h-3.5 w-3.5" />}
                                </button>
                            ))}
                        </div>

                        {/* Custom Date Form Column */}
                        <form onSubmit={handleCustomApply} className="p-4 flex-1 flex flex-col justify-between">
                            <div className="space-y-4">
                                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Custom Date Range</div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase">Start Date</label>
                                        <input
                                            type="date"
                                            value={customStart}
                                            onChange={(e) => setCustomStart(e.target.value)}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-semibold focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase">End Date</label>
                                        <input
                                            type="date"
                                            value={customEnd}
                                            onChange={(e) => setCustomEnd(e.target.value)}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-semibold focus:outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-muted text-muted-foreground"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm"
                                >
                                    Apply Range
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Compare Toggle & Refresh */}
            <div className="flex items-center gap-4 bg-card border border-border px-4 py-2 rounded-xl h-10 shadow-sm w-full sm:w-auto justify-between sm:justify-start">
                <div className="flex items-center space-x-2.5">
                    <button
                        type="button"
                        onClick={() => setCompareEnabled(!compareEnabled)}
                        className={clsx(
                            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                            compareEnabled ? "bg-primary" : "bg-muted"
                        )}
                    >
                        <span
                            className={clsx(
                                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out",
                                compareEnabled ? "translate-x-4" : "translate-x-0"
                            )}
                        />
                    </button>
                    <span className="text-xs font-bold text-foreground">Compare Mode</span>
                </div>
                
                <div className="w-px h-5 bg-border hidden sm:block"></div>
                
                <div className="flex items-center gap-2">
                    <button 
                        type="button"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={clsx("h-3.5 w-3.5", isRefreshing && "animate-spin text-primary")} />
                    </button>
                    <span suppressHydrationWarning className="text-[9px] font-black text-muted-foreground uppercase tracking-widest hidden sm:inline">
                        {isRefreshing ? "Updating..." : `Updated ${format(lastUpdated, "HH:mm:ss")}`}
                    </span>
                </div>
            </div>
        </div>
    );
}
