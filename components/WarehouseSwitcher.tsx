"use client";

import { useState, useEffect } from "react";
import { 
  Building2, 
  ChevronDown, 
  Loader2, 
  Plus, 
  Trash2, 
  LogOut,
  Check,
  ArrowLeftRight,
  ShieldAlert
} from "lucide-react";
import { useWarehouse } from "./WarehouseContext";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CreateWarehouseDialog } from "./CreateWarehouseDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function WarehouseSwitcher() {
    const { activeWarehouse, switchWarehouse, loading: ctxLoading } = useWarehouse();
    const { data: session } = useSession();
    const user = session?.user as any;
    const userRole = user?.role;
    
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (open) {
            setLoading(true);
            fetch("/api/warehouses")
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setWarehouses(data);
                    }
                    setLoading(false);
                })
                .catch(() => {
                    toast.error("Failed to load warehouses");
                    setLoading(false);
                });
        }
    }, [open]);

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    const handleSwitch = async (id: string, name: string) => {
        if (id === activeWarehouse?.id) return;
        setOpen(false); 
        const success = await switchWarehouse(id);
        if (success) {
            toast.success(`Switched to ${name}`);
        } else {
            toast.error(`Failed to switch to ${name}`);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return;
        
        try {
            const res = await fetch(`/api/warehouses?id=${id}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to delete");
            }
            toast.success(`Warehouse "${name}" deleted`);
            setWarehouses(warehouses.filter(w => w._id !== id));
            if (activeWarehouse?.id === id) {
                localStorage.removeItem("activeWarehouse");
                window.location.reload();
            }
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    return (
        <>
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger
                    render={
                        <button 
                            className="w-[240px] h-12 flex items-center gap-3 px-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm hover:bg-muted/50 transition-all shrink-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            {ctxLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            ) : (
                                <Building2 className="w-5 h-5 text-primary" />
                            )}
                            <div className="flex flex-col items-start min-w-0 flex-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">
                                    Storage Unit
                                </span>
                                <span className="text-sm font-bold truncate text-foreground">
                                    {activeWarehouse?.name || "Select Unit"}
                                </span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </button>
                    }
                />
                
                <DropdownMenuContent className="w-[280px] p-2 rounded-2xl shadow-2xl border-border bg-popover/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 z-50" align="end" sideOffset={8}>
                    <DropdownMenuGroup>
                        <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                            Available Units
                            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                        </DropdownMenuLabel>
                        
                        <div className="space-y-1 my-1 max-h-[300px] overflow-y-auto pr-1">
                            {warehouses.length === 0 && !loading ? (
                                <div className="px-3 py-4 text-center text-muted-foreground">
                                    <ShieldAlert className="w-8 h-8 opacity-20 mx-auto mb-2" />
                                    <p className="text-xs font-bold">No units available</p>
                                </div>
                            ) : (
                                warehouses.map((w) => (
                                    <DropdownMenuItem 
                                        key={w._id}
                                        onClick={() => handleSwitch(w._id, w.name)}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all active:scale-[0.98] outline-none",
                                            activeWarehouse?.id === w._id ? "bg-primary/10 text-primary hover:bg-primary/15" : "hover:bg-muted"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                            activeWarehouse?.id === w._id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"
                                        )}>
                                            <Building2 className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold truncate">{w.name}</p>
                                            {w.isMain && (
                                                <p className="text-[8px] font-black uppercase tracking-tighter text-ruby-600">Global Hub</p>
                                            )}
                                        </div>
                                        {activeWarehouse?.id === w._id && (
                                            <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center">
                                                <Check className="w-3 h-3 text-primary" />
                                            </div>
                                        )}
                                        {userRole === "ADMIN" && !w.isMain && (
                                            <div
                                                role="button"
                                                className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors ml-1"
                                                onClick={(e) => handleDelete(e, w._id, w.name)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </div>
                                        )}
                                    </DropdownMenuItem>
                                ))
                            )}
                        </div>
                    </DropdownMenuGroup>

                    {userRole === "ADMIN" && (
                        <>
                            <DropdownMenuSeparator className="my-2 bg-border/50" />
                            <DropdownMenuItem 
                                onSelect={() => setIsCreateDialogOpen(true)}
                                className="flex items-center gap-3 p-3 rounded-xl text-primary font-bold text-sm bg-primary/5 hover:bg-primary/10 transition-all group active:scale-95 cursor-pointer outline-none"
                            >
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <Plus className="w-4 h-4" />
                                </div>
                                Add New Unit
                            </DropdownMenuItem>
                        </>
                    )}

                    {userRole === "STAFF" && (
                        <>
                            <DropdownMenuSeparator className="my-2 bg-border/50" />
                            <Link href="/" className="w-full flex items-center gap-3 p-3 rounded-xl text-muted-foreground hover:text-foreground font-bold text-sm hover:bg-muted transition-all group active:scale-95">
                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                    <ArrowLeftRight className="w-4 h-4" />
                                </div>
                                Request Access
                            </Link>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Render Dialog outside Dropdown to fix focus/typing issues */}
            <CreateWarehouseDialog 
                open={isCreateDialogOpen} 
                onOpenChange={setIsCreateDialogOpen}
                onSuccess={() => {
                    setIsCreateDialogOpen(false);
                    setOpen(false);
                }}
            />
        </>
    );
}


