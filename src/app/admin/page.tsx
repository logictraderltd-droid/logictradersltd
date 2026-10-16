"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createBrowserClient, normalizeOrderRows, normalizeProductRows } from "@/lib/supabase";
import { User, Product, Order, TradingSignal } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

async function fetchAdminOrders(supabase: ReturnType<typeof createBrowserClient>, limit?: number) {
  let ordersQuery = supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (limit !== undefined) ordersQuery = ordersQuery.limit(limit);
  const { data: ordersData, error: ordersError } = await ordersQuery;
  if (ordersError) throw ordersError;

  const rows = ordersData || [];
  const productIds = Array.from(new Set(rows.map((order) => order.product_id).filter(Boolean)));
  const userIds = Array.from(new Set(rows.map((order) => order.user_id).filter(Boolean)));
  let productRows: Array<{ id: string; name: string }> = [];
  let userRows: Array<{ id: string; email: string }> = [];

  if (productIds.length) {
    const { data, error } = await supabase.from("products").select("id, name").in("id", productIds);
    if (error) throw error;
    productRows = data || [];
  }
  if (userIds.length) {
    const { data, error } = await supabase.from("users").select("id, email").in("id", userIds);
    if (error) throw error;
    userRows = data || [];
  }

  const productsById = new Map(productRows.map((product) => [product.id, product]));
  const usersById = new Map(userRows.map((user) => [user.id, user]));
  return normalizeOrderRows(rows.map((order) => ({
    ...order,
    product: productsById.get(order.product_id) ?? null,
    user: usersById.get(order.user_id) ?? null,
  })));
}

// Components
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { OverviewTab } from "@/components/admin/OverviewTab";
import { UsersTab } from "@/components/admin/UsersTab";
import { ProductsTab } from "@/components/admin/ProductsTab";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { SignalsTab } from "@/components/admin/SignalsTab";
import { SettingsTab } from "@/components/admin/SettingsTab";
import { MarketingTab } from "@/components/admin/MarketingTab";

interface AdminStats {
  totalUsers: number;
  totalRevenue: number;
  totalOrders: number;
  activeSubscriptions: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isAdmin, logout, isLoading: authLoading } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const dataFetchedRef = useRef<Record<string, boolean>>({});

  // Data State
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalRevenue: 0,
    totalOrders: 0,
    activeSubscriptions: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);

  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [dataLoadError, setDataLoadError] = useState("");

  // Function to fetch overview data
  const fetchOverviewData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setDataLoadError("");
    const supabase = createBrowserClient();
    try {
      const [usersResult, revenueResult, ordersCountResult, subscriptionsResult, recentOrders, recentUsersResult] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("amount_cents").eq("status", "completed"),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active").gt("ends_at", new Date().toISOString()),
        fetchAdminOrders(supabase, 5),
        supabase.from("users").select("*").order("created_at", { ascending: false }).limit(5)
      ]);
      if (usersResult.error) throw usersResult.error;
      if (revenueResult.error) throw revenueResult.error;
      if (ordersCountResult.error) throw ordersCountResult.error;
      if (subscriptionsResult.error) throw subscriptionsResult.error;
      if (recentUsersResult.error) throw recentUsersResult.error;

      const totalRevenue = revenueResult.data?.reduce((sum, order) => sum + Number(order.amount_cents || 0) / 100, 0) || 0;

      setStats({
        totalUsers: usersResult.count || 0,
        totalRevenue,
        totalOrders: ordersCountResult.count || 0,
        activeSubscriptions: subscriptionsResult.count || 0,
      });

      setRecentOrders(recentOrders);
      setRecentUsers(recentUsersResult.data || []);
      dataFetchedRef.current['overview'] = true;

    } catch (error) {
      console.error("Error fetching admin overview:", error);
      throw error;
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, []);

  // Function to fetch tab-specific data
  const fetchTabData = useCallback(async (isRefresh = false) => {
    if (!isAdmin) return;

    // Only show loading if we don't have data yet and it's not a background refresh
    const hasData = dataFetchedRef.current[activeTab];
    if (!hasData && !isRefresh) {
      setIsLoading(true);
    }

    const supabase = createBrowserClient();

    try {
      setDataLoadError("");
      if (activeTab === "overview") {
        await fetchOverviewData(hasData || isRefresh);
      } else if (activeTab === "users") {
        const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false });
        setUsers(data || []);
      } else if (activeTab === "products") {
        const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        setProducts(normalizeProductRows(data || []));
      } else if (activeTab === "orders") {
        setOrders(await fetchAdminOrders(supabase));
      } else if (activeTab === "signals") {
        const { data } = await supabase.from("signals").select("*").order("created_at", { ascending: false });
        setSignals(data || []);
      }

      dataFetchedRef.current[activeTab] = true;
    } catch (error) {
      console.error(`Error fetching ${activeTab} data:`, error);
      setDataLoadError(`Unable to load ${activeTab}: ${error instanceof Error ? error.message : "Unexpected database error."}`);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [activeTab, isAdmin, fetchOverviewData]);

  // Initial Auth Check
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push("/login?redirect=/admin");
      } else if (!isAdmin) {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, isAdmin, authLoading, router]);

  // Initial Data Fetch when tab changes
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchTabData();
    }
  }, [activeTab, isAuthenticated, isAdmin, fetchTabData]);

  if (authLoading || (isInitialLoad && isLoading)) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner" />
          <p className="text-gray-500 animate-pulse font-medium">Securing connection...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="flex h-screen bg-dark-950 text-gray-100 overflow-hidden font-sans selection:bg-gold-500/30">

      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={logout}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300">

        <AdminHeader
          onMenuClick={() => setSidebarOpen(true)}
          title={activeTab}
          onNavigate={setActiveTab}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto min-h-full flex flex-col">
            <AnimatePresence mode="wait">
              {isLoading && !dataFetchedRef.current[activeTab] ? (
                <motion.div
                  key="loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex items-center justify-center py-20"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="spinner" />
                    <p className="text-gray-500 text-sm font-medium">Loading {activeTab}...</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="w-full"
                >
                  {dataLoadError && <p role="alert" className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{dataLoadError}</p>}
                  {activeTab === "overview" && (
                    <OverviewTab
                      stats={stats}
                      recentOrders={recentOrders}
                      recentUsers={recentUsers}
                      onNavigate={setActiveTab}
                    />
                  )}

                  {activeTab === "users" && (
                    <UsersTab
                      users={users}
                      onRefresh={() => fetchTabData(true)}
                    />
                  )}

                  {activeTab === "products" && (
                    <ProductsTab
                      products={products}
                      onRefresh={() => fetchTabData(true)}
                    />
                  )}

                  {activeTab === "orders" && (
                    <OrdersTab
                      orders={orders}
                      onRefresh={() => fetchTabData(true)}
                    />
                  )}

                  {activeTab === "signals" && (
                    <SignalsTab
                      signals={signals}
                      onRefresh={() => fetchTabData(true)}
                    />
                  )}

                  {activeTab === "marketing" && (
                    <MarketingTab />
                  )}

                  {activeTab === "settings" && (
                    <SettingsTab />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

      </div>
    </div>
  );
}
