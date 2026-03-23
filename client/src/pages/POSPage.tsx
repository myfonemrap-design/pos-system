import { useState, useRef, useCallback } from "react";
import { nanoid } from "nanoid";
import { useData, Product, ProductCategory } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Barcode,
  Plus,
  Minus,
  Trash2,
  User,
  Tag,
  CreditCard,
  DollarSign,
  Receipt,
  ShoppingCart,
  X,
  CheckCircle2,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORIES: Array<{ label: string; value: string; color: string }> = [
  { label: "All", value: "all", color: "oklch(0.55 0.2 250)" },
  { label: "Screens", value: "Phone Screens", color: "oklch(0.38 0.14 300)" },
  { label: "Batteries", value: "Batteries", color: "oklch(0.35 0.12 160)" },
  { label: "Parts", value: "Parts", color: "oklch(0.5 0.15 55)" },
  { label: "Cases", value: "Cases", color: "oklch(0.45 0.18 25)" },
  { label: "Glass", value: "Tempered Glass", color: "oklch(0.4 0.15 200)" },
  { label: "Chargers", value: "Chargers", color: "oklch(0.42 0.12 130)" },
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(n);
}

export default function POSPage() {
  const {
    products,
    customers,
    cart,
    selectedCustomer,
    cartDiscount,
    addToCart,
    removeFromCart,
    updateCartQty,
    updateCartPrice,
    clearCart,
    setSelectedCustomer,
    setCartDiscount,
    getCartTotals,
    addInvoice,
    addCustomer,
  } = useData();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "card" | "eftpos"
  >("card");
  const [cashTendered, setCashTendered] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastInvoiceNum, setLastInvoiceNum] = useState("");
  const barcodeRef = useRef<HTMLInputElement>(null);

  const totals = getCartTotals();

  const filteredProducts = products.filter(p => {
    const matchCat = activeCategory === "all" || p.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.upc.includes(q);
    return matchCat && matchSearch && p.quantity > 0;
  });

  const filteredCustomers = customers.filter(c => {
    const q = customerSearch.toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  const handleBarcodeSearch = useCallback(() => {
    const q = barcodeInput.trim();
    if (!q) return;
    const found = products.find(p => p.upc === q || p.sku === q);
    if (found) {
      addToCart(found);
      setBarcodeInput("");
    } else {
      toast.error(`No product found for: ${q}`);
    }
  }, [barcodeInput, products, addToCart]);

  const handleBarcodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleBarcodeSearch();
  };

  const handleProcessPayment = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    const items = cart.map(c => ({
      id: nanoid(),
      productId: c.product.id,
      productName: c.product.name,
      sku: c.product.sku,
      quantity: c.quantity,
      unitPrice: c.customPrice ?? c.product.sellingPrice,
      costPrice: c.product.costPrice,
      total: (c.customPrice ?? c.product.sellingPrice) * c.quantity,
    }));
    const inv = await addInvoice({
      customerId: selectedCustomer?.id ?? null,
      customerName: selectedCustomer?.name ?? "Walk-in Customer",
      items,
      subtotal: totals.subtotal,
      gst: totals.gst,
      discount: totals.discount,
      total: totals.total,
      status: "paid",
      paymentMethod,
    });
    setLastInvoiceNum(inv.invoiceNumber);
    clearCart();
    setShowPaymentModal(false);
    setShowSuccess(true);
  };

  const cashChange = parseFloat(cashTendered || "0") - totals.total;

  return (
    <div className="flex gap-4 h-[calc(100vh-128px)] animate-fade-in-up">
      <div className="w-[380px] flex-shrink-0 flex flex-col bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div
          className="px-4 py-3 border-b border-border flex items-center justify-between"
          style={{ background: "oklch(0.18 0.06 250)" }}
        >
          <div className="flex items-center gap-2 text-white">
            <ShoppingCart size={16} />
            <span className="font-semibold text-sm">Current Order</span>
            {cart.length > 0 && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: "oklch(0.55 0.2 250)", color: "white" }}
              >
                {cart.reduce((s, c) => s + c.quantity, 0)}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-red-300 hover:text-red-200 transition-colors flex items-center gap-1"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        <div
          className="flex items-center gap-2 px-4 py-2.5 border-b border-border cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setShowCustomerModal(true)}
        >
          <User size={14} className="text-muted-foreground flex-shrink-0" />
          <span className="text-sm flex-1 truncate">
            {selectedCustomer ? (
              selectedCustomer.name
            ) : (
              <span className="text-muted-foreground">Walk-in Customer</span>
            )}
          </span>
          <button
            onClick={e => {
              e.stopPropagation();
              setShowNewCustomerModal(true);
            }}
            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <Plus size={11} /> New
          </button>
          {selectedCustomer && (
            <button
              onClick={e => {
                e.stopPropagation();
                setSelectedCustomer(null);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
              <ShoppingCart size={36} className="mb-3 opacity-20" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs mt-1 opacity-60">
                Add products from the right panel
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {cart.map(({ product, quantity, customPrice }) => {
                const unitPrice = customPrice ?? product.sellingPrice;
                return (
                  <div
                    key={product.id}
                    className="px-4 py-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {product.sku}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(product.id)}
                        className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            updateCartQty(product.id, quantity - 1)
                          }
                          className="w-6 h-6 rounded flex items-center justify-center border border-border hover:bg-muted transition-colors"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="text-sm font-medium w-8 text-center">
                          {quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateCartQty(product.id, quantity + 1)
                          }
                          className="w-6 h-6 rounded flex items-center justify-center border border-border hover:bg-muted transition-colors"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            $
                          </span>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={Math.round(unitPrice)}
                            onChange={e =>
                              updateCartPrice(
                                product.id,
                                Math.round(parseFloat(e.target.value) || 0)
                              )
                            }
                            className="w-20 h-6 text-sm font-mono text-right border border-border rounded px-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {formatCurrency(unitPrice * quantity)} total
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-border">
          <div className="flex items-center gap-2">
            <Tag size={13} className="text-muted-foreground flex-shrink-0" />
            <Label className="text-xs text-muted-foreground">
              Discount ($)
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={cartDiscount || ""}
              onChange={e => setCartDiscount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="h-7 text-xs font-mono ml-auto w-24"
            />
          </div>
        </div>

        <div
          className="px-4 py-3 border-t border-border space-y-1.5"
          style={{ background: "oklch(0.975 0.003 250)" }}
        >
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discount</span>
              <span className="font-mono text-green-600">
                -{formatCurrency(totals.discount)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold pt-1.5 border-t border-border">
            <span>Total</span>
            <span
              className="font-mono"
              style={{ color: "oklch(0.28 0.09 250)" }}
            >
              {formatCurrency(totals.total)}
            </span>
          </div>
        </div>

        <div className="p-3 border-t border-border space-y-2">
          <Button
            className="w-full gap-2 h-10 font-semibold"
            onClick={handleProcessPayment}
            disabled={cart.length === 0}
            style={{ background: "oklch(0.35 0.12 160)" }}
          >
            <CreditCard size={16} /> Process Payment
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2 h-9 text-sm"
            disabled={cart.length === 0}
            onClick={() =>
              toast.info("Print receipt feature — connect to printer")
            }
          >
            <Receipt size={14} /> Create Invoice
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search products by name, SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <div className="relative w-52">
            <Barcode
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              ref={barcodeRef}
              placeholder="Scan barcode..."
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeKeyDown}
              className="pl-9 h-10 font-mono text-sm"
            />
          </div>
          <Button
            onClick={handleBarcodeSearch}
            variant="outline"
            className="h-10 px-3"
          >
            <Barcode size={15} />
          </Button>
        </div>

        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {CATEGORIES.map(({ label, value, color }) => (
            <button
              key={value}
              onClick={() => setActiveCategory(value)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150"
              style={{
                background:
                  activeCategory === value ? color : "oklch(0.94 0.005 250)",
                color:
                  activeCategory === value ? "white" : "oklch(0.52 0.02 250)",
                border: `1px solid ${activeCategory === value ? color : "oklch(0.88 0.008 250)"}`,
                boxShadow:
                  activeCategory === value ? `0 2px 8px ${color}40` : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Search size={32} className="mb-2 opacity-20" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map(p => (
                <ProductTile key={p.id} product={p} onAdd={addToCart} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search customers..."
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
              className="pl-9 h-9"
              autoFocus
            />
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            <button
              className="w-full text-left px-3 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
              onClick={() => {
                setSelectedCustomer(null);
                setShowCustomerModal(false);
                setCustomerSearch("");
              }}
            >
              <span className="font-medium">Walk-in Customer</span>
              <p className="text-xs text-muted-foreground">
                No account required
              </p>
            </button>
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No customers found
              </div>
            ) : (
              filteredCustomers.map(c => (
                <button
                  key={c.id}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
                  onClick={() => {
                    setSelectedCustomer(c);
                    setShowCustomerModal(false);
                    setCustomerSearch("");
                  }}
                >
                  <span className="font-medium">{c.name}</span>
                  <p className="text-xs text-muted-foreground">
                    {c.phone}
                    {c.email && ` · ${c.email}`}
                  </p>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showNewCustomerModal}
        onOpenChange={setShowNewCustomerModal}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="new-customer-name" className="text-xs">
                Name *
              </Label>
              <Input
                id="new-customer-name"
                value={newCustomerName}
                onChange={e => setNewCustomerName(e.target.value)}
                placeholder="Customer name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="new-customer-phone" className="text-xs">
                Phone
              </Label>
              <Input
                id="new-customer-phone"
                value={newCustomerPhone}
                onChange={e => setNewCustomerPhone(e.target.value)}
                placeholder="Phone number"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="new-customer-email" className="text-xs">
                Email
              </Label>
              <Input
                id="new-customer-email"
                type="email"
                value={newCustomerEmail}
                onChange={e => setNewCustomerEmail(e.target.value)}
                placeholder="Email address"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowNewCustomerModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!newCustomerName.trim()) {
                  toast.error("Customer name is required");
                  return;
                }
                try {
                  await addCustomer({
                    name: newCustomerName.trim(),
                    phone: newCustomerPhone.trim(),
                    email: newCustomerEmail.trim(),
                  });
                  toast.success("Customer added successfully");
                  setShowNewCustomerModal(false);
                  setNewCustomerName("");
                  setNewCustomerPhone("");
                  setNewCustomerEmail("");
                } catch (err) {
                  console.error("Failed to add customer:", err);
                  toast.error("Failed to add customer");
                }
              }}
            >
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className="rounded-lg p-4 space-y-2"
              style={{ background: "oklch(0.975 0.003 250)" }}
            >
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">
                  {formatCurrency(totals.subtotal)}
                </span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-mono text-green-600">
                    -{formatCurrency(totals.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                <span>Total Due</span>
                <span
                  className="font-mono"
                  style={{ color: "oklch(0.28 0.09 250)" }}
                >
                  {formatCurrency(totals.total)}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["cash", "card", "eftpos"] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className="py-2 rounded-lg border text-sm font-medium capitalize transition-all"
                    style={{
                      background:
                        paymentMethod === m
                          ? "oklch(0.28 0.09 250)"
                          : "transparent",
                      color:
                        paymentMethod === m ? "white" : "oklch(0.52 0.02 250)",
                      borderColor:
                        paymentMethod === m
                          ? "oklch(0.28 0.09 250)"
                          : "oklch(0.88 0.008 250)",
                    }}
                  >
                    {m === "cash" && (
                      <>
                        <DollarSign size={13} className="inline mr-1" />
                        Cash
                      </>
                    )}
                    {m === "card" && (
                      <>
                        <CreditCard size={13} className="inline mr-1" />
                        Card
                      </>
                    )}
                    {m === "eftpos" && "EFTPOS"}
                  </button>
                ))}
              </div>
            </div>
            {paymentMethod === "cash" && (
              <div className="space-y-1.5">
                <Label>Cash Tendered ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashTendered}
                  onChange={e => setCashTendered(e.target.value)}
                  placeholder="0.00"
                  className="font-mono"
                />
                {parseFloat(cashTendered) >= totals.total && (
                  <p className="text-sm font-medium text-green-600">
                    Change: {formatCurrency(cashChange)}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPayment}
              style={{ background: "oklch(0.35 0.12 160)" }}
              disabled={
                paymentMethod === "cash" &&
                parseFloat(cashTendered || "0") < totals.total
              }
            >
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex flex-col items-center py-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: "oklch(0.9 0.08 160)" }}
            >
              <CheckCircle2
                size={32}
                style={{ color: "oklch(0.35 0.12 160)" }}
              />
            </div>
            <h2 className="text-xl font-bold mb-1">Payment Successful!</h2>
            <p className="text-sm text-muted-foreground mb-1">
              Invoice created
            </p>
            <p
              className="text-base font-mono font-semibold"
              style={{ color: "oklch(0.28 0.09 250)" }}
            >
              {lastInvoiceNum}
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => {
                window.open(
                  `/api/invoices/number/${lastInvoiceNum}/print`,
                  "_blank"
                );
              }}
            >
              <Printer size={14} /> Print Invoice
            </Button>
            <Button
              className="flex-1"
              onClick={() => setShowSuccess(false)}
              style={{ background: "oklch(0.28 0.09 250)" }}
            >
              New Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductTile({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (p: Product) => void;
}) {
  const categoryColor =
    CATEGORIES.find(c => c.value === product.category)?.color ??
    "oklch(0.55 0.2 250)";
  return (
    <div
      className="bg-card border border-border rounded-lg p-3 cursor-pointer transition-all duration-150 hover:shadow-md active:scale-95 select-none"
      onClick={() => onAdd(product)}
      style={{ borderColor: "oklch(0.88 0.008 250)" }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = categoryColor;
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          `0 4px 12px ${categoryColor}25`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor =
          "oklch(0.88 0.008 250)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold mb-2"
        style={{ background: categoryColor }}
      >
        {product.name.charAt(0)}
      </div>
      <p className="text-xs font-semibold leading-tight mb-1 line-clamp-2">
        {product.name}
      </p>
      <p className="text-xs text-muted-foreground font-mono mb-2">
        {product.sku}
      </p>
      <div className="flex items-center justify-between">
        <span
          className="text-sm font-bold font-mono"
          style={{ color: "oklch(0.28 0.09 250)" }}
        >
          ${product.sellingPrice.toFixed(2)}
        </span>
        <span
          className={`text-xs font-mono ${product.quantity <= 3 ? "text-amber-600" : "text-muted-foreground"}`}
        >
          {product.quantity}
        </span>
      </div>
    </div>
  );
}
