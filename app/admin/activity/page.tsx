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
      case "CREATE_PRODUCT": return <PlusCircle className="w-5 h-5 text-emerald-600" />;
      case "EDIT_PRODUCT":   return <Edit3 className="w-5 h-5 text-blue-600" />;
      case "DELETE_PRODUCT": return <Trash2 className="w-5 h-5 text-red-600" />;
      case "LOAD_VEHICLE":   return <Truck className="w-5 h-5 text-amber-600" />;
      case "VERIFY_TRIP":    return <Truck className="w-5 h-5 text-teal-600" />;
      case "GENERATE_BILL":  return <Receipt className="w-5 h-5 text-ruby-600" />;
      default:               return <History className="w-5 h-5 text-gray-400" />;
    }
  };

  const getActionBackground = (action: string) => {
    switch (action) {
      case "CREATE_PRODUCT": return "bg-emerald-50 border-emerald-100";
      case "EDIT_PRODUCT":   return "bg-blue-50 border-blue-100";
      case "DELETE_PRODUCT": return "bg-red-50 border-red-100";
      case "LOAD_VEHICLE":   return "bg-amber-50 border-amber-100";
      case "VERIFY_TRIP":    return "bg-teal-50 border-teal-100";
      case "GENERATE_BILL":  return "bg-ruby-50 border-ruby-100";
      default:               return "bg-gray-50 border-gray-100";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-ruby-700" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
          <History className="w-8 h-8 text-ruby-700" />
          System Activity History
        </h1>
        <p className="text-gray-500 font-medium mt-1">Audit log of all worker actions inside the active warehouse.</p>
      </div>

      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
        {activities.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <History className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Recent Activity</h3>
            <p className="text-gray-400 font-medium">System generated logs will appear here when staff take action.</p>
          </div>
        ) : (
          <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
            {activities.map((activity, index) => (
              <div key={activity._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-8">
                {/* Timeline Marker */}
                <div className={clsx(
                  "flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shrink-0 shadow-sm z-10 md:order-1",
                  getActionBackground(activity.action).split(" ")[0], // Use the bg color
                  "text-gray-500 md:ml-0 ml-[-0.5px]" // align properly
                )}>
                  {getActionIcon(activity.action)}
                </div>

                {/* Content Box */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl shadow-sm border bg-white relative transition-all duration-300 hover:shadow-md group-hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      {new Date(activity.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    <span className={clsx("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full", getActionBackground(activity.action))}>
                      {activity.targetModel}
                    </span>
                  </div>
                  
                  <h4 className="font-bold text-gray-900 text-sm mb-1">{activity.userId?.name || "Unknown User"}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed font-medium">{activity.details}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
