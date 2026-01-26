import { getDb } from "./db";
import { ObjectId } from "mongodb";

const ONE_YEAR_IN_MS = 365 * 24 * 60 * 60 * 1000;

export async function checkWarehouseAccess(userId: string, role: string, warehouseId: string) {
    if (role === "ADMIN") return true;

    const db = await getDb();
    const access = await db.collection("WarehouseAccess").findOne({
        userId: new ObjectId(userId),
        warehouseId: new ObjectId(warehouseId),
        status: "APPROVED"
    });

    if (!access) return false;

    const updatedAt = access.updatedAt ? new Date(access.updatedAt) : new Date(access.createdAt);
    const isExpired = (new Date().getTime() - updatedAt.getTime() > ONE_YEAR_IN_MS);

    return !isExpired;
}
