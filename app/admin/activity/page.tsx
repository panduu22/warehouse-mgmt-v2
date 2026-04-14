"use client";

import { useState, useEffect } from "react";
import { 
  History, 
  Package, 
  Truck, 
  Receipt, 
  Edit3,
  Loader2,
  Trash2,
  PlusCircle
} from "lucide-react";
import clsx from "clsx";

export default function AdminActivityPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await fetch("/api/admin/activity");
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATE_PRODUCT": return <PlusCircle className="w-5 h-5 text-emerald-500" />;
      case "EDIT_PRODUCT":   return <Edit3 className="w-5 h-5 text-blue-500" />;
      case "DELETE_PRODUCT": return <Trash2 className="w-5 h-5 text-destructive" />;
      case "LOAD_VEHICLE":   return <Truck className="w-5 h-5 text-amber-500" />;
      case "VERIFY_TRIP":    return <Truck className="w-5 h-5 text-emerald-500" />;
      case "GENERATE_BILL":  return <Receipt className="w-5 h-5 text-primary" />;
      default:               return <History className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getActionBackground = (action: string) => {
    switch (action) {
      case "CREATE_PRODUCT": return "bg-emerald-500/10 border-emerald-500/20";
      case "EDIT_PRODUCT":   return "bg-blue-500/10 border-blue-500/20";
      case "DELETE_PRODUCT": return "bg-destructive/10 border-destructive/20";
      case "LOAD_VEHICLE":   return "bg-amber-500/10 border-amber-500/20";
      case "VERIFY_TRIP":    return "bg-emerald-500/10 border-emerald-500/20";
      case "GENERATE_BILL":  return "bg-primary/10 border-primary/20";
      default:               return "bg-muted border-border";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
          <History className="w-8 h-8 text-primary" />
          System Activity History
        </h1>
        <p className="text-muted-foreground font-medium mt-1">Audit log of all worker actions inside the active warehouse.</p>
      </div>

      <div className="bg-card rounded-[2rem] p-8 shadow-sm border border-border">
        {activities.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <History className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No Recent Activity</h3>
            <p className="text-muted-foreground font-medium">System generated logs will appear here when staff take action.</p>
          </div>
        ) : (
          <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/50 before:to-transparent">
            {activities.map((activity, index) => (
              <div key={activity._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-8">
                {/* Timeline Marker */}
                <div className={clsx(
                  "flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shrink-0 shadow-sm z-10 md:order-1",
                  getActionBackground(activity.action).split(" ")[0], // Use the bg color
                  "text-muted-foreground md:ml-0 ml-[-0.5px]" // align properly
                )}>
                  {getActionIcon(activity.action)}
                </div>

                {/* Content Box */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl shadow-sm border border-border bg-card relative transition-all duration-300 hover:shadow-md group-hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      {new Date(activity.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    <span className={clsx("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", getActionBackground(activity.action))}>
                      {activity.targetModel}
                    </span>
                  </div>
                  
                  <h4 className="font-bold text-foreground text-sm mb-1">{activity.userId?.name || "Unknown User"}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">{activity.details}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
