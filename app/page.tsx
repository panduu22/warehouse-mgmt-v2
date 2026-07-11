import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LandingClient from "@/components/LandingClient";
import SplashScreen from "@/components/SplashScreen";
import dbConnect from "@/lib/mongodb";
import Warehouse from "@/models/Warehouse";

export default async function HomePage() {
  // WORKAROUND: Next.js Turbopack bug throws "Performance cannot have a negative time stamp"
  // when a Server Component resolves instantly. This tiny delay ensures a positive time delta.
  await new Promise((resolve) => setTimeout(resolve, 1));
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch (err) {
    console.error("Session decryption failed:", err);
  }

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

  // If unauthenticated, show the Splash Screen (which links to /login)
  return <SplashScreen />;
}
