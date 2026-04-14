import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LandingClient from "@/components/LandingClient";
import dbConnect from "@/lib/mongodb";
import Warehouse from "@/models/Warehouse";

export default async function Home() {
  const session = await getServerSession(authOptions);

  // If user is logged in, check if they have access
  if (session?.user) {
    const user = session.user as any;

    // Admins don't need a warehouse — send them straight to the admin panel
    if (user.role === "ADMIN") {
      redirect("/admin/requests");
    }

    // If they have an active warehouse, just redirect to dashboard
    if (user.activeWarehouseId) {
      redirect("/dashboard");
    }

    // If they don't have an active warehouse, fetch all warehouses for the request form
    await dbConnect();
    const warehouses = await Warehouse.find({}).select("name location").lean();

    return (
      <LandingClient
        user={user}
        warehouses={JSON.parse(JSON.stringify(warehouses))}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-8 font-[family-name:var(--font-geist-sans)] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full -mr-48 -mt-48 blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full -ml-48 -mb-48 blur-3xl animate-pulse delay-700"></div>

      <main className="flex flex-col gap-8 items-center sm:items-start text-center sm:text-left animate-in fade-in slide-in-from-bottom-8 duration-1000 relative z-10">
        <div className="space-y-4">
          <div className="bg-primary/10 text-primary w-fit px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em] animate-bounce">
            Advanced Logistics
          </div>
          <h1 className="text-6xl sm:text-7xl font-black text-foreground tracking-tighter leading-none italic">
            Warehouse<br /><span className="text-primary">Manager.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-md font-medium leading-relaxed">
            The ultimate control center for your stock management, fleet logistics, and real-time auditing.
          </p>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row w-full sm:w-auto mt-4">
          <Link
            href="/api/auth/signin?callbackUrl=/"
            className="w-full sm:w-auto rounded-2xl border border-primary/20 transition-all flex items-center justify-center bg-primary text-primary-foreground gap-3 hover:bg-primary/90 hover:scale-105 hover:shadow-2xl hover:shadow-primary/20 active:scale-95 text-lg font-black h-16 px-10 shadow-xl tracking-tight"
          >
            Access Dashboard
            <span className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">→</span>
          </Link>
        </div>
      </main>

      <footer className="absolute bottom-8 flex gap-6 flex-wrap items-center justify-center text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-black opacity-50">
        &copy; 2026 Pandu Solutions • Global Warehouse Network
      </footer>
    </div>
  );
}
