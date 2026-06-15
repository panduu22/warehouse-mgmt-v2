import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "").split(',').map(e => e.trim()).filter(Boolean);
if (adminEmails.length === 0) {
  console.error("No admin email defined in NEXT_PUBLIC_ADMIN_EMAILS");
  process.exit(1);
}
const email = adminEmails[0]; // update first listed admin

(async () => {
  try {
    const { default: dbConnect } = await import("../lib/mongodb");
    const conn = await dbConnect();
    const db = conn.connection.db;
    if (!db) throw new Error("DB error");
    const result = await db.collection("User").updateOne({ email }, { $set: { role: "ADMIN" } });
    console.log(`User role update: matched ${result.matchedCount}, modified ${result.modifiedCount}`);
  } catch (err) {
    console.error("Error updating user role", err);
    process.exit(1);
  }
  process.exit(0);
})();
