"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";

// Mock data to demonstrate chart as real historic data isn't available
const mockWeeklySales = [
    { day: "Mon", value: 1240 },
    { day: "Tue", value: 2150 },
    { day: "Wed", value: 1840 },
    { day: "Thu", value: 3420 },
    { day: "Fri", value: 2890 },
    { day: "Sat", value: 4100 },
    { day: "Sun", value: 1530 },
];

export function DashboardStockChart() {
    return (
        <Card className="border-border/50 shadow-sm col-span-1 md:col-span-2 lg:col-span-3">
            <CardHeader>
                <CardTitle>Sales Overview</CardTitle>
                <CardDescription>Estimated Weekly Volume</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mockWeeklySales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="day" axisLine={false} tickLine={false} className="text-xs" tick={{fill: "hsl(var(--muted-foreground))"}} />
                            <YAxis axisLine={false} tickLine={false} className="text-xs" tick={{fill: "hsl(var(--muted-foreground))"}} width={40} />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: "hsl(var(--background))", 
                                    borderColor: "hsl(var(--border))",
                                    borderRadius: "8px"
                                }}
                            />
                            <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-2 mt-4 text-sm font-medium leading-none">
                    Trending up by 5.2% this week <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
            </CardContent>
        </Card>
    );
}
