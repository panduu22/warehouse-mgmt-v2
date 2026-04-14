"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWarehouse } from "@/components/WarehouseContext";
import { toast } from "sonner";
import { Loader2, Plus, Building2 } from "lucide-react";

export function CreateWarehouseDialog({ 
  children, 
  onSuccess,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}: { 
  children?: React.ReactNode, 
  onSuccess?: () => void,
  open?: boolean,
  onOpenChange?: (open: boolean) => void
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen ?? internalOpen;
    const setOpen = controlledOnOpenChange ?? setInternalOpen;

    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const { switchWarehouse } = useWarehouse();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return toast.error("Warehouse name is required");

        setLoading(true);
        try {
            const res = await fetch("/api/warehouses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, address })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create warehouse");
            }

            const newWarehouse = await res.json();
            toast.success(`Warehouse "${newWarehouse.name}" created successfully!`);
            
            // Per requirement: automatically select the new warehouse
            await switchWarehouse(newWarehouse._id);
            
            setName("");
            setAddress("");
            setOpen(false);
            if (onSuccess) onSuccess();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    children || (
                        <Button variant="outline" size="sm" className="gap-2">
                            <Plus className="w-4 h-4" />
                            New Warehouse
                        </Button>
                    )
                }
            />
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        Create Storage Unit
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                            Warehouse Name
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. North Zone Depot"
                            className="h-12 rounded-xl"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address" className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                            Physical Address (Optional)
                        </Label>
                        <Input
                            id="address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="123 Logistics Way..."
                            className="h-12 rounded-xl"
                        />
                    </div>
                    <DialogFooter>
                        <Button 
                            type="submit" 
                            disabled={loading || !name} 
                            className="w-full h-12 rounded-xl font-black text-lg transition-all active:scale-95 shadow-lg shadow-primary/20"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Plus className="w-5 h-5 mr-2" />
                                    Create & Provision
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
                <p className="text-center text-[10px] text-amber-500 font-black uppercase tracking-widest bg-amber-500/5 py-2 rounded-full border border-amber-500/10">
                    Will initialize with core product catalog synced
                </p>
            </DialogContent>
        </Dialog>
    );
}
