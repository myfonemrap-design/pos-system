import "dotenv/config";
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { testConnection } from "./database/connection.js";
import * as products from "./database/queries/products.js";
import * as customers from "./database/queries/customers.js";
import * as invoices from "./database/queries/invoices.js";
import * as repairs from "./database/queries/repairs.js";
import * as users from "./database/queries/users.js";
import * as stores from "./database/queries/stores.js";
import * as invoiceSettings from "./database/queries/invoiceSettings.js";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateFakeJWT(user: {
  id: string;
  name: string;
  role: string;
  store_id?: string | null;
}): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: user.id,
      name: user.name,
      role: user.role,
      store_id: user.store_id,
      iat: Date.now(),
    })
  );
  const signature = btoa("repair-shop-secret-key");
  return `${header}.${payload}.${signature}`;
}

function parseJWT(token: string): {
  sub: string;
  name: string;
  role: string;
  store_id?: string | null;
} | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

function getStoreIdFromReq(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const payload = parseJWT(token);
    if (payload) {
      if (payload.role === "Admin") {
        return (req.query.store_id as string) || null;
      }
      return payload.store_id ?? null;
    }
  }
  return null;
}

function authenticate(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.substring(7);
  const payload = parseJWT(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid token" });
  }
  (req as any).userId = payload.sub;
  next();
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json());

  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  // Serve static files first (only non-API routes)
  app.use(express.static(staticPath));

  // =====================
  // STORES API
  // =====================
  app.get("/api/stores", async (_req, res) => {
    try {
      const data = await stores.getAllStores();
      res.json(data);
    } catch (error) {
      console.error("Error fetching stores:", error);
      res.status(500).json({ error: "Failed to fetch stores" });
    }
  });

  // =====================
  // INVOICE SETTINGS API
  // =====================
  app.get("/api/settings/invoice", async (req, res) => {
    try {
      const storeId = getStoreIdFromReq(req);
      if (!storeId) {
        return res.status(400).json({ error: "Store ID required" });
      }
      const data = await invoiceSettings.getInvoiceSettings(storeId);
      if (!data) {
        return res.status(404).json({ error: "Invoice settings not found" });
      }
      res.json(data);
    } catch (error) {
      console.error("Error fetching invoice settings:", error);
      res.status(500).json({ error: "Failed to fetch invoice settings" });
    }
  });

  app.put("/api/settings/invoice", async (req, res) => {
    try {
      const storeId = getStoreIdFromReq(req);
      if (!storeId) {
        return res.status(400).json({ error: "Store ID required" });
      }
      const existing = await invoiceSettings.getInvoiceSettings(storeId);
      const settings = {
        id: existing?.id || nanoid(),
        store_id: storeId,
        business_name: req.body.business_name || "",
        logo_url: req.body.logo_url || "",
        address: req.body.address || "",
        phone: req.body.phone || "",
        abn_number: req.body.abn_number || "",
        policy_text: req.body.policy_text || "",
        default_payment_method: req.body.default_payment_method || "cash",
        tax_rate: req.body.tax_rate || 10.0,
        closing_message:
          req.body.closing_message || "Thank you for your business!",
      };
      await invoiceSettings.upsertInvoiceSettings(settings);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating invoice settings:", error);
      res.status(500).json({ error: "Failed to update invoice settings" });
    }
  });

  // =====================
  // AUTH API
  // =====================
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }
      const user = await users.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const isValid = await users.verifyPassword(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const token = generateFakeJWT({
        id: user.id,
        name: user.name,
        role: user.role,
        store_id: user.store_id,
      });
      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          store_id: user.store_id,
        },
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password, role, store_id } = req.body;
      if (!name || !email || !password) {
        return res
          .status(400)
          .json({ error: "Name, email and password are required" });
      }
      const existing = await users.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "Email already registered" });
      }
      const passwordHash = await users.hashPassword(password);
      const id = nanoid();
      await users.createUser({
        id,
        name,
        email,
        address: null,
        password_hash: passwordHash,
        role: role || "Staff",
        store_id: store_id || null,
      });
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Error during registration:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // =====================
  // PROFILE API
  // =====================
  app.get("/api/profile", authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const user = await users.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        address: user.address,
        role: user.role,
        store_id: user.store_id,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.put("/api/profile", authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { name, email, address, currentPassword } = req.body;

      if (!currentPassword) {
        return res
          .status(400)
          .json({ error: "Current password is required to make changes" });
      }

      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
      }

      const user = await users.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isValid = await users.verifyPassword(
        currentPassword,
        user.password_hash
      );
      if (!isValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const existing = await users.getUserByEmail(email);
      if (existing && existing.id !== userId) {
        return res.status(409).json({ error: "Email already in use" });
      }

      await users.updateUser(userId, { name, email, address: address || null });

      const updatedUser = await users.getUserById(userId);
      res.json({
        id: updatedUser?.id,
        name: updatedUser?.name,
        email: updatedUser?.email,
        address: updatedUser?.address,
        role: updatedUser?.role,
        store_id: updatedUser?.store_id,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.put("/api/profile/password", authenticate, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res
          .status(400)
          .json({ error: "Current and new password are required" });
      }

      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "New password must be at least 6 characters" });
      }

      const user = await users.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isValid = await users.verifyPassword(
        currentPassword,
        user.password_hash
      );
      if (!isValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const newPasswordHash = await users.hashPassword(newPassword);
      await users.updateUserPassword(userId, newPasswordHash);

      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  // =====================
  // PRODUCTS API
  // =====================
  app.get("/api/products", async (req, res) => {
    try {
      const storeId = getStoreIdFromReq(req);
      const data = await products.getAllProducts(storeId);
      res.json(data);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const data = await products.getProductById(req.params.id);
      if (!data) return res.status(404).json({ error: "Product not found" });
      res.json(data);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const storeId = getStoreIdFromReq(req);
      const productData = { ...req.body, store_id: storeId };
      await products.createProduct(productData);
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      await products.updateProduct(req.params.id, req.body);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      await products.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // =====================
  // CUSTOMERS API
  // =====================
  app.get("/api/customers", async (req, res) => {
    try {
      const storeId = getStoreIdFromReq(req);
      const data = await customers.getAllCustomers(storeId);
      res.json(data);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const data = await customers.getCustomerById(req.params.id);
      if (!data) return res.status(404).json({ error: "Customer not found" });
      res.json(data);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const storeId = getStoreIdFromReq(req);
      const customerData = { ...req.body, store_id: storeId };
      await customers.createCustomer(customerData);
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    try {
      await customers.updateCustomer(req.params.id, req.body);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      await customers.deleteCustomer(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // =====================
  // INVOICES API
  // =====================
  app.get("/api/invoices", async (req, res) => {
    try {
      const storeId = getStoreIdFromReq(req);
      const data = await invoices.getAllInvoices(storeId);
      res.json(data);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/number/:invoiceNumber/print", async (req, res) => {
    try {
      const storeId = getStoreIdFromReq(req);
      const invoice = await invoices.getInvoiceByNumber(
        req.params.invoiceNumber,
        storeId
      );
      if (!invoice) return res.status(404).send("Invoice not found");
      const settings = storeId
        ? await invoiceSettings.getInvoiceSettings(storeId)
        : null;
      const logoHtml = settings?.logo_url
        ? `<img src="${settings.logo_url}" alt="Logo" style="max-height: 60px; max-width: 150px; margin-bottom: 10px;">`
        : "";
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 30px; max-width: 700px; margin: 0 auto; color: #1a1a1a; }
    .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #1e3a5f; padding-bottom: 15px; }
    .header h1 { font-size: 28px; margin: 0 0 5px 0; color: #1e3a5f; }
    .header .business-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
    .header .address { font-size: 12px; color: #666; }
    .header .contact { font-size: 12px; color: #666; }
    .invoice-meta { display: flex; justify-content: space-between; margin: 20px 0; }
    .invoice-meta .invoice-number { font-size: 16px; font-weight: bold; color: #1e3a5f; }
    .invoice-meta .invoice-date { font-size: 14px; color: #666; }
    .customer-info { margin-bottom: 20px; padding: 10px; background: #f8f9fa; border-radius: 5px; }
    .customer-info h3 { font-size: 12px; text-transform: uppercase; color: #666; margin: 0 0 5px 0; }
    .customer-info p { margin: 0; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #1e3a5f; color: white; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
    th.qty, th.price, th.total { text-align: right; }
    td { padding: 10px 8px; border-bottom: 1px solid #e0e0e0; font-size: 13px; }
    td.qty, td.price, td.total { text-align: right; font-family: monospace; }
    td.desc { padding-left: 15px; }
    td.sku { font-family: monospace; font-size: 11px; color: #888; }
    .totals { margin-top: 20px; text-align: right; }
    .totals .subtotal, .totals .discount, .totals .tax { margin: 5px 0; font-size: 14px; }
    .totals .tax-item { font-size: 12px; color: #666; }
    .totals .total-row { font-size: 22px; font-weight: bold; color: #1e3a5f; margin-top: 10px; padding-top: 10px; border-top: 2px solid #1e3a5f; }
    .payment-info { margin: 20px 0; padding: 10px; background: #f0f7ff; border-radius: 5px; text-align: center; }
    .payment-info strong { font-size: 14px; text-transform: uppercase; }
    .policy { margin: 25px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; font-size: 11px; color: #555; }
    .policy h4 { margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #1e3a5f; font-weight: bold; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    ${logoHtml}
    <h1>TAX INVOICE</h1>
    <p class="business-name">${settings?.business_name || "Store"}</p>
    ${settings?.address ? `<p class="address">${settings.address}</p>` : ""}
    ${settings?.phone ? `<p class="contact">Phone: ${settings.phone}</p>` : ""}
    ${settings?.abn_number ? `<p class="contact">ABN: ${settings.abn_number}</p>` : ""}
  </div>
  <div class="invoice-meta">
    <div>
      <div class="invoice-number">${invoice.invoice_number}</div>
    </div>
    <div class="invoice-date">
      ${new Date(invoice.created_at).toLocaleDateString("en-AU", { day: "2-digit", month: "long", year: "numeric" })}
      ${new Date(invoice.created_at).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
    </div>
  </div>
  <div class="customer-info">
    <h3>Bill To</h3>
    <p><strong>${invoice.customer_name || "Walk-in Customer"}</strong></p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="sku">SKU</th>
        <th class="qty">Qty</th>
        <th class="price">Unit Price</th>
        <th class="total">Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items
        .map(
          (item: any) => `
      <tr>
        <td class="desc">${item.product_name}</td>
        <td class="sku">${item.sku}</td>
        <td class="qty">${item.quantity}</td>
        <td class="price">$${item.unit_price.toFixed(2)}</td>
        <td class="total">$${item.total.toFixed(2)}</td>
      </tr>
      `
        )
        .join("")}
    </tbody>
  </table>
  <div class="totals">
    <div class="subtotal">Subtotal: <strong>$${invoice.subtotal.toFixed(2)}</strong></div>
    ${invoice.discount > 0 ? `<div class="discount">Discount: <strong style="color: green;">-$${invoice.discount.toFixed(2)}</strong></div>` : ""}
    ${invoice.gst > 0 ? `<div class="tax-item">GST (${settings?.tax_rate || 10}%): <strong>$${invoice.gst.toFixed(2)}</strong></div>` : ""}
    <div class="total-row">TOTAL: $${invoice.total.toFixed(2)}</div>
  </div>
  <div class="payment-info">
    <strong>Payment Method: ${invoice.payment_method.toUpperCase()}</strong>
  </div>
  ${
    settings?.policy_text
      ? `
  <div class="policy">
    <h4>Return & Refund Policy</h4>
    <p>${settings.policy_text}</p>
  </div>
  `
      : ""
  }
  <div class="footer">
    ${settings?.closing_message || "Thank you for your business!"}
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
      res.type("html").send(html);
    } catch (error) {
      console.error("Error printing invoice:", error);
      res.status(500).send("Error printing invoice");
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const data = await invoices.getInvoiceById(req.params.id);
      if (!data) return res.status(404).json({ error: "Invoice not found" });
      res.json(data);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const storeId = getStoreIdFromReq(req);
      const { invoice, items } = req.body;
      const invoiceNumber = await invoices.generateInvoiceNumber();
      const invoiceData = {
        ...invoice,
        store_id: storeId,
        invoice_number: invoiceNumber,
      };
      await invoices.createInvoice(invoiceData, items);
      res.status(201).json({ success: true, invoiceNumber });
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  app.put("/api/invoices/:id/status", async (req, res) => {
    try {
      await invoices.updateInvoiceStatus(req.params.id, req.body.status);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating invoice status:", error);
      res.status(500).json({ error: "Failed to update invoice status" });
    }
  });

  app.put("/api/invoices/:id", async (req, res) => {
    try {
      await invoices.updateInvoice(req.params.id, req.body);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      await invoices.deleteInvoice(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  // =====================
  // REPAIRS API
  // =====================
  app.get("/api/repairs", async (req, res) => {
    try {
      const storeId = getStoreIdFromReq(req);
      const data = await repairs.getAllRepairs(storeId);
      res.json(data);
    } catch (error) {
      console.error("Error fetching repairs:", error);
      res.status(500).json({ error: "Failed to fetch repairs" });
    }
  });

  app.get("/api/repairs/:id", async (req, res) => {
    try {
      const data = await repairs.getRepairById(req.params.id);
      if (!data) return res.status(404).json({ error: "Repair not found" });
      res.json(data);
    } catch (error) {
      console.error("Error fetching repair:", error);
      res.status(500).json({ error: "Failed to fetch repair" });
    }
  });

  app.post("/api/repairs", async (req, res) => {
    try {
      const storeId = getStoreIdFromReq(req);
      const { repair, parts } = req.body;
      const repairData = { ...repair, store_id: storeId };
      await repairs.createRepair(repairData, parts);
      res
        .status(201)
        .json({ success: true, ticketNumber: repair.ticket_number });
    } catch (error) {
      console.error("Error creating repair:", error);
      res.status(500).json({ error: "Failed to create repair" });
    }
  });

  app.put("/api/repairs/:id", async (req, res) => {
    try {
      await repairs.updateRepair(req.params.id, req.body);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating repair:", error);
      res.status(500).json({ error: "Failed to update repair" });
    }
  });

  app.delete("/api/repairs/:id", async (req, res) => {
    try {
      await repairs.deleteRepair(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting repair:", error);
      res.status(500).json({ error: "Failed to delete repair" });
    }
  });

  // =====================
  // DASHBOARD STATS API
  // =====================
  app.get("/api/stats", async (req, res) => {
    try {
      const storeId = getStoreIdFromReq(req);
      const [productCount, customerCount, invoiceCount, repairCount] =
        await Promise.all([
          products.getProductCount(storeId),
          customers.getCustomerCount(storeId),
          invoices.getInvoiceCount(storeId),
          repairs.getRepairCount(storeId),
        ]);
      res.json({ productCount, customerCount, invoiceCount, repairCount });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Handle client-side routing - serve index.html for non-API routes
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(staticPath, "index.html"));
  });

  // Test database connection
  await testConnection();

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
