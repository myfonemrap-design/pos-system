import pool from "../connection.js";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export interface InvoiceSettingsRow {
  id: string;
  store_id: string;
  business_name: string;
  logo_url: string;
  address: string;
  phone: string;
  abn_number: string;
  policy_text: string;
  default_payment_method: "cash" | "card" | "eftpos";
  tax_rate: number;
  closing_message: string;
  created_at: Date;
  updated_at: Date;
}

export async function getInvoiceSettings(
  storeId: string
): Promise<InvoiceSettingsRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM invoice_settings WHERE store_id = ?",
    [storeId]
  );
  return rows.length > 0 ? (rows[0] as InvoiceSettingsRow) : null;
}

export async function upsertInvoiceSettings(
  settings: Omit<InvoiceSettingsRow, "created_at" | "updated_at">
): Promise<void> {
  await pool.query<ResultSetHeader>(
    `INSERT INTO invoice_settings (id, store_id, business_name, logo_url, address, phone, abn_number, policy_text, default_payment_method, tax_rate, closing_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       business_name = VALUES(business_name),
       logo_url = VALUES(logo_url),
       address = VALUES(address),
       phone = VALUES(phone),
       abn_number = VALUES(abn_number),
       policy_text = VALUES(policy_text),
       default_payment_method = VALUES(default_payment_method),
       tax_rate = VALUES(tax_rate),
       closing_message = VALUES(closing_message)`,
    [
      settings.id,
      settings.store_id,
      settings.business_name,
      settings.logo_url,
      settings.address,
      settings.phone,
      settings.abn_number,
      settings.policy_text,
      settings.default_payment_method,
      settings.tax_rate,
      settings.closing_message,
    ]
  );
}
