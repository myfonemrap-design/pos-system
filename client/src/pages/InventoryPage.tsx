/**
 * InventoryPage — Repair parts & accessories inventory management
 * Features: Search by name/SKU/UPC, add/edit/delete, low stock alerts, category filter
 * Design: Clean table with action buttons, modal forms
 */
import { useState, useMemo } from "react";
import { useData, Product, ProductCategory } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Search, Edit2, Trash2, AlertTriangle, Package,
  Filter, Download, Barcode
} from "lucide-react";
import { toast } from "sonner";

const CATEGORIES: ProductCategory[] = [
  "Phone Screens", "Batteries", "Parts", "Cases", "Tempered Glass", "Chargers", "Other"
];

const REPAIR_CATEGORIES: ProductCategory[] = ["Phone Screens", "Batteries", "Parts", "Other"];
const ACCESSORY_CATEGORIES: ProductCategory[] = ["Cases", "Tempered Glass", "Chargers", "Other"];

function formatCurrency(n: number) {
  return `$${n.toFixed(2)}`;
}

const EMPTY_FORM = {
  name: "", sku: "", upc: "", category: "Phone Screens" as ProductCategory,
  costPrice: 0, sellingPrice: 0, quantity: 0, supplier: "", type: "repair" as "repair" | "accessory",
};

export default function InventoryPage() {
  const { products, addProduct, updateProduct, deleteProduct } = useData();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "repair" | "accessory">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    let list = products;
    if (tab !== "all") list = list.filter((p) => p.type === tab);
    if (categoryFilter !== "all") list = list.filter((p) => p.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.upc && p.upc.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, tab, categoryFilter, search]);

  const openAdd = () => {
    setEditProduct(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name, sku: p.sku, upc: p.upc, category: p.category,
      costPrice: p.costPrice, sellingPrice: p.sellingPrice,
      quantity: p.quantity, supplier: p.supplier, type: p.type,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name) {
      toast.error("Product name is required");
      return;
    }
    if (editProduct) {
      updateProduct(editProduct.id, form);
    } else {
      addProduct(form);
    }
    setShowModal(false);
  };

  const handleDelete = (p: Product) => {
    deleteProduct(p.id);
    setShowDeleteConfirm(null);
  };

  const lowStockCount = products.filter((p) => p.quantity <= 3).length;

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">{products.length} products · {lowStockCount > 0 && <span className="text-amber-600 font-medium">{lowStockCount} low stock</span>}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download size={14} /> Export
          </Button>
          <Button size="sm" className="gap-1.5" onClick={openAdd} style={{ background: "oklch(0.28 0.09 250)" }}>
            <Plus size={14} /> Add Product
          </Button>
        </div>
      </div>

      {/* Low stock banner */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{lowStockCount} product{lowStockCount > 1 ? "s" : ""}</strong> are running low on stock (3 or fewer units remaining).
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, or UPC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="h-9">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="repair">Repair Parts</TabsTrigger>
            <TabsTrigger value="accessory">Accessories</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44 h-9">
            <Filter size={13} className="mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="text-left">Product</th>
                <th className="text-left">SKU / UPC</th>
                <th className="text-left">Category</th>
                <th className="text-right">Cost</th>
                <th className="text-right">Price</th>
                <th className="text-center">Qty</th>
                <th className="text-left">Supplier</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No products found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="group">
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: p.type === "repair" ? "oklch(0.28 0.09 250)" : "oklch(0.35 0.12 160)" }}>
                          {p.type === "repair" ? "R" : "A"}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.type === "repair" ? "Repair Part" : "Accessory"}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="text-xs font-mono font-medium">{p.sku}</p>
                        <p className="text-xs font-mono text-muted-foreground">{p.upc}</p>
                      </div>
                    </td>
                    <td>
                      <span className="badge-info">{p.category}</span>
                    </td>
                    <td className="text-right font-mono text-sm text-muted-foreground">{formatCurrency(p.costPrice)}</td>
                    <td className="text-right font-mono text-sm font-semibold">{formatCurrency(p.sellingPrice)}</td>
                    <td className="text-center">
                      <span className={
                        p.quantity === 0 ? "badge-danger" :
                        p.quantity <= 3 ? "badge-warning" :
                        "badge-success"
                      }>
                        {p.quantity}
                      </span>
                    </td>
                    <td className="text-sm text-muted-foreground">{p.supplier}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(p)}
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
          Showing {filtered.length} of {products.length} products
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Product Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. iPhone 14 Screen (OLED)" />
            </div>
            <div className="space-y-1.5">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. SCR-IP14-001 (optional)" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Barcode size={13} /> UPC / Barcode</Label>
              <Input value={form.upc} onChange={(e) => setForm({ ...form, upc: e.target.value })} placeholder="e.g. 123456789001 (optional)" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "repair" | "accessory" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="repair">Repair Part</SelectItem>
                  <SelectItem value="accessory">Accessory</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ProductCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(form.type === "repair" ? REPAIR_CATEGORIES : ACCESSORY_CATEGORIES).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cost Price ($)</Label>
              <Input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: parseFloat(e.target.value) || 0 })} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Selling Price ($)</Label>
              <Input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: parseFloat(e.target.value) || 0 })} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="e.g. TechParts AU" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} style={{ background: "oklch(0.28 0.09 250)" }}>
              {editProduct ? "Save Changes" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{showDeleteConfirm?.name}</strong>? This action cannot be undone.
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
