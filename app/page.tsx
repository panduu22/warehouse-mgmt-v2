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

    // If user is logged in, redirect to dashboard for all roles
    if (session?.user) {
        redirect('/dashboard');
    }

  // If unauthenticated, show the Splash Screen (which links to /login)
  return <SplashScreen />;
}
