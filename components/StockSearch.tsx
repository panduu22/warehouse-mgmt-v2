"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useEffect } from "react";

export default function StockSearch() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const query = searchParams.get("q") || "";
    const [text, setText] = useState(query);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setText(query);
    }, [query]);

    const handleSearch = (value: string) => {
        setText(value);
        startTransition(() => {
            const params = new URLSearchParams(searchParams);
            if (value) {
                params.set("q", value);
            } else {
                params.delete("q");
            }
            router.push(`?${params.toString()}`);
        });
    };

    return (
        <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
                type="text"
                value={text}
                onChange={(e) => handleSearch(e.target.value)}
                className="block w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ruby-500 focus:border-transparent sm:text-sm transition-all shadow-sm"
                placeholder="Search products by name, flavour, or pack..."
            />
            {text && (
                <button
                    onClick={() => handleSearch("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-ruby-600 transition-colors"
                >
                    <X className="h-4 w-4 text-gray-400" />
                </button>
            )}
        </div>
    );
}
