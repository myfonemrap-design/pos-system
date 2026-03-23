/**
 * DashboardPage — Overview with stats, charts, recent transactions
 * Design: Gradient stat cards + Recharts area/bar charts
 * Data: Derived from DataContext (invoices, products, repairs, customers)
 */
import { useMemo, useState } from "react";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Wrench,
  ArrowUpRight,
  Wallet,
  CreditCard,
  Banknote,
} from "lucide-react";
import { Link } from "wouter";
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
  });
}

const WEEKLY_SALES = [
  { day: "Mon", sales: 320, orders: 8 },
  { day: "Tue", sales: 480, orders: 12 },
  { day: "Wed", sales: 290, orders: 7 },
  { day: "Thu", sales: 620, orders: 15 },
  { day: "Fri", sales: 750, orders: 19 },
  { day: "Sat", sales: 890, orders: 22 },
  { day: "Sun", sales: 410, orders: 10 },
];

const CATEGORY_COLORS = [
  "oklch(0.55 0.2 250)",
  "oklch(0.65 0.18 160)",
  "oklch(0.7 0.18 55)",
  "oklch(0.6 0.2 300)",
  "oklch(0.65 0.22 25)",
  "oklch(0.55 0.15 200)",
];

export default function DashboardPage() {
  const { invoices, products, repairs, customers } = useData();
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    type: "all",
  });

  const dateFilteredInvoices = useMemo(
    () => filterByDateRange(invoices, dateFilter),
    [invoices, dateFilter]
  );

  const stats = useMemo(() => {
    const paidInvoices = dateFilteredInvoices.filter(i => i.status === "paid");

    const totalRevenue = paidInvoices.reduce((sum, i) => sum + i.total, 0);

    const totalOrders = paidInvoices.length;

    const cashRevenue = paidInvoices
      .filter(i => i.paymentMethod === "cash")
      .reduce((sum, i) => sum + i.total, 0);

    const cardRevenue = paidInvoices
      .filter(i => i.paymentMethod === "card" || i.paymentMethod === "eftpos")
      .reduce((sum, i) => sum + i.total, 0);

    const cogs = paidInvoices.reduce((sum, invoice) => {
      return (
        sum +
        invoice.items.reduce((itemSum, item) => {
          return itemSum + item.quantity * item.costPrice;
        }, 0)
      );
    }, 0);

    const netProfit = totalRevenue - cogs;

    const lowStock = products.filter(p => p.quantity <= 3).length;
    const pendingRepairs = repairs.filter(r => r.status !== "Completed").length;
    return {
      totalRevenue,
      totalOrders,
      cashRevenue,
      cardRevenue,
      cogs,
      netProfit,
      lowStock,
      pendingRepairs,
    };
  }, [dateFilteredInvoices, products, repairs]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach(p => {
      map[p.category] = (map[p.category] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [products]);

  const recentInvoices = useMemo(
    () =>
      [...dateFilteredInvoices]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5),
    [dateFilteredInvoices]
  );

  const lowStockProducts = useMemo(
    () => products.filter(p => p.quantity <= 3).slice(0, 5),
    [products]
  );

  const salesChartData = useMemo(() => {
    if (dateFilteredInvoices.length === 0) return [];
    const map: Record<string, number> = {};
    dateFilteredInvoices.forEach(inv => {
      const date = new Date(inv.createdAt);
      const key = date.toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
      });
      map[key] = (map[key] || 0) + inv.total;
    });
    return Object.entries(map).map(([day, sales]) => ({
      day,
      sales,
      orders: 1,
    }));
  }, [dateFilteredInvoices]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {user?.name}. Here's what's happening today.
          </p>
          <div className="mt-3">
            <DateFilter value={dateFilter} onChange={setDateFilter} />
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-AU", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Stat Cards Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Revenue",
            value: formatCurrency(stats.totalRevenue),
            icon: DollarSign,
            gradient: "stat-card-blue",
            sub: `${dateFilteredInvoices.length} total invoices`,
            delay: "stagger-1",
          },
          {
            label: "Total Orders",
            value: stats.totalOrders.toString(),
            icon: ShoppingCart,
            gradient: "stat-card-green",
            sub: `${dateFilteredInvoices.filter(i => i.status === "pending").length} pending`,
            delay: "stagger-2",
          },
          {
            label: "Cash Revenue",
            value: formatCurrency(stats.cashRevenue),
            icon: Banknote,
            gradient: "stat-card-emerald",
            sub: "Payment received",
            delay: "stagger-3",
          },
          {
            label: "Card Revenue",
            value: formatCurrency(stats.cardRevenue),
            icon: CreditCard,
            gradient: "stat-card-purple",
            sub: "Payment received",
            delay: "stagger-4",
          },
        ].map(({ label, value, icon: Icon, gradient, sub, delay }) => (
          <div
            key={label}
            className={`${gradient} rounded-xl p-5 text-white shadow-md animate-fade-in-up ${delay}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium opacity-80">{label}</p>
                <p
                  className="text-3xl font-bold mt-1 animate-count-up"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {value}
                </p>
                <p className="text-xs mt-2 opacity-70 flex items-center gap-1">
                  <TrendingUp size={11} /> {sub}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-white/20">
                <Icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stat Cards Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "COGS",
            value: formatCurrency(stats.cogs),
            icon: TrendingDown,
            gradient: "stat-card-red",
            sub: "Cost of goods sold",
            delay: "stagger-1",
          },
          {
            label: "Net Profit",
            value: formatCurrency(stats.netProfit),
            icon: Wallet,
            gradient: "stat-card-amber",
            sub: "Revenue - COGS",
            delay: "stagger-2",
          },
          {
            label: "Total Customers",
            value: customers.length.toString(),
            icon: Users,
            gradient: "stat-card-blue",
            sub: "Active accounts",
            delay: "stagger-3",
          },
          {
            label: "Open Repairs",
            value: stats.pendingRepairs.toString(),
            icon: Wrench,
            gradient: "stat-card-green",
            sub: `${repairs.filter(r => r.status === "Completed").length} completed`,
            delay: "stagger-4",
          },
        ].map(({ label, value, icon: Icon, gradient, sub, delay }) => (
          <div
            key={label}
            className={`${gradient} rounded-xl p-5 text-white shadow-md animate-fade-in-up ${delay}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium opacity-80">{label}</p>
                <p
                  className="text-3xl font-bold mt-1 animate-count-up"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {value}
                </p>
                <p className="text-xs mt-2 opacity-70 flex items-center gap-1">
                  <TrendingUp size={11} /> {sub}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-white/20">
                <Icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Sales Area Chart */}
          <div className="xl:col-span-2 bg-card rounded-xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2
                  className="text-base font-semibold"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Sales Chart
                </h2>
                <p className="text-xs text-muted-foreground">
                  Revenue over time
                </p>
              </div>
            </div>
            {salesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={salesChartData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="oklch(0.55 0.2 250)"
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="95%"
                        stopColor="oklch(0.55 0.2 250)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.92 0.004 250)"
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12, fill: "oklch(0.52 0.02 250)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "oklch(0.52 0.02 250)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `$${v}`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === "sales" ? formatCurrency(value) : value,
                      name === "sales" ? "Revenue" : "Orders",
                    ]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid oklch(0.88 0.008 250)",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="oklch(0.55 0.2 250)"
                    strokeWidth={2.5}
                    fill="url(#salesGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
                <DollarSign size={40} className="mb-2 opacity-30" />
                <p className="text-sm">No sales data for this period</p>
              </div>
            )}
          </div>

          {/* Category Pie Chart */}
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <div className="mb-4">
              <h2
                className="text-base font-semibold"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Inventory by Category
              </h2>
              <p className="text-xs text-muted-foreground">
                Product distribution
              </p>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, name: string) => [v, name]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid oklch(0.88 0.008 250)",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {categoryData.slice(0, 4).map((c, i) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        background: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                      }}
                    />
                    <span className="text-muted-foreground truncate max-w-[120px]">
                      {c.name}
                    </span>
                  </div>
                  <span className="font-medium">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2
              className="text-base font-semibold"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Recent Transactions
            </h2>
            <Link href="/invoices">
              <span className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer">
                View all <ArrowUpRight size={12} />
              </span>
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentInvoices.map(inv => (
              <div
                key={inv.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "oklch(0.55 0.2 250)" }}
                  >
                    {inv.customerName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{inv.customerName}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {inv.invoiceNumber} · {formatDate(inv.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold font-mono">
                    {formatCurrency(inv.total)}
                  </p>
                  <span
                    className={
                      inv.status === "paid"
                        ? "badge-success"
                        : inv.status === "pending"
                          ? "badge-warning"
                          : "badge-danger"
                    }
                  >
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <h2
                className="text-base font-semibold"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Low Stock Alert
              </h2>
            </div>
            <Link href="/inventory">
              <span className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer">
                Manage <ArrowUpRight size={12} />
              </span>
            </Link>
          </div>
          {lowStockProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package size={32} className="mb-2 opacity-30" />
              <p className="text-sm">All products are well stocked</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {lowStockProducts.map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {p.sku}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={
                        p.quantity === 0 ? "badge-danger" : "badge-warning"
                      }
                    >
                      {p.quantity === 0 ? "Out of stock" : `${p.quantity} left`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
