"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  BookOpen,
  Bell,
  Bot,
  CreditCard,
  User,
  LogOut,
  ChevronRight,
  ExternalLink,
  Clock,
  ArrowRight,
  Menu,
  Plus,
  Download,
  FileText,
  Target,
  AlertTriangle,
  Check,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { createBrowserClient } from "@/lib/supabase"; // Updated import
import { Sidebar } from "@/components/dashboard/Sidebar";
import {
  User as SupabaseUser,
  UserProfile,
  Course,
  Subscription,
  TradingBot,
  TradingSignal,
  Order,
} from "@/types";

interface DashboardData {
  courses: Course[];
  subscriptions: Subscription[];
  bots: TradingBot[];
  recentSignals: TradingSignal[];
  paymentHistory: Order[];
}

function DashboardContent() {
  const router = useRouter();
  const { user, profile, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData>({
    courses: [],
    subscriptions: [],
    bots: [],
    recentSignals: [],
    paymentHistory: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/dashboard");
    }
  }, [authLoading, isAuthenticated, router]);

  // Handle Payment Success Verification
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");

    if (paymentStatus === "success" && sessionId) {
      console.log("🔄 Verifying payment...", sessionId);
      fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then(async (res) => {
          if (res.ok) {
            console.log("✅ Payment verified!");
            // Hard navigate to clean URL to stop loop and refresh data
            window.location.href = "/dashboard";
          } else {
            console.error("Payment verification failed");
          }
        });
    }
  }, [searchParams, router]);

  // Fetch dashboard data
  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      const supabase = createBrowserClient();

      try {
        // Fetch user's purchased courses
        const { data: courseAccess } = await supabase
          .from("user_access")
          .select("product_id")
          .eq("user_id", user.id)
          .eq("product_type", "course")
          .eq("is_active", true);

        const courseIds = courseAccess?.map((a) => a.product_id) || [];

        let courses: Course[] = [];
        if (courseIds.length > 0) {
          const { data: courseData } = await supabase
            .from("products")
            .select("*")
            .in("id", courseIds);
          courses = courseData || [];
        }

        // Fetch active subscriptions
        const { data: subscriptionsData } = await supabase
          .from("subscriptions")
          .select(`*, plan:products(*)`)
          .eq("user_id", user.id)
          .eq("status", "active")
          .gte("current_period_end", new Date().toISOString());

        // Fetch purchased bots
        const { data: botAccess } = await supabase
          .from("user_access")
          .select("product_id")
          .eq("user_id", user.id)
          .eq("product_type", "bot")
          .eq("is_active", true);

        const botIds = botAccess?.map((a) => a.product_id) || [];

        let bots: TradingBot[] = [];
        if (botIds.length > 0) {
          const { data: botData } = await supabase
            .from("products")
            .select("*")
            .in("id", botIds);
          bots = botData || [];
        }

        // Fetch signals
        let signals: TradingSignal[] = [];
        if (subscriptionsData && subscriptionsData.length > 0) {
          const planIds = subscriptionsData.map((s) => s.plan_id);
          const { data: signalsData } = await supabase
            .from("signals")
            .select("*")
            .in("plan_id", planIds)
            .order("created_at", { ascending: false })
            .limit(5);
          signals = signalsData || [];
        }

        // Fetch history
        const { data: ordersData } = await supabase
          .from("orders")
          .select(`*, product:products(*)`)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);

        setData({
          courses,
          subscriptions: subscriptionsData || [],
          bots,
          recentSignals: signals,
          paymentHistory: ordersData || [],
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // Loading spinner for initial auth check only
  if (authLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner" />
          <p className="text-gray-500 animate-pulse font-medium">Securing connection...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  const hasActiveSubscription = data.subscriptions.length > 0;

  // Modern Card Component Helper
  const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`dark-card p-6 border border-gold-500/10 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-dark-950 text-gray-100 font-sans selection:bg-gold-500/30">
      {/* Sidebar - Always visible once authenticated */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        counts={{
          courses: data.courses.length,
          bots: data.bots.length,
        }}
        hasActiveSubscription={hasActiveSubscription}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={logout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:ml-72 transition-all duration-300">

        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-dark-950/80 backdrop-blur-md sticky top-0 z-30 border-b border-dark-800">
          <Link href="/" className="flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-gold-500" />
            <span className="text-lg font-bold">LOGIC</span>
          </Link>
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-400">
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-8">
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
                <div className="spinner" />
                <p className="text-gray-500 text-sm font-medium">Analyzing markets...</p>
              </div>
            ) : (
              <>
                {/* Page Header */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                      <span className="text-gray-400 font-normal">Welcome back,</span>{" "}
                      <span className="gold-gradient-text">{profile?.first_name || "Trader"}</span>
                    </h1>
                    <p className="text-gray-400 mt-1">Here is what's happening with your portfolio today.</p>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-500 bg-dark-900/50 px-4 py-2 rounded-full border border-dark-800">
                    <Clock className="w-4 h-4" />
                    <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                </motion.div>

                {/* Content Tabs */}
                <AnimatePresence mode="wait">
                  {activeTab === "overview" && (
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { label: "Active Subs", value: data.subscriptions.length, icon: CreditCard, color: "text-blue-400", bg: "bg-blue-500/10" },
                          { label: "My Courses", value: data.courses.length, icon: BookOpen, color: "text-purple-400", bg: "bg-purple-500/10" },
                          { label: "Active Bots", value: data.bots.length, icon: Bot, color: "text-amber-400", bg: "bg-amber-500/10" },
                          { label: "Recent Signals", value: data.recentSignals.length, icon: Bell, color: "text-green-400", bg: "bg-green-500/10" },
                        ].map((stat, i) => (
                          <Card key={i} className="flex items-center space-x-4 hover:border-gold-500/30 transition-colors">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                              <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">{stat.label}</p>
                              <p className="text-2xl font-bold text-white">{stat.value}</p>
                            </div>
                          </Card>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Recent Signals Section */}
                        <Card className="h-full">
                          <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                              <Bell className="w-5 h-5 text-gold-500" />
                              Latest Signals
                            </h2>
                            <button onClick={() => setActiveTab('signals')} className="text-sm text-gold-400 hover:text-gold-300 flex items-center">
                              View All <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="space-y-4">
                            {data.recentSignals.length > 0 ? (
                              data.recentSignals.map(signal => (
                                <div key={signal.id} className="p-4 rounded-xl bg-dark-900/50 border border-dark-800 flex justify-between items-center group hover:border-gold-500/20 transition-all">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${signal.direction === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {signal.direction}
                                      </span>
                                      <span className="font-bold text-white">{signal.symbol}</span>
                                    </div>
                                    <p className="text-sm text-gray-400">Entry: {signal.entry_price}</p>
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-sm font-medium ${signal.status === 'active' ? 'text-green-400' : 'text-gray-500'
                                      }`}>
                                      {signal.status.toUpperCase()}
                                    </span>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {new Date(signal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                No recent signals found.
                              </div>
                            )}
                          </div>
                        </Card>

                        {/* Quick Access / Courses */}
                        <Card className="h-full">
                          <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                              <BookOpen className="w-5 h-5 text-gold-500" />
                              My Learning
                            </h2>
                            <button onClick={() => setActiveTab('courses')} className="text-sm text-gold-400 hover:text-gold-300 flex items-center">
                              All Courses <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="space-y-4">
                            {data.courses.length > 0 ? (
                              data.courses.slice(0, 3).map(course => (
                                <Link key={course.id} href={`/dashboard/courses/${course.id}`} className="block">
                                  <div className="p-3 rounded-xl bg-dark-900/50 border border-dark-800 hover:border-gold-500/30 transition-all flex gap-4 items-center">
                                    <div className="w-16 h-16 rounded-lg bg-dark-800 overflow-hidden relative flex-shrink-0">
                                      {course.thumbnail_url ? (
                                        <img src={course.thumbnail_url} alt={course.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-dark-800">
                                          <BookOpen className="w-6 h-6 text-gray-600" />
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <h3 className="font-bold text-gray-200 line-clamp-1 group-hover:text-gold-400">{course.name}</h3>
                                      <p className="text-sm text-gray-500 line-clamp-1">{course.description}</p>
                                    </div>
                                  </div>
                                </Link>
                              ))
                            ) : (
                              <div className="text-center py-12 bg-dark-900/30 rounded-xl border border-dashed border-dark-700">
                                <BookOpen className="w-12 h-12 text-dark-700 mx-auto mb-3" />
                                <p className="text-gray-400">You haven't purchased any courses yet.</p>
                                <Link href="/courses" className="mt-4 inline-block text-gold-400 hover:text-gold-300 font-medium">
                                  Browse Courses
                                </Link>
                              </div>
                            )}
                          </div>
                        </Card>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Other Tabs Placeholders - You can extract these to components too */}
                {activeTab === "courses" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-gold-500" />
                        My Library
                      </h2>
                      <Link href="/courses" className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold rounded-lg transition-colors flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Browse Catalogue
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {data.courses.map(course => (
                        <Card key={course.id} className="group hover:-translate-y-1 transition-transform duration-300">
                          <div className="aspect-video rounded-lg bg-dark-800 mb-4 overflow-hidden relative">
                            {course.thumbnail_url && <img src={course.thumbnail_url} alt={course.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                          </div>
                          <h3 className="text-xl font-bold mb-2 text-white group-hover:text-gold-400 transition-colors">{course.name}</h3>
                          <p className="text-gray-400 mb-4 line-clamp-2">{course.description}</p>
                          <Link href={`/dashboard/courses/${course.id}`} className="w-full py-2 bg-dark-800 hover:bg-gold-600 hover:text-dark-950 text-gray-300 rounded-lg flex items-center justify-center transition-colors font-medium">
                            Continue Learning
                          </Link>
                        </Card>
                      ))}
                      {data.courses.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-dark-900/50 rounded-xl border border-dashed border-dark-800">
                          <BookOpen className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                          <h3 className="text-xl font-bold text-gray-300 mb-2">No Courses Found</h3>
                          <p className="text-gray-500 mb-6">Start your learning journey today.</p>
                          <Link href="/courses" className="px-6 py-3 bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold rounded-lg inline-flex items-center gap-2 transition-colors">
                            Browse Catalogue
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Signals Tab */}
                {activeTab === "signals" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Bell className="w-6 h-6 text-gold-500" />
                        Trading Signals
                      </h2>
                    </div>

                    <div className="space-y-4">
                      {data.recentSignals.map((signal) => (
                        <Card key={signal.id} className="relative overflow-hidden group hover:border-gold-500/30 transition-all">
                          <div className="absolute top-0 right-0 p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${signal.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                              signal.status === 'closed' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                                'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                              {signal.status}
                            </span>
                          </div>

                          <div className="flex flex-col md:flex-row gap-6">
                            <div className="min-w-[150px]">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`w-1.5 h-12 rounded-full ${signal.direction === 'buy' ? 'bg-green-500' : 'bg-red-500'}`} />
                                <div>
                                  <h3 className="text-3xl font-bold text-white">{signal.symbol}</h3>
                                  <span className={`text-sm font-bold uppercase tracking-wider ${signal.direction === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                                    {signal.direction}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-2">
                                <Clock className="w-3.5 h-3.5" />
                                {new Date(signal.created_at).toLocaleDateString()}
                              </p>
                            </div>

                            <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-4">
                              <div className="bg-dark-900/50 p-4 rounded-xl border border-dark-800">
                                <span className="text-gray-500 text-xs uppercase font-semibold tracking-wider block mb-1">Entry Price</span>
                                <span className="text-white font-mono font-bold text-lg">{signal.entry_price}</span>
                              </div>
                              <div className="bg-dark-900/50 p-4 rounded-xl border border-dark-800">
                                <span className="text-gray-500 text-xs uppercase font-semibold tracking-wider block mb-1 flex items-center gap-1">
                                  <Target className="w-3 h-3 text-green-500" /> Take Profit
                                </span>
                                <span className="text-green-400 font-mono font-bold text-lg">{signal.take_profit || '-'}</span>
                              </div>
                              <div className="bg-dark-900/50 p-4 rounded-xl border border-dark-800">
                                <span className="text-gray-500 text-xs uppercase font-semibold tracking-wider block mb-1 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-red-500" /> Stop Loss
                                </span>
                                <span className="text-red-400 font-mono font-bold text-lg">{signal.stop_loss || '-'}</span>
                              </div>
                            </div>
                          </div>

                          {signal.description && (
                            <div className="mt-4 pt-4 border-t border-dark-800/50">
                              <p className="text-sm text-gray-400">{signal.description}</p>
                            </div>
                          )}
                        </Card>
                      ))}
                      {data.recentSignals.length === 0 && (
                        <div className="text-center py-16 bg-dark-900/30 rounded-xl border border-dashed border-dark-700">
                          <Bell className="w-16 h-16 text-dark-700 mx-auto mb-4" />
                          <h3 className="text-xl font-bold text-gray-300 mb-2">No Active Signals</h3>
                          <p className="text-gray-500">Wait for the next trading opportunity.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Bots Tab */}
                {activeTab === "bots" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Bot className="w-6 h-6 text-gold-500" />
                      My Trading Bots
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {data.bots.map(bot => (
                        <Card key={bot.id} className="flex flex-col h-full group hover:border-gold-500/30 transition-all">
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-dark-800 to-dark-900 border border-dark-700 overflow-hidden shadow-lg">
                                {bot.thumbnail_url ?
                                  <img src={bot.thumbnail_url} alt={bot.name} className="w-full h-full object-cover" /> :
                                  <div className="flex items-center justify-center w-full h-full text-gold-500/50"><Bot className="w-8 h-8" /></div>
                                }
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-white group-hover:text-gold-400 transition-colors">{bot.name}</h3>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-xs bg-gold-500/10 text-gold-400 px-2.5 py-1 rounded-lg border border-gold-500/20 font-medium">
                                    {bot.version || 'v1.0.0'}
                                  </span>
                                  <span className="text-xs bg-green-500/10 text-green-400 px-2.5 py-1 rounded-lg border border-green-500/20 font-medium flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Active
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <p className="text-gray-400 text-sm mb-8 flex-1 leading-relaxed">{bot.description}</p>

                          <div className="grid grid-cols-2 gap-4 mt-auto">
                            {bot.download_url && (
                              <a href={bot.download_url} target="_blank" className="flex items-center justify-center gap-2 px-4 py-3 bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold rounded-xl transition-all hover:scale-[1.02] text-sm shadow-lg shadow-gold-500/20">
                                <Download className="w-4 h-4" /> Download
                              </a>
                            )}
                            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-dark-800 hover:bg-dark-700 text-gray-200 font-medium rounded-xl transition-all hover:text-white text-sm border border-dark-700 hover:border-dark-600">
                              <FileText className="w-4 h-4" /> Setup Guide
                            </button>
                          </div>
                        </Card>
                      ))}
                      {data.bots.length === 0 && (
                        <div className="col-span-full text-center py-16 bg-dark-900/30 rounded-xl border border-dashed border-dark-700">
                          <Bot className="w-16 h-16 text-dark-700 mx-auto mb-4" />
                          <h3 className="text-xl font-bold text-gray-300 mb-2">No Bots Found</h3>
                          <p className="text-gray-500 mb-6">Automate your trading with our premium bots.</p>
                          <Link href="/bots" className="px-6 py-3 bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold rounded-lg inline-flex items-center gap-2 transition-colors">
                            Browse Store
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Payments Tab */}
                {activeTab === "payments" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <CreditCard className="w-6 h-6 text-gold-500" />
                      Payment History
                    </h2>

                    <div className="rounded-xl border border-dark-800 bg-dark-900/30 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-gray-400 uppercase bg-dark-900/80 border-b border-dark-800 font-semibold tracking-wider">
                            <tr>
                              <th className="px-6 py-5">Date</th>
                              <th className="px-6 py-5">Item</th>
                              <th className="px-6 py-5">Amount</th>
                              <th className="px-6 py-5">Status</th>
                              <th className="px-6 py-5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-dark-800/50">
                            {data.paymentHistory.map(order => (
                              <tr key={order.id} className="hover:bg-dark-800/30 transition-colors group">
                                <td className="px-6 py-4 text-gray-400 font-medium">
                                  {new Date(order.created_at).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-white group-hover:text-gold-400 transition-colors">{order.product?.name || 'Product'}</span>
                                    <span className="text-xs text-gray-500 capitalize">{order.product_type}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-white font-mono font-medium">
                                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency }).format(order.amount)}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${order.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                    order.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                      'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                    {order.status === 'completed' && <Check className="w-3.5 h-3.5" />}
                                    {order.status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                                    {order.status === 'failed' && <XCircle className="w-3.5 h-3.5" />}
                                    <span className="capitalize">{order.status}</span>
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-dark-800 rounded-lg">
                                    <Download className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {data.paymentHistory.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-6 py-16 text-center">
                                  <div className="flex flex-col items-center justify-center text-gray-500">
                                    <CreditCard className="w-12 h-12 mb-3 text-dark-700" />
                                    <p>No transaction history found.</p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Profile Tab */}
                {activeTab === "profile" && (
                  <Card className="max-w-2xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-20 h-20 rounded-full bg-gold-500 flex items-center justify-center text-dark-950 font-bold text-2xl">
                        {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">{profile?.first_name} {profile?.last_name}</h2>
                        <p className="text-gray-400">Manage your personal information</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-400">First Name</label>
                          <div className="p-4 bg-dark-900 border border-dark-800 rounded-xl text-white">
                            {profile?.first_name}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-400">Last Name</label>
                          <div className="p-4 bg-dark-900 border border-dark-800 rounded-xl text-white">
                            {profile?.last_name}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Email Address</label>
                        <div className="p-4 bg-dark-900 border border-dark-800 rounded-xl text-white flex items-center justify-between">
                          {user.email}
                          <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded border border-green-500/20">Verified</span>
                        </div>
                      </div>
                      <div className="pt-6 border-t border-dark-800">
                        <button onClick={logout} className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                          <LogOut className="w-5 h-5" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner" />
          <p className="text-gray-500 animate-pulse font-medium">Securing connection...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
