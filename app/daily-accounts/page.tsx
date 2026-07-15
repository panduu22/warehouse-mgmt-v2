"use client";

import React, { useState, useCallback } from 'react';
import { BarChart3 } from 'lucide-react';
import { DailyAccountsCard } from '@/components/DailyAccountsCard';
import { AmountPaidCard } from '@/components/AmountPaidCard';
import { useWarehouse } from '@/components/WarehouseContext';
import clsx from 'clsx';

type PrintReport = {
  title: string;
  from: string;
  to: string;
  breakdown: { date: string; amount: number }[];
  total: number;
};

export default function DailyAccountsPage() {
  const { activeWarehouse } = useWarehouse();

  // Track totals from the cards to calculate balance
  const [restockTotal, setRestockTotal] = useState(0);
  const [schemeTotal, setSchemeTotal] = useState(0);
  const [paidTotal, setPaidTotal] = useState(0);

  // Print state
  const [activePrintReport, setActivePrintReport] = useState<PrintReport | null>(null);

  const handlePrint = useCallback((title: string, from: string, to: string, breakdown: { date: string; amount: number }[], total: number) => {
    setActivePrintReport({ title, from, to, breakdown, total });
  }, []);

  React.useEffect(() => {
    if (activePrintReport) {
      const timer = setTimeout(() => {
        window.print();
        setActivePrintReport(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activePrintReport]);

  const handleRestockChange = useCallback((v: number | null) => setRestockTotal(v || 0), []);
  const handleSchemeChange = useCallback((v: number | null) => setSchemeTotal(v || 0), []);
  const handlePaidChange = useCallback((v: number | null) => setPaidTotal(v || 0), []);

  // Balance = Total Scheme Value + Total Amount Paid - Total Restocking Price
  const balance = schemeTotal + paidTotal - restockTotal;

  // Color rules for balance
  const balanceColor =
    balance > 0
      ? 'text-green-600'
      : balance < 0
      ? 'text-red-600'
      : 'text-primary';

  const formattedBalance = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(balance);

  if (activePrintReport) {
    return (
      <div className="p-8 bg-white min-h-screen text-black">
        <h1 className="text-3xl font-bold text-center mb-2">{activeWarehouse?.name}</h1>
        <h2 className="text-xl font-bold text-center mb-6 uppercase tracking-wider">{activePrintReport.title}</h2>
        <p className="text-center mb-8 font-medium">
          From: {new Date(activePrintReport.from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} — To: {new Date(activePrintReport.to).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>

        <div className="max-w-3xl mx-auto">
          {activePrintReport.breakdown.length === 0 ? (
            <p className="text-center italic text-gray-500">No data available in this date range.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="py-2 text-left font-bold uppercase tracking-wider text-sm">Date</th>
                  <th className="py-2 text-right font-bold uppercase tracking-wider text-sm">Amount</th>
                </tr>
              </thead>
              <tbody>
                {activePrintReport.breakdown.map((item, i) => (
                  <tr key={i} className="border-b border-gray-300">
                    <td className="py-3">
                      {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </td>
                    <td className="py-3 text-right font-medium">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black font-bold text-lg">
                  <td className="py-4 uppercase tracking-wider">Total</td>
                  <td className="py-4 text-right">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(activePrintReport.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Financial summary for{' '}
            <span className="font-semibold text-primary">
              {activeWarehouse?.name || 'your warehouse'}
            </span>
          </p>
        </div>
      </div>

      {!activeWarehouse ? (
        <div className="text-center py-20 text-muted-foreground text-sm">
          Please select a warehouse to view Daily Accounts.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-6">
            <DailyAccountsCard
              title="Total Restocking Price"
              apiPath="/api/analytics/daily-restocking"
              responseKey="totalRestockingPrice"
              onTotalChange={handleRestockChange}
              onPrint={handlePrint}
              colorClass="text-primary"
            />
            <AmountPaidCard onTotalChange={handlePaidChange} onPrint={handlePrint} />
          </div>
          <div className="flex flex-col gap-6">
            <DailyAccountsCard
              title="Total Scheme Value"
              apiPath="/api/analytics/daily-scheme"
              responseKey="totalSchemeValue"
              onTotalChange={handleSchemeChange}
              onPrint={handlePrint}
              colorClass="text-purple-600"
            />
            
            {/* Automatic Balance Card */}
            <div className="bg-card rounded-2xl shadow-erp-card border border-border p-6 flex flex-col gap-4">
              <h2 className="text-base font-bold text-foreground uppercase tracking-wide">Balance</h2>
              <div className="text-xs font-medium text-muted-foreground">
                Total Scheme Value + Total Amount Paid – Total Restocking Price
              </div>
              <div className={clsx('mt-2 text-4xl font-black tracking-tight', balanceColor)}>
                {formattedBalance}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
