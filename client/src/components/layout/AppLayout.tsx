/**
 * AppLayout — Main application shell
 * Design: Dark navy sidebar (#0f2744) + light content area
 * Features: Collapsible sidebar, top header with user profile
 */
import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Users,
  Wrench,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell,
  Search,
  Store,
  UserCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData } from "@/contexts/DataContext";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/inventory", label: "Inventory", icon: Package },
  { path: "/pos", label: "Point of Sale", icon: ShoppingCart },
  { path: "/invoices", label: "Invoices", icon: FileText },
  { path: "/customers", label: "Customers", icon: Users },
  { path: "/repairs", label: "Repairs", icon: Wrench },
  { path: "/settings", label: "Settings", icon: Settings },
];

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663453495778/dMbiKHJ2Q6wcUfaeSgxuHX/repair-shop-icon-nNFFAMRbxyYHqX8entLyVP.webp";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout, stores, selectedStoreId, setSelectedStoreId } =
    useAuth();
  const { products, repairs } = useData();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const lowStockCount = products.filter(p => p.quantity <= 3).length;
  const pendingRepairs = repairs.filter(r => r.status === "Pending").length;

  const selectedStore = Array.isArray(stores)
    ? stores.find(s => s.id === selectedStoreId)
    : undefined;
  const showStoreSelector = user?.role === "Admin";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className="flex flex-col transition-all duration-300 ease-in-out flex-shrink-0"
        style={{
          width: sidebarOpen ? "240px" : "64px",
          background: "oklch(0.18 0.06 250)",
          borderRight: "1px solid oklch(0.28 0.06 250)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-4 py-4 border-b"
          style={{ borderColor: "oklch(0.28 0.06 250)", minHeight: "64px" }}
        >
          <img
            src={LOGO_URL}
            alt="PhonefixPOS"
            className="w-8 h-8 rounded-md flex-shrink-0"
          />
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p
                className="text-white font-bold text-sm leading-tight"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                PhonefixPOS
              </p>
              <p className="text-xs" style={{ color: "oklch(0.6 0.04 250)" }}>
                Mobile Repair Shop
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const isActive =
              path === "/" ? location === "/" : location.startsWith(path);
            return (
              <Link key={path} href={path}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 cursor-pointer relative group ${
                    isActive ? "text-white" : ""
                  }`}
                  style={{
                    background: isActive
                      ? "oklch(0.55 0.2 250)"
                      : "transparent",
                    color: isActive ? "white" : "oklch(0.72 0.03 250)",
                    boxShadow: isActive
                      ? "0 2px 8px oklch(0.55 0.2 250 / 0.35)"
                      : "none",
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLDivElement).style.background =
                        "oklch(0.25 0.07 250)";
                      (e.currentTarget as HTMLDivElement).style.color =
                        "oklch(0.95 0.01 250)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLDivElement).style.background =
                        "transparent";
                      (e.currentTarget as HTMLDivElement).style.color =
                        "oklch(0.72 0.03 250)";
                    }
                  }}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {sidebarOpen && (
                    <span className="flex-1 truncate">{label}</span>
                  )}
                  {sidebarOpen &&
                    label === "Inventory" &&
                    lowStockCount > 0 && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                        style={{
                          background: "oklch(0.65 0.22 25)",
                          color: "white",
                        }}
                      >
                        {lowStockCount}
                      </span>
                    )}
                  {sidebarOpen && label === "Repairs" && pendingRepairs > 0 && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                      style={{
                        background: "oklch(0.5 0.15 55)",
                        color: "white",
                      }}
                    >
                      {pendingRepairs}
                    </span>
                  )}
                  {/* Tooltip for collapsed state */}
                  {!sidebarOpen && (
                    <div
                      className="absolute left-full ml-2 px-2 py-1 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                      style={{
                        background: "oklch(0.18 0.06 250)",
                        border: "1px solid oklch(0.28 0.06 250)",
                      }}
                    >
                      {label}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div
          className="p-3 border-t"
          style={{ borderColor: "oklch(0.28 0.06 250)" }}
        >
          {sidebarOpen ? (
            <div className="space-y-2">
              <Link href="/profile">
                <div className="flex items-center gap-3 p-2 rounded-md transition-colors hover:bg-white/10 cursor-pointer">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: "oklch(0.55 0.2 250)" }}
                  >
                    {user?.name?.charAt(0) ?? "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-white">
                      {user?.name}
                    </p>
                    <p
                      className="text-xs truncate"
                      style={{ color: "oklch(0.6 0.04 250)" }}
                    >
                      {user?.role}
                    </p>
                  </div>
                  <UserCircle
                    size={16}
                    className="flex-shrink-0"
                    style={{ color: "oklch(0.6 0.04 250)" }}
                  />
                </div>
              </Link>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 p-2 rounded-md transition-colors hover:bg-red-500/20 text-red-400 text-sm"
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Link href="/profile">
                <button
                  className="p-2 rounded-md transition-colors hover:bg-white/10 text-white"
                  title="Edit Profile"
                >
                  <UserCircle size={18} />
                </button>
              </Link>
              <button
                onClick={logout}
                className="p-2 rounded-md transition-colors hover:bg-red-500/20 text-red-400"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header
          className="flex items-center gap-4 px-6 bg-card border-b border-border flex-shrink-0"
          style={{ height: "64px" }}
        >
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Page breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>PhonefixPOS</span>
            <ChevronRight size={14} />
            <span className="text-foreground font-medium">
              {NAV_ITEMS.find(n =>
                n.path === "/" ? location === "/" : location.startsWith(n.path)
              )?.label ?? "Page"}
            </span>
          </div>

          <div className="flex-1" />

          {/* Alerts */}
          {lowStockCount > 0 && (
            <Link href="/inventory">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer"
                style={{
                  background: "oklch(0.95 0.1 25)",
                  color: "oklch(0.45 0.2 25)",
                }}
              >
                <Bell size={13} />
                {lowStockCount} low stock
              </div>
            </Link>
          )}

          {/* Store Selector (Admin only) */}
          {showStoreSelector && (
            <Select
              value={selectedStoreId || ""}
              onValueChange={value => setSelectedStoreId(value || null)}
            >
              <SelectTrigger className="w-[200px] h-9">
                <div className="flex items-center gap-2">
                  <Store size={14} />
                  <SelectValue placeholder="Select Store" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(stores) && stores.length > 0 ? (
                  stores.map(store => (
                    <SelectItem key={store.id} value={store.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{store.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {store.address}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-stores" disabled>
                    <span className="text-muted-foreground">
                      No stores available
                    </span>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}

          {/* User avatar */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: "oklch(0.55 0.2 250)" }}
            >
              {user?.name?.charAt(0) ?? "U"}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium leading-tight">{user?.name}</p>
              <p className="text-xs text-muted-foreground leading-tight">
                {user?.role}
              </p>
            </div>
            <button
              onClick={logout}
              className="ml-2 p-2 rounded-md transition-colors hover:bg-red-100 text-red-600"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
