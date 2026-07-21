"use client";

import React, { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

interface DrillDownModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    /** Sticky footer total section */
    footerLabel: string;
    footerValue: string;
    children: React.ReactNode;
    /** Extra controls (search, sort, etc.) rendered in the header area */
    controls?: React.ReactNode;
    /** Pagination controls rendered just above the footer */
    pagination?: React.ReactNode;
}

export function DrillDownModal({
    open,
    onClose,
    title,
    subtitle,
    footerLabel,
    footerValue,
    children,
    controls,
    pagination,
}: DrillDownModalProps) {
    // Close on ESC
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
        [onClose]
    );

    useEffect(() => {
        if (open) {
            document.addEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [open, handleKeyDown]);

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal Panel */}
                    <motion.div
                        key="panel"
                        initial={{ opacity: 0, y: 40, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.97 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className={clsx(
                            "fixed z-50 inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
                            "w-full sm:w-[95vw] sm:max-w-5xl",
                            "max-h-[90dvh] sm:max-h-[88vh]",
                            "bg-card border border-border shadow-2xl rounded-t-2xl sm:rounded-2xl",
                            "flex flex-col overflow-hidden"
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Sticky Header */}
                        <div className="flex-shrink-0 flex items-start justify-between gap-4 px-5 pt-5 pb-3 border-b border-border">
                            <div>
                                <h2 className="text-lg font-bold text-foreground tracking-tight">{title}</h2>
                                {subtitle && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="flex-shrink-0 p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Controls bar (search, sort, export) */}
                        {controls && (
                            <div className="flex-shrink-0 px-5 py-3 border-b border-border/60 bg-muted/30">
                                {controls}
                            </div>
                        )}

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto min-h-0">
                            {children}
                        </div>

                        {/* Pagination */}
                        {pagination && (
                            <div className="flex-shrink-0 px-5 py-2.5 border-t border-border/60 bg-muted/20">
                                {pagination}
                            </div>
                        )}

                        {/* Sticky Footer Total */}
                        <div className="flex-shrink-0 px-5 py-4 border-t-2 border-border bg-muted/40">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    {footerLabel}
                                </span>
                                <span className="text-2xl font-black text-foreground tracking-tight">
                                    {footerValue}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
