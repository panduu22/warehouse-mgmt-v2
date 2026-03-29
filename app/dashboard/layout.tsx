import { Sidebar } from "@/components/Sidebar";
import { MobileHeader } from "@/components/MobileHeader";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
        redirect("/");
    }

    const user = session.user as any;
    
    // Only redirect if the user is explicitly STAFF and has no warehouse.
    // This prevents ADMINS or users with loading roles from getting caught in a loop.
    if (user.role === "STAFF" && !user.activeWarehouseId) {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-snow">
            <Sidebar />
            <MobileHeader />
            <main className="md:pl-64 pt-16 md:pt-0 p-4 md:p-8 transition-all">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
