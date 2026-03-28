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
    <div className="flex flex-col items-center justify-center min-h-screen bg-snow text-gunmetal p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start text-center sm:text-left animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-ruby-700 tracking-tight italic">
            Warehouse Manager
          </h1>
          <p className="text-xl text-gray-500 max-w-md">
            The ultimate control center for your stock management and logistics.
          </p>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row w-full sm:w-auto">
          <Link
            href="/api/auth/signin?callbackUrl=/"
            className="w-full sm:w-auto rounded-xl border border-solid border-transparent transition-all flex items-center justify-center bg-ruby-700 text-white gap-2 hover:bg-ruby-800 hover:scale-105 active:scale-95 text-lg font-bold h-14 px-8 shadow-xl"
          >
            Login with Google
          </Link>

          <div className=""></div>
        </div>
      </main>
      <footer className="absolute bottom-8 flex gap-6 flex-wrap items-center justify-center text-xs text-gray-400 uppercase tracking-widest font-bold">
        &copy; 2026 Pandu Solutions • Global Warehouse Network
      </footer>
    </div>
  );
}
