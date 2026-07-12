"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useWarehouse } from '@/components/WarehouseContext';
import clsx from 'clsx';
import { Save, Printer } from 'lucide-react';

interface AmountPaidCardProps {
  onTotalChange?: (total: number | null) => void;
  onPrint?: (title: string, from: string, to: string, breakdown: { date: string; amount: number }[], total: number) => void;
}

export const AmountPaidCard: React.FC<AmountPaidCardProps> = ({ onTotalChange, onPrint }) => {
  const { activeWarehouse } = useWarehouse();

  const today = () => new Date().toISOString().split('T')[0];
  const [from, setFrom] = useState<string>(today());
  const [to, setTo]   = useState<string>(today());
  const [total,   setTotal]   = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<{ date: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string>('');

  // Manual entry state
  const [entryDate, setEntryDate] = useState<string>(today());
  const [entryAmount, setEntryAmount] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const fetchTotal = useCallback(() => {
    if (!from || !to || !activeWarehouse?.id) return;
    setLoading(true);
    setError('');
    const url = `/api/analytics/daily-payment?warehouseId=${encodeURIComponent(activeWarehouse.id)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) return res.json().then((d) => { throw new Error(d?.error || `HTTP ${res.status}`); });
        return res.json();
      })
      .then((data) => {
        const val = data.totalAmountPaid ?? 0;
        setTotal(val);
        setBreakdown(data.breakdown || []);
        onTotalChange?.(val);
      })
      .catch((e: Error) => { console.error(e); setError('Failed to load. ' + e.message); })
      .finally(() => setLoading(false));
  }, [from, to, activeWarehouse?.id, onTotalChange]);

  useEffect(() => { fetchTotal(); }, [fetchTotal]);

  const handleSave = async () => {
    if (!activeWarehouse?.id || !entryDate || !entryAmount) return;
    setSaving(true);
    try {
      const res = await fetch('/api/analytics/daily-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId: activeWarehouse.id,
          date: entryDate,
          amount: Number(entryAmount)
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      // Clear input and refresh total
      setEntryAmount('');
      fetchTotal();
    } catch (e: any) {
      alert(e.message || 'Error saving payment');
    } finally {
      setSaving(false);
    }
  };

  const formatted =
    total === null
      ? '—'
      : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(total);

  return (
    <div className="bg-card rounded-2xl shadow-erp-card border border-border p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground uppercase tracking-wide">Total Amount Paid</h2>
        {onPrint && total !== null && (
          <button
            onClick={() => onPrint('Total Amount Paid', from, to, breakdown, total)}
            className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="Print Total Amount Paid"
          >
            <Printer className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-border pb-4">
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

      <div className={clsx('text-3xl font-black mb-2', loading ? 'text-muted-foreground' : 'text-primary')}>
        {loading ? 'Loading…' : error ? <span className="text-destructive text-sm font-semibold">{error}</span> : formatted}
      </div>

      <div className="mt-auto bg-muted/50 p-4 rounded-xl border border-border/50">
        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Add Manual Entry</label>
        <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₹</span>
                <input
                type="number"
                min="0"
                step="any"
                placeholder="Amount"
                value={entryAmount}
                onChange={(e) => setEntryAmount(e.target.value)}
                className="w-full rounded-lg border border-border bg-white pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !entryAmount}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save</>}
            </button>
        </div>
      </div>
    </div>
  );
};
