import pool from "../connection.js";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { nanoid } from "nanoid";

export interface ProductRow {
  id: string;
  store_id: string | null;
  name: string;
  sku: string;
  upc: string;
  category: string;
  cost_price: number;
  selling_price: number;
  quantity: number;
  supplier: string;
  type: "repair" | "accessory";
  created_at: Date;
}

export async function getAllProducts(
  storeId?: string | null
): Promise<ProductRow[]> {
  let query = "SELECT * FROM products";
  const params: string[] = [];

  if (storeId) {
    query += " WHERE store_id = ?";
    params.push(storeId);
  }

  query += " ORDER BY created_at DESC";
  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows as ProductRow[];
}

export async function getProductById(id: string): Promise<ProductRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM products WHERE id = ?",
    [id]
  );
  return rows.length > 0 ? (rows[0] as ProductRow) : null;
}

export async function createProduct(
  product: Omit<ProductRow, "created_at">
): Promise<void> {
  const sku = product.sku || `SKU-${nanoid(8).toUpperCase()}`;
  await pool.query<ResultSetHeader>(
    `INSERT INTO products (id, store_id, name, sku, upc, category, cost_price, selling_price, quantity, supplier, type) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      product.id,
      product.store_id,
      product.name,
      sku,
      product.upc,
      product.category,
      product.cost_price,
      product.selling_price,
      product.quantity,
      product.supplier,
      product.type,
    ]
  );
}

export async function updateProduct(
  id: string,
  updates: Partial<ProductRow>
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
      `UPDATE products SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
  }
}

export async function deleteProduct(id: string): Promise<void> {
  await pool.query<ResultSetHeader>("DELETE FROM products WHERE id = ?", [id]);
}

export async function updateProductQuantity(
  id: string,
  quantityChange: number
): Promise<void> {
  await pool.query<ResultSetHeader>(
    "UPDATE products SET quantity = GREATEST(0, quantity + ?) WHERE id = ?",
    [quantityChange, id]
  );
}

export async function getProductCount(
  storeId?: string | null
): Promise<number> {
  let query = "SELECT COUNT(*) as count FROM products";
  const params: string[] = [];

  if (storeId) {
    query += " WHERE store_id = ?";
    params.push(storeId);
  }

  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return (rows[0] as { count: number }).count;
}
