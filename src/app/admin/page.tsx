"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createBrowserClient } from "@/lib/supabase";
import { User, Product, Order, TradingSignal } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

// Components
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { OverviewTab } from "@/components/admin/OverviewTab";
import { UsersTab } from "@/components/admin/UsersTab";
import { ProductsTab } from "@/components/admin/ProductsTab";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { SignalsTab } from "@/components/admin/SignalsTab";
import { SettingsTab } from "@/components/admin/SettingsTab";

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

  // Function to fetch overview data
  const fetchOverviewData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    const supabase = createBrowserClient();
    try {
      const [
        { count: totalUsers },
        { data: revenueData },
        { count: totalOrders },
        { count: activeSubscriptions },
        { data: recentOrdersData },
        { data: recentUsersData }
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("amount").eq("status", "completed"),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("orders").select(`*, product:products(name), user:users(email)`).order("created_at", { ascending: false }).limit(5),
        supabase.from("users").select("*").order("created_at", { ascending: false }).limit(5)
      ]);

      const totalRevenue = revenueData?.reduce((sum, order) => sum + order.amount, 0) || 0;

      setStats({
        totalUsers: totalUsers || 0,
        totalRevenue,
        totalOrders: totalOrders || 0,
        activeSubscriptions: activeSubscriptions || 0,
      });

      setRecentOrders(recentOrdersData || []);
      setRecentUsers(recentUsersData || []);
      dataFetchedRef.current['overview'] = true;

    } catch (error) {
      console.error("Error fetching admin overview:", error);
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
      if (activeTab === "overview") {
        await fetchOverviewData(hasData || isRefresh);
      } else if (activeTab === "users") {
        const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false });
        setUsers(data || []);
      } else if (activeTab === "products") {
        const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
        setProducts(data || []);
      } else if (activeTab === "orders") {
        const { data } = await supabase.from("orders").select(`*, product:products(name), user:users(email)`).order("created_at", { ascending: false });
        setOrders(data || []);
      } else if (activeTab === "signals") {
        const [signalsRes, productsRes] = await Promise.all([
          supabase.from("signals").select(`*, plan:products(name)`).order("created_at", { ascending: false }),
          supabase.from("products").select("*")
        ]);
        setSignals(signalsRes.data || []);
        setProducts(productsRes.data || []);
      }

      dataFetchedRef.current[activeTab] = true;
    } catch (error) {
      console.error(`Error fetching ${activeTab} data:`, error);
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
                  {activeTab === "overview" && (
                    <OverviewTab
                      stats={stats}
                      recentOrders={recentOrders}
                      recentUsers={recentUsers}
                      onNavigate={setActiveTab}
                    />
                  )}

                  {activeTab === "users" && (
                    <UsersTab users={users} />
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
                      products={products}
                      onRefresh={() => fetchTabData(true)}
                    />
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

