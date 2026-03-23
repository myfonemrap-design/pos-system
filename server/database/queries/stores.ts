import pool from "../connection.js";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export interface StoreRow {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  is_active: boolean;
  created_at: Date;
}

export async function getAllStores(): Promise<StoreRow[]> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM stores WHERE is_active = TRUE ORDER BY name ASC"
    );
    return rows as StoreRow[];
  } catch {
    console.error("Stores table might not exist or query failed");
    return [];
  }
}

export async function getStoreById(id: string): Promise<StoreRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM stores WHERE id = ?",
    [id]
  );
  return rows.length > 0 ? (rows[0] as StoreRow) : null;
}

export async function createStore(
  store: Omit<StoreRow, "created_at" | "is_active">
): Promise<void> {
  await pool.query<ResultSetHeader>(
    "INSERT INTO stores (id, name, address, phone, email) VALUES (?, ?, ?, ?, ?)",
    [store.id, store.name, store.address, store.phone, store.email]
  );
}
