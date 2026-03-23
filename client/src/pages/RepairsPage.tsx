/**
 * RepairsPage — Repair ticket management
 * Features: Create/edit repair tickets, track status (Pending/In Progress/Completed), add parts
 * Design: Clean Professional Blue / Enterprise SaaS
 */
import { useState, useMemo } from "react";
import { useData, Repair, RepairStatus, DeviceType, RepairPart } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Search, Plus, Edit2, Trash2, Wrench, Smartphone, Tablet,
  Laptop, Clock, CheckCircle2, AlertCircle, Filter, X
} from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<RepairStatus, string> = {
  "Pending": "oklch(0.5 0.15 55)",
  "In Progress": "oklch(0.55 0.2 250)",
  "Completed": "oklch(0.35 0.12 160)",
};

const DEVICE_ICONS: Record<DeviceType, React.ReactNode> = {
  "Phone": <Smartphone size={16} />,
  "Tablet": <Tablet size={16} />,
  "Laptop": <Laptop size={16} />,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function formatCurrency(n: number) {
  return `$${n.toFixed(2)}`;
}

const EMPTY_FORM = {
  customerId: null as string | null,
  customerName: "",
  deviceType: "Phone" as DeviceType,
  deviceModel: "",
  issueDescription: "",
  parts: [] as RepairPart[],
  laborCost: 0,
  status: "Pending" as RepairStatus,
  notes: "",
};

export default function RepairsPage() {
  const { repairs, products, customers, addRepair, updateRepair, deleteRepair } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editRepair, setEditRepair] = useState<Repair | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Repair | null>(null);
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [selectedPartId, setSelectedPartId] = useState("");
  const [partQty, setPartQty] = useState(1);

  const repairParts = products.filter((p) => p.type === "repair");

  const filtered = useMemo(() => {
    let list = [...repairs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.ticketNumber.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.deviceModel.toLowerCase().includes(q)
      );
    }
    return list;
  }, [repairs, statusFilter, search]);

  const stats = useMemo(() => ({
    pending: repairs.filter((r) => r.status === "Pending").length,
    inProgress: repairs.filter((r) => r.status === "In Progress").length,
    completed: repairs.filter((r) => r.status === "Completed").length,
  }), [repairs]);

  const openAdd = () => {
    setEditRepair(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (r: Repair) => {
    setEditRepair(r);
    setForm({
      customerId: r.customerId,
      customerName: r.customerName,
      deviceType: r.deviceType,
      deviceModel: r.deviceModel,
      issueDescription: r.issueDescription,
      parts: [...r.parts],
      laborCost: r.laborCost,
      status: r.status,
      notes: r.notes,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.customerName || !form.deviceModel || !form.issueDescription) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (editRepair) {
      updateRepair(editRepair.id, form);
    } else {
      addRepair(form);
    }
    setShowModal(false);
  };

  const handleDelete = (r: Repair) => {
    deleteRepair(r.id);
    setShowDeleteConfirm(null);
    if (selectedRepair?.id === r.id) setSelectedRepair(null);
  };

  const addPartToForm = () => {
    if (!selectedPartId) return;
    const part = repairParts.find((p) => p.id === selectedPartId);
    if (!part) return;
    const existing = form.parts.find((p) => p.productId === selectedPartId);
    if (existing) {
      setForm({
        ...form,
        parts: form.parts.map((p) =>
          p.productId === selectedPartId ? { ...p, quantity: p.quantity + partQty } : p
        ),
      });
    } else {
      setForm({
        ...form,
        parts: [...form.parts, { productId: part.id, name: part.name, quantity: partQty, price: part.sellingPrice }],
      });
    }
    setSelectedPartId("");
    setPartQty(1);
  };

  const removePartFromForm = (productId: string) => {
    setForm({ ...form, parts: form.parts.filter((p) => p.productId !== productId) });
  };

  const handleCustomerSelect = (customerId: string) => {
    if (customerId === "walkin") {
      setForm({ ...form, customerId: null, customerName: "Walk-in Customer" });
    } else {
      const c = customers.find((c) => c.id === customerId);
      if (c) setForm({ ...form, customerId: c.id, customerName: c.name });
    }
  };

  const partsTotal = form.parts.reduce((s, p) => s + p.price * p.quantity, 0);

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Repair Tickets</h1>
          <p className="page-subtitle">{repairs.length} total tickets</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openAdd} style={{ background: "oklch(0.28 0.09 250)" }}>
          <Plus size={14} /> New Repair Ticket
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending", value: stats.pending, icon: Clock, color: "oklch(0.5 0.15 55)", status: "Pending" },
          { label: "In Progress", value: stats.inProgress, icon: AlertCircle, color: "oklch(0.55 0.2 250)", status: "In Progress" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "oklch(0.35 0.12 160)", status: "Completed" },
        ].map(({ label, value, icon: Icon, color, status }) => (
          <div
            key={label}
            className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center gap-4 cursor-pointer transition-all hover:shadow-md"
            onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
            style={{ borderColor: statusFilter === status ? color : undefined }}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
              style={{ background: color }}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by ticket #, customer, device..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9">
            <Filter size={13} className="mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Repair Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
          <Wrench size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No repair tickets found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="bg-card rounded-xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedRepair(r)}
              style={{ borderLeftWidth: "4px", borderLeftColor: STATUS_COLORS[r.status] }}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-mono font-semibold" style={{ color: "oklch(0.28 0.09 250)" }}>
                      {r.ticketNumber}
                    </p>
                    <p className="font-semibold text-sm mt-0.5">{r.customerName}</p>
                  </div>
                  <span className={
                    r.status === "Completed" ? "badge-completed" :
                    r.status === "In Progress" ? "badge-in-progress" :
                    "badge-pending"
                  }>
                    {r.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <div className="text-muted-foreground">{DEVICE_ICONS[r.deviceType]}</div>
                  <p className="text-sm font-medium">{r.deviceModel}</p>
                  <span className="badge-info text-xs">{r.deviceType}</span>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{r.issueDescription}</p>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDate(r.createdAt)}</span>
                  <span>{r.parts.length} part{r.parts.length !== 1 ? "s" : ""} · Labor: {formatCurrency(r.laborCost)}</span>
                </div>
              </div>

              <div className="flex border-t border-border divide-x divide-border">
                <button
                  className="flex-1 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
                  onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                >
                  <Edit2 size={12} /> Edit
                </button>
                {r.status !== "Completed" && (
                  <button
                    className="flex-1 py-2 text-xs font-medium hover:bg-muted transition-colors flex items-center justify-center gap-1"
                    style={{ color: "oklch(0.35 0.12 160)" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const next: RepairStatus = r.status === "Pending" ? "In Progress" : "Completed";
                      updateRepair(r.id, { status: next });
                    }}
                  >
                    <CheckCircle2 size={12} />
                    {r.status === "Pending" ? "Start" : "Complete"}
                  </button>
                )}
                <button
                  className="flex-1 py-2 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                  onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(r); }}
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Repair Detail Modal */}
      <Dialog open={!!selectedRepair && !showModal} onOpenChange={() => setSelectedRepair(null)}>
        <DialogContent className="max-w-lg">
          {selectedRepair && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wrench size={18} />
                  {selectedRepair.ticketNumber}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-semibold">{selectedRepair.customerName}</p>
                  </div>
                  <span className={
                    selectedRepair.status === "Completed" ? "badge-completed" :
                    selectedRepair.status === "In Progress" ? "badge-in-progress" :
                    "badge-pending"
                  }>
                    {selectedRepair.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-3" style={{ background: "oklch(0.975 0.003 250)" }}>
                    <p className="text-xs text-muted-foreground">Device</p>
                    <p className="text-sm font-medium">{selectedRepair.deviceModel}</p>
                    <p className="text-xs text-muted-foreground">{selectedRepair.deviceType}</p>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: "oklch(0.975 0.003 250)" }}>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm font-medium">{formatDate(selectedRepair.createdAt)}</p>
                    <p className="text-xs text-muted-foreground">Updated {formatDate(selectedRepair.updatedAt)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Issue Description</p>
                  <p className="text-sm bg-muted/30 rounded-lg p-3">{selectedRepair.issueDescription}</p>
                </div>
                {selectedRepair.parts.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Parts Used</p>
                    <div className="space-y-1.5">
                      {selectedRepair.parts.map((p) => (
                        <div key={p.productId} className="flex justify-between text-sm">
                          <span>{p.name} × {p.quantity}</span>
                          <span className="font-mono">{formatCurrency(p.price * p.quantity)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm border-t border-border pt-1.5">
                        <span>Labor</span>
                        <span className="font-mono">{formatCurrency(selectedRepair.laborCost)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold">
                        <span>Total</span>
                        <span className="font-mono" style={{ color: "oklch(0.28 0.09 250)" }}>
                          {formatCurrency(selectedRepair.parts.reduce((s, p) => s + p.price * p.quantity, 0) + selectedRepair.laborCost)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {selectedRepair.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm bg-muted/30 rounded-lg p-3">{selectedRepair.notes}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setSelectedRepair(null); openEdit(selectedRepair); }}>
                  <Edit2 size={14} className="mr-1.5" /> Edit Ticket
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editRepair ? "Edit Repair Ticket" : "New Repair Ticket"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Customer *</Label>
                <Select
                  value={form.customerId ?? "walkin"}
                  onValueChange={handleCustomerSelect}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walkin">Walk-in Customer</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Customer Name *</Label>
                <Input
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="e.g. John Smith"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Device Type *</Label>
                <Select value={form.deviceType} onValueChange={(v) => setForm({ ...form, deviceType: v as DeviceType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Phone">Phone</SelectItem>
                    <SelectItem value="Tablet">Tablet</SelectItem>
                    <SelectItem value="Laptop">Laptop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Device Model *</Label>
                <Input
                  value={form.deviceModel}
                  onChange={(e) => setForm({ ...form, deviceModel: e.target.value })}
                  placeholder="e.g. iPhone 14 Pro"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Issue Description *</Label>
              <Textarea
                value={form.issueDescription}
                onChange={(e) => setForm({ ...form, issueDescription: e.target.value })}
                placeholder="Describe the issue in detail..."
                rows={3}
              />
            </div>

            {/* Parts */}
            <div className="space-y-2">
              <Label>Parts Used</Label>
              <div className="flex gap-2">
                <Select value={selectedPartId} onValueChange={setSelectedPartId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a part..." />
                  </SelectTrigger>
                  <SelectContent>
                    {repairParts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {formatCurrency(p.sellingPrice)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  value={partQty}
                  onChange={(e) => setPartQty(parseInt(e.target.value) || 1)}
                  className="w-20"
                />
                <Button type="button" variant="outline" onClick={addPartToForm}>
                  <Plus size={14} />
                </Button>
              </div>
              {form.parts.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  {form.parts.map((p) => (
                    <div key={p.productId} className="flex items-center justify-between px-3 py-2 border-b border-border last:border-0 text-sm">
                      <span>{p.name} × {p.quantity}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{formatCurrency(p.price * p.quantity)}</span>
                        <button onClick={() => removePartFromForm(p.productId)} className="text-red-400 hover:text-red-600">
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Labor Cost ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.laborCost}
                  onChange={(e) => setForm({ ...form, laborCost: parseFloat(e.target.value) || 0 })}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as RepairStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Internal notes..."
                rows={2}
              />
            </div>

            {/* Cost summary */}
            {(form.parts.length > 0 || form.laborCost > 0) && (
              <div className="rounded-lg p-3 text-sm space-y-1" style={{ background: "oklch(0.975 0.003 250)" }}>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parts</span>
                  <span className="font-mono">{formatCurrency(partsTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Labor</span>
                  <span className="font-mono">{formatCurrency(form.laborCost)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-border pt-1">
                  <span>Total</span>
                  <span className="font-mono" style={{ color: "oklch(0.28 0.09 250)" }}>
                    {formatCurrency(partsTotal + form.laborCost)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} style={{ background: "oklch(0.28 0.09 250)" }}>
              {editRepair ? "Save Changes" : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Repair Ticket</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete ticket <strong>{showDeleteConfirm?.ticketNumber}</strong>? This action cannot be undone.
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
