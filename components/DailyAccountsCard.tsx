"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useWarehouse } from '@/components/WarehouseContext';
import clsx from 'clsx';
import { Printer } from 'lucide-react';

interface DailyAccountsCardProps {
  title: string;
  /** API endpoint – warehouseId, from, to will be appended as query params */
  apiPath: string;
  /** Key in the JSON response to read, e.g. "totalRestockingPrice" */
  responseKey: string;
  onTotalChange?: (total: number | null) => void;
  onPrint?: (title: string, from: string, to: string, breakdown: { date: string; amount: number }[], total: number) => void;
  colorClass?: string;
}

export const DailyAccountsCard: React.FC<DailyAccountsCardProps> = ({
  title,
  apiPath,
  responseKey,
  onTotalChange,
  onPrint,
  colorClass = 'text-primary',
}) => {
  const { activeWarehouse } = useWarehouse();

  const today = () => new Date().toISOString().split('T')[0];
  const [from, setFrom] = useState<string>(today());
  const [to, setTo]   = useState<string>(today());
  const [total,   setTotal]   = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<{ date: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string>('');

  const fetchTotal = useCallback(() => {
    if (!from || !to || !activeWarehouse?.id) return;
    setLoading(true);
    setError('');
    const url = `${apiPath}?warehouseId=${encodeURIComponent(activeWarehouse.id)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) return res.json().then((d) => { throw new Error(d?.error || `HTTP ${res.status}`); });
        return res.json();
      })
      .then((data) => {
        const val = data[responseKey] ?? 0;
        setTotal(val);
        setBreakdown(data.breakdown || []);
        onTotalChange?.(val);
      })
      .catch((e: Error) => { console.error(e); setError('Failed to load. ' + e.message); })
      .finally(() => setLoading(false));
  }, [from, to, activeWarehouse?.id, apiPath, responseKey, onTotalChange]);

  useEffect(() => { fetchTotal(); }, [fetchTotal]);

  const formatted =
    total === null
      ? '—'
      : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(total);

  return (
    <div className="bg-card rounded-2xl shadow-erp-card border border-border p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground uppercase tracking-wide">{title}</h2>
        {onPrint && total !== null && (
          <button
            onClick={() => onPrint(title, from, to, breakdown, total)}
            className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title={`Print ${title}`}
          >
            <Printer className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">From</label>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">To</label>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className={clsx('mt-2 text-3xl font-black', loading ? 'text-muted-foreground' : colorClass)}>
        {loading ? 'Loading…' : error ? <span className="text-destructive text-sm font-semibold">{error}</span> : formatted}
      </div>
    </div>
  );
};
