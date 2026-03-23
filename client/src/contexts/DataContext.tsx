/**
 * DataContext — Central data store for RepairPOS
 * Connects to MySQL database via REST API
 * Includes: Products, Customers, Invoices, Repairs, Cart
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import axios from "axios";
import { useAuth } from "./AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductCategory =
  | "Phone Screens"
  | "Batteries"
  | "Parts"
  | "Cases"
  | "Tempered Glass"
  | "Chargers"
  | "Other";

export interface Product {
  id: string;
  name: string;
  sku: string;
  upc: string;
  category: ProductCategory;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  supplier: string;
  type: "repair" | "accessory";
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string | null;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  gst: number;
  discount: number;
  total: number;
  status: "paid" | "pending" | "cancelled";
  paymentMethod: "cash" | "card" | "eftpos";
  createdAt: string;
}

export type RepairStatus = "Pending" | "In Progress" | "Completed";
export type DeviceType = "Phone" | "Tablet" | "Laptop";

export interface RepairPart {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Repair {
  id: string;
  ticketNumber: string;
  customerId: string | null;
  customerName: string;
  deviceType: DeviceType;
  deviceModel: string;
  issueDescription: string;
  parts: RepairPart[];
  laborCost: number;
  status: RepairStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  customPrice?: number;
}

// ─── API Response Transformations ────────────────────────────────────────────

function transformProductFromDb(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    name: row.name as string,
    sku: row.sku as string,
    upc: row.upc as string,
    category: row.category as ProductCategory,
    costPrice: Number(row.cost_price),
    sellingPrice: Number(row.selling_price),
    quantity: Number(row.quantity),
    supplier: row.supplier as string,
    type: row.type as "repair" | "accessory",
    createdAt: row.created_at as string,
  };
}

function transformProductToDb(
  product: Omit<Product, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  }
): Record<string, unknown> {
  return {
    ...(product.id && { id: product.id }),
    name: product.name,
    sku: product.sku,
    upc: product.upc,
    category: product.category,
    cost_price: product.costPrice,
    selling_price: product.sellingPrice,
    quantity: product.quantity,
    supplier: product.supplier,
    type: product.type,
    ...(product.createdAt && { created_at: product.createdAt }),
  };
}

function transformCustomerFromDb(row: Record<string, unknown>): Customer {
  return {
    id: row.id as string,
    name: row.name as string,
    phone: row.phone as string,
    email: row.email as string,
    createdAt: row.created_at as string,
  };
}

function transformInvoiceFromDb(row: Record<string, unknown>): Invoice {
  const rawItems = row.items as Array<Record<string, unknown>> | undefined;
  return {
    id: row.id as string,
    invoiceNumber: row.invoice_number as string,
    customerId: row.customer_id as string | null,
    customerName: row.customer_name as string,
    items: (rawItems || []).map(item => ({
      id: item.id as string,
      productId: item.product_id as string,
      productName: item.product_name as string,
      sku: item.sku as string,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      costPrice: Number(item.cost_price || 0),
      total: Number(item.total),
    })),
    subtotal: Number(row.subtotal),
    gst: Number(row.gst),
    discount: Number(row.discount),
    total: Number(row.total),
    status: row.status as Invoice["status"],
    paymentMethod: row.payment_method as Invoice["paymentMethod"],
    createdAt: row.created_at as string,
  };
}

function transformRepairFromDb(
  row: Record<string, unknown> & { parts?: RepairPart[] }
): Repair {
  return {
    id: row.id as string,
    ticketNumber: row.ticket_number as string,
    customerId: row.customer_id as string | null,
    customerName: row.customer_name as string,
    deviceType: row.device_type as DeviceType,
    deviceModel: row.device_model as string,
    issueDescription: row.issue_description as string,
    parts: (row.parts || []).map((part: unknown) => ({
      productId: (part as RepairPart).productId,
      name: (part as RepairPart).name,
      quantity: Number((part as RepairPart).quantity),
      price: Number((part as RepairPart).price),
    })),
    laborCost: Number(row.labor_cost),
    status: row.status as RepairStatus,
    notes: row.notes as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface DataContextType {
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  repairs: Repair[];
  cart: CartItem[];
  selectedCustomer: Customer | null;
  cartDiscount: number;
  loading: boolean;
  // Products
  addProduct: (p: Omit<Product, "id" | "createdAt">) => Promise<void>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  // Customers
  addCustomer: (c: Omit<Customer, "id" | "createdAt">) => Promise<void>;
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  // Invoices
  addInvoice: (
    inv: Omit<Invoice, "id" | "invoiceNumber" | "createdAt">
  ) => Promise<Invoice>;
  updateInvoiceStatus: (id: string, status: Invoice["status"]) => Promise<void>;
  updateInvoice: (
    id: string,
    inv: Partial<Omit<Invoice, "id" | "invoiceNumber" | "createdAt">>
  ) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  // Repairs
  addRepair: (
    r: Omit<Repair, "id" | "ticketNumber" | "createdAt" | "updatedAt">
  ) => Promise<void>;
  updateRepair: (id: string, r: Partial<Repair>) => Promise<void>;
  deleteRepair: (id: string) => Promise<void>;
  // Cart
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, qty: number) => void;
  updateCartPrice: (productId: string, price: number) => void;
  clearCart: () => void;
  setSelectedCustomer: (c: Customer | null) => void;
  setCartDiscount: (d: number) => void;
  getCartTotals: () => {
    subtotal: number;
    gst: number;
    discount: number;
    total: number;
  };
  // Refresh data
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { selectedStoreId, token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [cartDiscount, setCartDiscount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Axios interceptor to add store_id to requests
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(config => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    return () => axios.interceptors.request.eject(interceptor);
  }, [token]);

  // Fetch all data from API
  const refreshData = useCallback(async () => {
    if (!selectedStoreId) {
      setProducts([]);
      setCustomers([]);
      setInvoices([]);
      setRepairs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [productsRes, customersRes, invoicesRes, repairsRes] =
        await Promise.all([
          axios.get(`/api/products?store_id=${selectedStoreId}`),
          axios.get(`/api/customers?store_id=${selectedStoreId}`),
          axios.get(`/api/invoices?store_id=${selectedStoreId}`),
          axios.get(`/api/repairs?store_id=${selectedStoreId}`),
        ]);

      setProducts(productsRes.data.map(transformProductFromDb));
      setCustomers(customersRes.data.map(transformCustomerFromDb));
      setInvoices(invoicesRes.data.map(transformInvoiceFromDb));
      setRepairs(repairsRes.data.map(transformRepairFromDb));
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load data from database");
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Products
  const addProduct = useCallback(
    async (p: Omit<Product, "id" | "createdAt">) => {
      try {
        const productData = {
          id: nanoid(),
          ...p,
          createdAt: new Date().toISOString(),
        };
        await axios.post("/api/products", transformProductToDb(productData));
        await refreshData();
        toast.success(`Product "${p.name}" added successfully`);
      } catch (error) {
        console.error("Failed to add product:", error);
        toast.error("Failed to add product");
        throw error;
      }
    },
    [refreshData]
  );

  const updateProduct = useCallback(
    async (id: string, p: Partial<Product>) => {
      try {
        await axios.put(
          `/api/products/${id}`,
          transformProductToDb(p as Parameters<typeof transformProductToDb>[0])
        );
        await refreshData();
        toast.success("Product updated");
      } catch (error) {
        console.error("Failed to update product:", error);
        toast.error("Failed to update product");
        throw error;
      }
    },
    [refreshData]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      try {
        await axios.delete(`/api/products/${id}`);
        await refreshData();
        toast.success("Product deleted");
      } catch (error) {
        console.error("Failed to delete product:", error);
        toast.error("Failed to delete product");
        throw error;
      }
    },
    [refreshData]
  );

  // Customers
  const addCustomer = useCallback(
    async (c: Omit<Customer, "id" | "createdAt">) => {
      try {
        await axios.post("/api/customers", {
          id: nanoid(),
          ...c,
          created_at: new Date().toISOString(),
        });
        await refreshData();
        toast.success(`Customer "${c.name}" added`);
      } catch (error) {
        console.error("Failed to add customer:", error);
        toast.error("Failed to add customer");
        throw error;
      }
    },
    [refreshData]
  );

  const updateCustomer = useCallback(
    async (id: string, c: Partial<Customer>) => {
      try {
        await axios.put(`/api/customers/${id}`, c);
        await refreshData();
        toast.success("Customer updated");
      } catch (error) {
        console.error("Failed to update customer:", error);
        toast.error("Failed to update customer");
        throw error;
      }
    },
    [refreshData]
  );

  const deleteCustomer = useCallback(
    async (id: string) => {
      try {
        await axios.delete(`/api/customers/${id}`);
        await refreshData();
        toast.success("Customer deleted");
      } catch (error) {
        console.error("Failed to delete customer:", error);
        toast.error("Failed to delete customer");
        throw error;
      }
    },
    [refreshData]
  );

  // Invoices
  const addInvoice = useCallback(
    async (
      inv: Omit<Invoice, "id" | "invoiceNumber" | "createdAt">
    ): Promise<Invoice> => {
      try {
        const newInvoice: Invoice = {
          ...inv,
          id: nanoid(),
          invoiceNumber: "",
          createdAt: new Date().toISOString(),
        };

        const invoiceData = {
          invoice: {
            id: newInvoice.id,
            invoice_number: "",
            customer_id: newInvoice.customerId,
            customer_name: newInvoice.customerName,
            subtotal: newInvoice.subtotal,
            gst: newInvoice.gst,
            discount: newInvoice.discount,
            total: newInvoice.total,
            status: newInvoice.status,
            payment_method: newInvoice.paymentMethod,
          },
          items: newInvoice.items.map(item => ({
            id: item.id || nanoid(),
            product_id: item.productId,
            product_name: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            cost_price: item.costPrice,
            total: item.total,
          })),
        };

        const response = await axios.post("/api/invoices", invoiceData);
        const invoiceNumber = response.data.invoiceNumber;
        newInvoice.invoiceNumber = invoiceNumber;
        await refreshData();
        toast.success(`Invoice ${invoiceNumber} created`);
        return newInvoice;
      } catch (error) {
        console.error("Failed to create invoice:", error);
        toast.error("Failed to create invoice");
        throw error;
      }
    },
    [refreshData]
  );

  const updateInvoiceStatus = useCallback(
    async (id: string, status: Invoice["status"]) => {
      try {
        await axios.put(`/api/invoices/${id}/status`, { status });
        await refreshData();
        toast.success("Invoice status updated");
      } catch (error) {
        console.error("Failed to update invoice status:", error);
        toast.error("Failed to update invoice status");
        throw error;
      }
    },
    [refreshData]
  );

  const updateInvoice = useCallback(
    async (
      id: string,
      inv: Partial<Omit<Invoice, "id" | "invoiceNumber" | "createdAt">>
    ) => {
      try {
        await axios.put(`/api/invoices/${id}`, inv);
        await refreshData();
        toast.success("Invoice updated");
      } catch (error) {
        console.error("Failed to update invoice:", error);
        toast.error("Failed to update invoice");
        throw error;
      }
    },
    [refreshData]
  );

  const deleteInvoice = useCallback(
    async (id: string) => {
      try {
        await axios.delete(`/api/invoices/${id}`);
        await refreshData();
        toast.success("Invoice deleted");
      } catch (error) {
        console.error("Failed to delete invoice:", error);
        toast.error("Failed to delete invoice");
        throw error;
      }
    },
    [refreshData]
  );

  // Repairs
  const addRepair = useCallback(
    async (
      r: Omit<Repair, "id" | "ticketNumber" | "createdAt" | "updatedAt">
    ) => {
      try {
        const repairCount = repairs.length;
        const ticketNumber = `TKT-${String(repairCount + 1).padStart(3, "0")}`;
        const newRepair = {
          ...r,
          id: nanoid(),
          ticket_number: ticketNumber,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const repairData = {
          repair: {
            id: newRepair.id,
            ticket_number: newRepair.ticket_number,
            customer_id: newRepair.customerId,
            customer_name: newRepair.customerName,
            device_type: newRepair.deviceType,
            device_model: newRepair.deviceModel,
            issue_description: newRepair.issueDescription,
            labor_cost: newRepair.laborCost,
            status: newRepair.status,
            notes: newRepair.notes,
          },
          parts: newRepair.parts.map(part => ({
            id: nanoid(),
            product_id: part.productId,
            name: part.name,
            quantity: part.quantity,
            price: part.price,
          })),
        };

        await axios.post("/api/repairs", repairData);
        await refreshData();
        toast.success(`Repair ticket ${ticketNumber} created`);
      } catch (error) {
        console.error("Failed to create repair:", error);
        toast.error("Failed to create repair");
        throw error;
      }
    },
    [repairs.length, refreshData]
  );

  const updateRepair = useCallback(
    async (id: string, r: Partial<Repair>) => {
      try {
        await axios.put(`/api/repairs/${id}`, r);
        await refreshData();
        toast.success("Repair ticket updated");
      } catch (error) {
        console.error("Failed to update repair:", error);
        toast.error("Failed to update repair");
        throw error;
      }
    },
    [refreshData]
  );

  const deleteRepair = useCallback(
    async (id: string) => {
      try {
        await axios.delete(`/api/repairs/${id}`);
        await refreshData();
        toast.success("Repair ticket deleted");
      } catch (error) {
        console.error("Failed to delete repair:", error);
        toast.error("Failed to delete repair");
        throw error;
      }
    },
    [refreshData]
  );

  // Cart
  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) {
        return prev.map(c =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(`${product.name} added to cart`, { duration: 1500 });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(c => c.product.id !== productId));
  }, []);

  const updateCartQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(c => c.product.id !== productId));
    } else {
      setCart(prev =>
        prev.map(c =>
          c.product.id === productId ? { ...c, quantity: qty } : c
        )
      );
    }
  }, []);

  const updateCartPrice = useCallback((productId: string, price: number) => {
    if (price <= 0) {
      setCart(prev =>
        prev.map(c =>
          c.product.id === productId ? { ...c, customPrice: undefined } : c
        )
      );
    } else {
      setCart(prev =>
        prev.map(c =>
          c.product.id === productId ? { ...c, customPrice: price } : c
        )
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setSelectedCustomer(null);
    setCartDiscount(0);
  }, []);

  const getCartTotals = useCallback(() => {
    const subtotal = cart.reduce(
      (sum, c) => sum + (c.customPrice ?? c.product.sellingPrice) * c.quantity,
      0
    );
    const discountAmt = cartDiscount;
    const total = Math.max(0, subtotal - discountAmt);
    return { subtotal, gst: 0, discount: discountAmt, total };
  }, [cart, cartDiscount]);

  return (
    <DataContext.Provider
      value={{
        products,
        customers,
        invoices,
        repairs,
        cart,
        selectedCustomer,
        cartDiscount,
        loading,
        addProduct,
        updateProduct,
        deleteProduct,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addInvoice,
        updateInvoiceStatus,
        updateInvoice,
        deleteInvoice,
        addRepair,
        updateRepair,
        deleteRepair,
        addToCart,
        removeFromCart,
        updateCartQty,
        updateCartPrice,
        clearCart,
        setSelectedCustomer,
        setCartDiscount,
        getCartTotals,
        refreshData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
