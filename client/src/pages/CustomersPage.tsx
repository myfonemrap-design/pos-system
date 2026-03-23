/**
 * CustomersPage — Customer management with invoice history
 * Features: Add/edit/delete customers, view linked invoices, search
 * Design: Clean Professional Blue / Enterprise SaaS
 */
import { useState, useMemo } from "react";
import { useData, Customer } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Search, Plus, Edit2, Trash2, Users, Phone, Mail,
  FileText, ArrowUpRight
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
}

const EMPTY_FORM = { name: "", phone: "", email: "" };

export default function CustomersPage() {
  const { customers, invoices, addCustomer, updateCustomer, deleteCustomer } = useData();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const customerInvoices = useMemo(() => {
    if (!selectedCustomer) return [];
    return invoices
      .filter((i) => i.customerId === selectedCustomer.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [invoices, selectedCustomer]);

  const customerStats = useMemo(() => {
    if (!selectedCustomer) return null;
    const invs = invoices.filter((i) => i.customerId === selectedCustomer.id && i.status === "paid");
    return {
      totalSpent: invs.reduce((s, i) => s + i.total, 0),
      invoiceCount: invs.length,
    };
  }, [invoices, selectedCustomer]);

  const openAdd = () => {
    setEditCustomer(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditCustomer(c);
    setForm({ name: c.name, phone: c.phone, email: c.email });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name) {
      toast.error("Customer name is required");
      return;
    }
    if (editCustomer) {
      updateCustomer(editCustomer.id, form);
    } else {
      addCustomer(form);
    }
    setShowModal(false);
  };

  const handleDelete = (c: Customer) => {
    deleteCustomer(c.id);
    setShowDeleteConfirm(null);
    if (selectedCustomer?.id === c.id) setSelectedCustomer(null);
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">{customers.length} registered customers</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openAdd} style={{ background: "oklch(0.28 0.09 250)" }}>
          <Plus size={14} /> Add Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Customer List */}
        <div className="xl:col-span-2 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Table */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th className="text-left">Customer</th>
                    <th className="text-left">Phone</th>
                    <th className="text-left">Email</th>
                    <th className="text-left">Member Since</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-muted-foreground">
                        <Users size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No customers found</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => {
                      const isSelected = selectedCustomer?.id === c.id;
                      return (
                        <tr
                          key={c.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedCustomer(isSelected ? null : c)}
                          style={{ background: isSelected ? "oklch(0.94 0.01 250)" : undefined }}
                        >
                          <td>
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ background: "oklch(0.55 0.2 250)" }}
                              >
                                {c.name.charAt(0)}
                              </div>
                              <span className="text-sm font-medium">{c.name}</span>
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Phone size={12} />
                              {c.phone}
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Mail size={12} />
                              {c.email}
                            </div>
                          </td>
                          <td className="text-sm text-muted-foreground">{formatDate(c.createdAt)}</td>
                          <td>
                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => openEdit(c)}
                                className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(c)}
                                className="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Customer Detail Panel */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {!selectedCustomer ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground p-6">
              <Users size={36} className="mb-3 opacity-20" />
              <p className="text-sm text-center">Select a customer to view their details and invoice history</p>
            </div>
          ) : (
            <div>
              {/* Customer info */}
              <div className="p-5 border-b border-border" style={{ background: "oklch(0.18 0.06 250)" }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
                    style={{ background: "oklch(0.55 0.2 250)" }}>
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{selectedCustomer.name}</p>
                    <p className="text-xs" style={{ color: "oklch(0.6 0.04 250)" }}>
                      Member since {formatDate(selectedCustomer.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.75 0.03 250)" }}>
                    <Phone size={13} /> {selectedCustomer.phone}
                  </div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: "oklch(0.75 0.03 250)" }}>
                    <Mail size={13} /> {selectedCustomer.email}
                  </div>
                </div>
              </div>

              {/* Stats */}
              {customerStats && (
                <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
                  <div className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Total Spent</p>
                    <p className="text-lg font-bold font-mono" style={{ color: "oklch(0.28 0.09 250)" }}>
                      {formatCurrency(customerStats.totalSpent)}
                    </p>
                  </div>
                  <div className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Invoices</p>
                    <p className="text-lg font-bold" style={{ color: "oklch(0.28 0.09 250)" }}>
                      {customerStats.invoiceCount}
                    </p>
                  </div>
                </div>
              )}

              {/* Invoice history */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold">Invoice History</p>
                  <Link href="/invoices">
                    <span className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer">
                      View all <ArrowUpRight size={11} />
                    </span>
                  </Link>
                </div>
                {customerInvoices.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No invoices yet</p>
                ) : (
                  <div className="space-y-2">
                    {customerInvoices.slice(0, 5).map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="text-xs font-mono font-semibold" style={{ color: "oklch(0.28 0.09 250)" }}>
                            {inv.invoiceNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(inv.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono font-semibold">{formatCurrency(inv.total)}</p>
                          <span className={inv.status === "paid" ? "badge-success" : "badge-warning"}>
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editCustomer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Smith" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. 0412 345 678" />
            </div>
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="e.g. john@email.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} style={{ background: "oklch(0.28 0.09 250)" }}>
              {editCustomer ? "Save Changes" : "Add Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{showDeleteConfirm?.name}</strong>? Their invoice history will remain but will show as "Walk-in Customer".
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
