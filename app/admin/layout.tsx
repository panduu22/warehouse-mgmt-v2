import { AppShellClient } from "@/components/AppShellClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
        redirect("/");
    }

    const user = session.user as any;
    
    if (user.role !== "ADMIN") {
        redirect("/");
    }

    return (
        <AppShellClient>
            {children}
        </AppShellClient>
    );
}
