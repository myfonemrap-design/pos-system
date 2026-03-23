import pool from "../connection.js";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export interface RepairRow {
  id: string;
  store_id: string | null;
  ticket_number: string;
  customer_id: string | null;
  customer_name: string;
  device_type: "Phone" | "Tablet" | "Laptop";
  device_model: string;
  issue_description: string;
  labor_cost: number;
  status: "Pending" | "In Progress" | "Completed";
  notes: string;
  created_at: Date;
  updated_at: Date;
}

export interface RepairPartRow {
  id: string;
  repair_id: string;
  product_id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface RepairWithParts extends RepairRow {
  parts: RepairPartRow[];
}

export async function getAllRepairs(
  storeId?: string | null
): Promise<RepairWithParts[]> {
  let query = "SELECT * FROM repairs";
  const params: string[] = [];

  if (storeId) {
    query += " WHERE store_id = ?";
    params.push(storeId);
  }

  query += " ORDER BY created_at DESC";
  const [repairs] = await pool.query<RowDataPacket[]>(query, params);
  const [parts] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM repair_parts"
  );

  const partsMap = new Map<string, RepairPartRow[]>();
  (parts as RepairPartRow[]).forEach(part => {
    const existing = partsMap.get(part.repair_id) || [];
    existing.push(part);
    partsMap.set(part.repair_id, existing);
  });

  return (repairs as RepairRow[]).map(repair => ({
    ...repair,
    parts: partsMap.get(repair.id) || [],
  }));
}

export async function getRepairById(
  id: string
): Promise<RepairWithParts | null> {
  const [repairs] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM repairs WHERE id = ?",
    [id]
  );
  if (repairs.length === 0) return null;

  const [parts] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM repair_parts WHERE repair_id = ?",
    [id]
  );

  return {
    ...(repairs[0] as RepairRow),
    parts: parts as RepairPartRow[],
  };
}

export async function createRepair(
  repair: Omit<RepairRow, "created_at" | "updated_at">,
  parts: Array<Omit<RepairPartRow, "repair_id">>
): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query<ResultSetHeader>(
      `INSERT INTO repairs (id, store_id, ticket_number, customer_id, customer_name, device_type, device_model, issue_description, labor_cost, status, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        repair.id,
        repair.store_id,
        repair.ticket_number,
        repair.customer_id,
        repair.customer_name,
        repair.device_type,
        repair.device_model,
        repair.issue_description,
        repair.labor_cost,
        repair.status,
        repair.notes,
      ]
    );

    for (const part of parts) {
      await connection.query<ResultSetHeader>(
        "INSERT INTO repair_parts (id, repair_id, product_id, name, quantity, price) VALUES (?, ?, ?, ?, ?, ?)",
        [
          part.id,
          repair.id,
          part.product_id,
          part.name,
          part.quantity,
          part.price,
        ]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateRepair(
  id: string,
  updates: Partial<
    Omit<RepairRow, "id" | "ticket_number" | "created_at" | "updated_at">
  >
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length > 0) {
    values.push(id);
    await pool.query<ResultSetHeader>(
      `UPDATE repairs SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
  }
}

export async function deleteRepair(id: string): Promise<void> {
  await pool.query<ResultSetHeader>(
    "DELETE FROM repair_parts WHERE repair_id = ?",
    [id]
  );
  await pool.query<ResultSetHeader>("DELETE FROM repairs WHERE id = ?", [id]);
}

export async function getRepairCount(storeId?: string | null): Promise<number> {
  let query = "SELECT COUNT(*) as count FROM repairs";
  const params: string[] = [];

  if (storeId) {
    query += " WHERE store_id = ?";
    params.push(storeId);
  }

  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return (rows[0] as { count: number }).count;
}
