/**
 * InvoicesPage — Invoice management with view, print, and status update
 * Features: List all invoices, view details, update status, print-friendly view
 * Design: Clean Professional Blue / Enterprise SaaS
 */
import { useState, useMemo } from "react";
import { useData, Invoice } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  FileText,
  Eye,
  Printer,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign,
  Edit2,
  Trash2,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import {
  DateFilter,
  DateFilterValue,
  filterByDateRange,
} from "@/components/DateFilter";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(n);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_ICONS = {
  paid: <CheckCircle2 size={13} />,
  pending: <Clock size={13} />,
  cancelled: <XCircle size={13} />,
};

export default function InvoicesPage() {
  const { invoices, updateInvoiceStatus, updateInvoice, deleteInvoice } =
    useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    type: "all",
  });
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Invoice | null>(
    null
  );

  const filtered = useMemo(() => {
    let list = filterByDateRange(invoices, dateFilter);
    list = [...list].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (statusFilter !== "all")
      list = list.filter(i => i.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        i =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.customerName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [invoices, statusFilter, search, dateFilter]);

  const stats = useMemo(() => {
    const dateFilteredInvoices = filterByDateRange(invoices, dateFilter);
    return {
      total: dateFilteredInvoices.reduce(
        (s, i) => s + (i.status === "paid" ? i.total : 0),
        0
      ),
      paid: dateFilteredInvoices.filter(i => i.status === "paid").length,
      pending: dateFilteredInvoices.filter(i => i.status === "pending").length,
    };
  }, [invoices, dateFilter]);

  const handleDelete = (inv: Invoice) => {
    deleteInvoice(inv.id);
    setShowDeleteConfirm(null);
    setSelectedInvoice(null);
  };

  const handlePrint = async (inv: Invoice) => {
    let settings = {
      business_name: "Store",
      logo_url: "",
      address: "",
      phone: "",
      abn_number: "",
      policy_text: "",
      tax_rate: 10,
      closing_message: "Thank you for your business!",
    };

    try {
      const response = await axios.get("/api/settings/invoice");
      settings = response.data;
    } catch (error) {
      console.error("Failed to fetch invoice settings, using defaults");
    }

    const logoHtml = settings.logo_url
      ? `<img src="${settings.logo_url}" alt="Logo" style="max-height: 60px; max-width: 150px; margin-bottom: 10px;">`
      : "";

    const printContent = `
      <html><head><title>Invoice ${inv.invoiceNumber}</title>
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
      </style></head>
      <body>
        <div class="header">
          ${logoHtml}
          <h1>TAX INVOICE</h1>
          <p class="business-name">${settings.business_name || "Store"}</p>
          ${settings.address ? `<p class="address">${settings.address}</p>` : ""}
          ${settings.phone ? `<p class="contact">Phone: ${settings.phone}</p>` : ""}
          ${settings.abn_number ? `<p class="contact">ABN: ${settings.abn_number}</p>` : ""}
        </div>
        <div class="invoice-meta">
          <div>
            <div class="invoice-number">${inv.invoiceNumber}</div>
          </div>
          <div class="invoice-date">${formatDate(inv.createdAt)}</div>
        </div>
        <div class="customer-info">
          <h3>Bill To</h3>
          <p><strong>${inv.customerName || "Walk-in Customer"}</strong></p>
        </div>
        <table>
          <thead><tr><th>Description</th><th class="sku">SKU</th><th class="qty">Qty</th><th class="price">Unit Price</th><th class="total">Total</th></tr></thead>
          <tbody>
            ${inv.items
              .map(
                item => `
              <tr>
                <td class="desc">${item.productName}</td>
                <td class="sku">${item.sku}</td>
                <td class="qty">${item.quantity}</td>
                <td class="price">${formatCurrency(item.unitPrice)}</td>
                <td class="total">${formatCurrency(item.total)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <div class="totals">
          <div class="subtotal">Subtotal: <strong>${formatCurrency(inv.subtotal)}</strong></div>
          ${inv.discount > 0 ? `<div class="discount">Discount: <strong style="color:green;">-${formatCurrency(inv.discount)}</strong></div>` : ""}
          ${inv.gst > 0 ? `<div class="tax-item">GST (${settings.tax_rate}%): <strong>${formatCurrency(inv.gst)}</strong></div>` : ""}
          <div class="total-row">TOTAL: ${formatCurrency(inv.total)}</div>
        </div>
        <div class="payment-info">
          <strong>Payment Method: ${inv.paymentMethod.toUpperCase()}</strong>
        </div>
        ${
          settings.policy_text
            ? `
        <div class="policy">
          <h4>Return & Refund Policy</h4>
          <p>${settings.policy_text}</p>
        </div>
        `
            : ""
        }
        <div class="footer">
          ${settings.closing_message || "Thank you for your business!"}
        </div>
      </body></html>
    `;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.print();
    }
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">{invoices.length} total invoices</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download size={14} /> Export
        </Button>
      </div>

      {/* Date Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card rounded-xl border border-border shadow-sm">
        <DateFilter
          value={dateFilter}
          onChange={setDateFilter}
          className="w-full sm:w-auto"
        />
        <div className="text-sm text-muted-foreground">
          {filtered.length} invoice{filtered.length !== 1 ? "s" : ""} found
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Revenue",
            value: formatCurrency(stats.total),
            icon: DollarSign,
            color: "oklch(0.28 0.09 250)",
          },
          {
            label: "Paid Invoices",
            value: stats.paid.toString(),
            icon: CheckCircle2,
            color: "oklch(0.35 0.12 160)",
          },
          {
            label: "Pending",
            value: stats.pending.toString(),
            icon: Clock,
            color: "oklch(0.5 0.15 55)",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center gap-4"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
              style={{ background: color }}
            >
              <Icon size={18} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p
                className="text-xl font-bold font-mono"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search by invoice # or customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9">
            <Filter size={13} className="mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="text-left">Invoice #</th>
                <th className="text-left">Customer</th>
                <th className="text-left">Date</th>
                <th className="text-center">Items</th>
                <th className="text-right">Total</th>
                <th className="text-left">Payment</th>
                <th className="text-center">Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <FileText size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No invoices found</p>
                  </td>
                </tr>
              ) : (
                filtered.map(inv => (
                  <tr key={inv.id}>
                    <td>
                      <span
                        className="font-mono text-sm font-semibold"
                        style={{ color: "oklch(0.28 0.09 250)" }}
                      >
                        {inv.invoiceNumber}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: "oklch(0.55 0.2 250)" }}
                        >
                          {inv.customerName.charAt(0)}
                        </div>
                        <span className="text-sm">{inv.customerName}</span>
                      </div>
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {formatDate(inv.createdAt)}
                    </td>
                    <td className="text-center text-sm">{inv.items.length}</td>
                    <td className="text-right font-mono text-sm font-semibold">
                      {formatCurrency(inv.total)}
                    </td>
                    <td>
                      <span className="badge-info capitalize">
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td className="text-center">
                      <span
                        className={
                          inv.status === "paid"
                            ? "badge-success"
                            : inv.status === "pending"
                              ? "badge-warning"
                              : "badge-danger"
                        }
                      >
                        <span className="flex items-center gap-1">
                          {STATUS_ICONS[inv.status]}
                          {inv.status}
                        </span>
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition-colors"
                          title="View"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => setEditInvoice(inv)}
                          className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handlePrint(inv)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                          title="Print"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(inv)}
                          className="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-border text-xs text-muted-foreground">
          Showing {filtered.length} of {invoices.length} invoices
        </div>
      </div>

      {/* Invoice Detail Modal */}
      <Dialog
        open={!!selectedInvoice}
        onOpenChange={() => setSelectedInvoice(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedInvoice && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText size={18} />
                  Invoice {selectedInvoice.invoiceNumber}
                </DialogTitle>
              </DialogHeader>

              {/* Invoice header */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-semibold">
                    {selectedInvoice.customerName}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(selectedInvoice.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={
                      selectedInvoice.status === "paid"
                        ? "badge-success"
                        : selectedInvoice.status === "pending"
                          ? "badge-warning"
                          : "badge-danger"
                    }
                  >
                    {selectedInvoice.status}
                  </span>
                  <p className="text-sm text-muted-foreground mt-1 capitalize">
                    via {selectedInvoice.paymentMethod}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full data-table">
                  <thead>
                    <tr>
                      <th className="text-left">Product</th>
                      <th className="text-center">Qty</th>
                      <th className="text-right">Unit Price</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, i) => (
                      <tr key={i}>
                        <td>
                          <p className="text-sm font-medium">
                            {item.productName}
                          </p>
                          <p className="text-xs font-mono text-muted-foreground">
                            {item.sku}
                          </p>
                        </td>
                        <td className="text-center text-sm">{item.quantity}</td>
                        <td className="text-right font-mono text-sm">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="text-right font-mono text-sm font-semibold">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div
                className="rounded-lg p-4 space-y-2"
                style={{ background: "oklch(0.975 0.003 250)" }}
              >
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono">
                    {formatCurrency(selectedInvoice.subtotal)}
                  </span>
                </div>
                {selectedInvoice.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-mono text-green-600">
                      -{formatCurrency(selectedInvoice.discount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GST (10%)</span>
                  <span className="font-mono">
                    {formatCurrency(selectedInvoice.gst)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
                  <span>Total</span>
                  <span
                    className="font-mono"
                    style={{ color: "oklch(0.28 0.09 250)" }}
                  >
                    {formatCurrency(selectedInvoice.total)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {selectedInvoice.status === "pending" && (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      updateInvoiceStatus(selectedInvoice.id, "paid");
                      setSelectedInvoice(null);
                    }}
                    style={{ background: "oklch(0.35 0.12 160)" }}
                  >
                    <CheckCircle2 size={14} /> Mark as Paid
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => handlePrint(selectedInvoice)}
                >
                  <Printer size={14} /> Print Invoice
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Modal */}
      <Dialog open={!!editInvoice} onOpenChange={() => setEditInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {editInvoice && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Edit Invoice {editInvoice.invoiceNumber}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={editInvoice.status}
                    onValueChange={status =>
                      setEditInvoice({
                        ...editInvoice,
                        status: status as Invoice["status"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Method</label>
                  <Select
                    value={editInvoice.paymentMethod}
                    onValueChange={method =>
                      setEditInvoice({
                        ...editInvoice,
                        paymentMethod: method as Invoice["paymentMethod"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="eftpos">EFTPOS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditInvoice(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    updateInvoice(editInvoice.id, editInvoice);
                    setEditInvoice(null);
                  }}
                  style={{ background: "oklch(0.28 0.09 250)" }}
                >
                  Save Changes
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!showDeleteConfirm}
        onOpenChange={() => setShowDeleteConfirm(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete invoice{" "}
            <strong>{showDeleteConfirm?.invoiceNumber}</strong>? This action
            cannot be undone and stock will be restored.
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                showDeleteConfirm && handleDelete(showDeleteConfirm)
              }
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
