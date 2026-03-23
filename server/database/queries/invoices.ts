import pool from "../connection.js";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export async function generateInvoiceNumber(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const prefix = `INV-${year}-`;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let nextNum = 1;
  if (rows.length > 0) {
    const lastNum = parseInt(rows[0].invoice_number.replace(prefix, ""), 10);
    nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

export interface InvoiceRow {
  id: string;
  store_id: string | null;
  invoice_number: string;
  customer_id: string | null;
  customer_name: string;
  subtotal: number;
  gst: number;
  discount: number;
  total: number;
  status: "paid" | "pending" | "cancelled";
  payment_method: "cash" | "card" | "eftpos";
  created_at: Date;
}

export interface InvoiceItemRow {
  id: string;
  invoice_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  total: number;
}

export interface InvoiceWithItems extends InvoiceRow {
  items: InvoiceItemRow[];
}

export async function getAllInvoices(
  storeId?: string | null
): Promise<InvoiceWithItems[]> {
  let query = "SELECT * FROM invoices";
  const params: string[] = [];

  if (storeId) {
    query += " WHERE store_id = ?";
    params.push(storeId);
  }

  query += " ORDER BY created_at DESC";
  const [invoices] = await pool.query<RowDataPacket[]>(query, params);
  const [items] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM invoice_items"
  );

  const itemsMap = new Map<string, InvoiceItemRow[]>();
  (items as InvoiceItemRow[]).forEach(item => {
    const existing = itemsMap.get(item.invoice_id) || [];
    existing.push(item);
    itemsMap.set(item.invoice_id, existing);
  });

  return (invoices as InvoiceRow[]).map(invoice => ({
    ...invoice,
    items: itemsMap.get(invoice.id) || [],
  }));
}

export async function getInvoiceById(
  id: string
): Promise<InvoiceWithItems | null> {
  const [invoices] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM invoices WHERE id = ?",
    [id]
  );
  if (invoices.length === 0) return null;

  const [items] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM invoice_items WHERE invoice_id = ?",
    [id]
  );

  return {
    ...(invoices[0] as InvoiceRow),
    items: items as InvoiceItemRow[],
  };
}

export async function getInvoiceByNumber(
  invoiceNumber: string,
  storeId?: string | null
): Promise<InvoiceWithItems | null> {
  let query = "SELECT * FROM invoices WHERE invoice_number = ?";
  const params: (string | null)[] = [invoiceNumber];

  if (storeId) {
    query += " AND store_id = ?";
    params.push(storeId);
  }

  const [invoices] = await pool.query<RowDataPacket[]>(query, params);
  if (invoices.length === 0) return null;

  const [items] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM invoice_items WHERE invoice_id = ?",
    [(invoices[0] as InvoiceRow).id]
  );

  return {
    ...(invoices[0] as InvoiceRow),
    items: items as InvoiceItemRow[],
  };
}

export async function createInvoice(
  invoice: Omit<InvoiceRow, "created_at">,
  items: Array<Omit<InvoiceItemRow, "invoice_id">>
): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query<ResultSetHeader>(
      `INSERT INTO invoices (id, store_id, invoice_number, customer_id, customer_name, subtotal, gst, discount, total, status, payment_method) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice.id,
        invoice.store_id,
        invoice.invoice_number,
        invoice.customer_id,
        invoice.customer_name,
        invoice.subtotal,
        invoice.gst,
        invoice.discount,
        invoice.total,
        invoice.status,
        invoice.payment_method,
      ]
    );

    for (const item of items) {
      await connection.query<ResultSetHeader>(
        "INSERT INTO invoice_items (id, invoice_id, product_id, product_name, sku, quantity, unit_price, cost_price, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          item.id,
          invoice.id,
          item.product_id,
          item.product_name,
          item.sku,
          item.quantity,
          item.unit_price,
          item.cost_price,
          item.total,
        ]
      );

      await connection.query<ResultSetHeader>(
        "UPDATE products SET quantity = GREATEST(0, quantity - ?) WHERE id = ?",
        [item.quantity, item.product_id]
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

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceRow["status"]
): Promise<void> {
  await pool.query<ResultSetHeader>(
    "UPDATE invoices SET status = ? WHERE id = ?",
    [status, id]
  );
}

export async function updateInvoice(
  id: string,
  updates: Partial<Omit<InvoiceRow, "id" | "invoice_number" | "created_at">>
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
      `UPDATE invoices SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
  }
}

export async function deleteInvoice(id: string): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [items] = await connection.query<RowDataPacket[]>(
      "SELECT * FROM invoice_items WHERE invoice_id = ?",
      [id]
    );

    for (const item of items as InvoiceItemRow[]) {
      await connection.query<ResultSetHeader>(
        "UPDATE products SET quantity = quantity + ? WHERE id = ?",
        [item.quantity, item.product_id]
      );
    }

    await connection.query<ResultSetHeader>(
      "DELETE FROM invoice_items WHERE invoice_id = ?",
      [id]
    );
    await connection.query<ResultSetHeader>(
      "DELETE FROM invoices WHERE id = ?",
      [id]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getInvoiceCount(
  storeId?: string | null
): Promise<number> {
  let query = "SELECT COUNT(*) as count FROM invoices";
  const params: string[] = [];

  if (storeId) {
    query += " WHERE store_id = ?";
    params.push(storeId);
  }

  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return (rows[0] as { count: number }).count;
}
