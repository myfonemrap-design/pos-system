import pool from "../connection.js";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import bcrypt from "bcryptjs";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  address: string | null;
  password_hash: string;
  role: "Admin" | "Staff";
  store_id: string | null;
  created_at: Date;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );
  return rows.length > 0 ? (rows[0] as UserRow) : null;
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM users WHERE id = ?",
    [id]
  );
  return rows.length > 0 ? (rows[0] as UserRow) : null;
}

export async function getUsersByStore(storeId: string): Promise<UserRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM users WHERE store_id = ? OR role = 'Admin' ORDER BY name ASC",
    [storeId]
  );
  return rows as UserRow[];
}

export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

export async function createUser(
  user: Omit<UserRow, "created_at">
): Promise<void> {
  await pool.query<ResultSetHeader>(
    "INSERT INTO users (id, name, email, password_hash, role, store_id) VALUES (?, ?, ?, ?, ?, ?)",
    [
      user.id,
      user.name,
      user.email,
      user.password_hash,
      user.role,
      user.store_id,
    ]
  );
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function updateUser(
  id: string,
  updates: { name?: string; email?: string; address?: string }
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.email !== undefined) {
    fields.push("email = ?");
    values.push(updates.email);
  }
  if (updates.address !== undefined) {
    fields.push("address = ?");
    values.push(updates.address);
  }

  if (fields.length > 0) {
    values.push(id);
    await pool.query<ResultSetHeader>(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
  }
}

export async function updateUserPassword(
  id: string,
  newPasswordHash: string
): Promise<void> {
  await pool.query<ResultSetHeader>(
    "UPDATE users SET password_hash = ? WHERE id = ?",
    [newPasswordHash, id]
  );
}
