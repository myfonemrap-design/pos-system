import pool from "../connection.js";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export interface CustomerRow {
  id: string;
  store_id: string | null;
  name: string;
  phone: string;
  email: string;
  created_at: Date;
}

export async function getAllCustomers(
  storeId?: string | null
): Promise<CustomerRow[]> {
  let query = "SELECT * FROM customers";
  const params: string[] = [];

  if (storeId) {
    query += " WHERE store_id = ?";
    params.push(storeId);
  }

  query += " ORDER BY created_at DESC";
  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows as CustomerRow[];
}

export async function getCustomerById(id: string): Promise<CustomerRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM customers WHERE id = ?",
    [id]
  );
  return rows.length > 0 ? (rows[0] as CustomerRow) : null;
}

export async function createCustomer(
  customer: Omit<CustomerRow, "created_at">
): Promise<void> {
  await pool.query<ResultSetHeader>(
    "INSERT INTO customers (id, store_id, name, phone, email) VALUES (?, ?, ?, ?, ?)",
    [
      customer.id,
      customer.store_id,
      customer.name,
      customer.phone,
      customer.email,
    ]
  );
}

export async function updateCustomer(
  id: string,
  updates: Partial<CustomerRow>
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && key !== "id" && key !== "created_at") {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length > 0) {
    values.push(id);
    await pool.query<ResultSetHeader>(
      `UPDATE customers SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  await pool.query<ResultSetHeader>("DELETE FROM customers WHERE id = ?", [id]);
}

export async function getCustomerCount(
  storeId?: string | null
): Promise<number> {
  let query = "SELECT COUNT(*) as count FROM customers";
  const params: string[] = [];

  if (storeId) {
    query += " WHERE store_id = ?";
    params.push(storeId);
  }

  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return (rows[0] as { count: number }).count;
}
