import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-snow text-gunmetal p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start text-center sm:text-left">
        <h1 className="text-4xl font-bold text-ruby-700">Warehouse Manager</h1>
        <p className="text-lg mb-4">
          Secure Warehouse Management System with Stock Tracking and Logistics.
        </p>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Link
            href="/api/auth/signin?callbackUrl=/select-org"
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-ruby-700 text-white gap-2 hover:bg-ruby-800 text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 shadow-md"
          >
            Login with Google
          </Link>
          <a
            href="#"
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44"
          >
            View Documentation
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center mt-12 text-sm text-gray-500">
        &copy; 2026 Warehouse Management System
      </footer>
    </div>
  );
}
