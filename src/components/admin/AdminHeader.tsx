"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, CheckCircle2, Clock3, CreditCard, Menu, User, UserPlus, X } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";

interface AdminNotification {
    id: string;
    kind: "user" | "order" | "subscription";
    title: string;
    detail: string;
    createdAt: string;
}

interface UserActivityRow {
    id: string;
    email: string;
    full_name: string | null;
    created_at: string;
}

interface OrderActivityRow {
    id: string;
    user_id: string;
    amount_cents: number;
    status: string | null;
    payment_method: string | null;
    created_at: string;
    updated_at: string;
}

interface SubscriptionActivityRow {
    id: string;
    user_id: string;
    status: string | null;
    created_at: string;
    updated_at: string;
}

const LAST_READ_KEY = "admin-notifications-last-read";
const MAX_NOTIFICATIONS = 30;

function relativeTime(value: string) {
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return "Recently";
    const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(value).toLocaleDateString();
}

interface AdminHeaderProps {
    onMenuClick: () => void;
    title: string;
    onNavigate: (tab: string) => void;
}

export function AdminHeader({ onMenuClick, title, onNavigate }: AdminHeaderProps) {
    const { profile } = useAuth();
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [lastReadAt, setLastReadAt] = useState<string | null>(null);

    useEffect(() => {
        try {
            const storedReadAt = window.localStorage.getItem(LAST_READ_KEY);
            const baseline = storedReadAt || new Date().toISOString();
            if (!storedReadAt) window.localStorage.setItem(LAST_READ_KEY, baseline);
            setLastReadAt(baseline);
        } catch (error) {
            console.error("Unable to restore notification read state:", error);
            setLastReadAt(new Date().toISOString());
        }
    }, []);

    const loadNotifications = useCallback(async (initialLoad = false) => {
        try {
            const supabase = createBrowserClient();
            const [usersResult, ordersResult, subscriptionsResult] = await Promise.all([
                supabase
                    .from("users")
                    .select("id, email, full_name, created_at")
                    .order("created_at", { ascending: false })
                    .limit(20),
                supabase
                    .from("orders")
                    .select("id, user_id, amount_cents, status, payment_method, created_at, updated_at")
                    .order("updated_at", { ascending: false })
                    .limit(30),
                supabase
                    .from("subscriptions")
                    .select("id, user_id, status, created_at, updated_at")
                    .order("updated_at", { ascending: false })
                    .limit(20),
            ]);

            const queryError = usersResult.error || ordersResult.error || subscriptionsResult.error;
            if (queryError) throw queryError;
            const recentUsers = (usersResult.data || []) as UserActivityRow[];
            const activityUserIds = Array.from(new Set([
                ...((ordersResult.data || []) as OrderActivityRow[]).map((order) => order.user_id),
                ...((subscriptionsResult.data || []) as SubscriptionActivityRow[]).map((subscription) => subscription.user_id),
            ]));
            const knownUserIds = new Set(recentUsers.map((user) => user.id));
            const missingUserIds = activityUserIds.filter((userId) => !knownUserIds.has(userId));
            let activityUsers: UserActivityRow[] = [];
            if (missingUserIds.length > 0) {
                const { data, error } = await supabase
                    .from("users")
                    .select("id, email, full_name, created_at")
                    .in("id", missingUserIds);
                if (error) throw error;
                activityUsers = (data || []) as UserActivityRow[];
            }
            const userLabels = new Map([...recentUsers, ...activityUsers].map((user) => [
                user.id,
                user.full_name?.trim() || user.email,
            ]));

            const userEvents: AdminNotification[] = recentUsers.map((user) => ({
                id: `user-${user.id}`,
                kind: "user",
                title: "New account created",
                detail: user.full_name?.trim() || user.email,
                createdAt: user.created_at,
            }));

            const orderEvents: AdminNotification[] = ((ordersResult.data || []) as OrderActivityRow[]).map((order) => {
                const status = (order.status || "pending").toLowerCase();
                const person = userLabels.get(order.user_id) || `User ${order.user_id.slice(0, 8)}`;
                const statusDescription: Record<string, string> = {
                    pending: "Payment submitted",
                    processing: "Payment processing",
                    completed: "Payment completed",
                    failed: "Payment failed",
                    refunded: "Payment refunded",
                    pending_delivery: "Payment confirmed; delivery pending",
                };
                const changedAt = status === "pending" ? order.created_at : order.updated_at || order.created_at;
                return {
                    id: `order-${order.id}-${status}-${changedAt}`,
                    kind: "order",
                    title: statusDescription[status] || `Payment status: ${status.replace(/_/g, " ")}`,
                    detail: `${person} · $${(Number(order.amount_cents || 0) / 100).toFixed(2)}${order.payment_method ? ` · ${order.payment_method}` : ""}`,
                    createdAt: changedAt,
                };
            });

            const subscriptionEvents: AdminNotification[] = ((subscriptionsResult.data || []) as SubscriptionActivityRow[]).map((subscription) => ({
                id: `subscription-${subscription.id}-${subscription.status}-${subscription.updated_at}`,
                kind: "subscription",
                title: `Subscription ${subscription.status || "updated"}`,
                detail: userLabels.get(subscription.user_id) || `User ${subscription.user_id.slice(0, 8)}`,
                createdAt: subscription.updated_at || subscription.created_at,
            }));

            setNotifications([...userEvents, ...orderEvents, ...subscriptionEvents]
                .filter((notification) => Number.isFinite(new Date(notification.createdAt).getTime()))
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, MAX_NOTIFICATIONS));
            setLoadError("");
        } catch (error) {
            console.error("Unable to load admin notifications:", error);
            setLoadError("Notifications could not be loaded. Check admin database permissions and retry.");
        } finally {
            if (initialLoad) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const supabase = createBrowserClient();
        void loadNotifications(true);

        const channel = supabase
            .channel("admin-activity-notifications")
            .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => void loadNotifications())
            .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => void loadNotifications())
            .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, () => void loadNotifications())
            .subscribe((status) => {
                if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                    console.error("Live admin notifications are unavailable:", status);
                }
            });

        const interval = window.setInterval(() => void loadNotifications(), 60_000);
        const handleFocus = () => void loadNotifications();
        window.addEventListener("focus", handleFocus);

        return () => {
            window.clearInterval(interval);
            window.removeEventListener("focus", handleFocus);
            void supabase.removeChannel(channel);
        };
    }, [loadNotifications]);

    const unreadCount = useMemo(() => {
        if (!lastReadAt) return 0;
        const lastReadTimestamp = new Date(lastReadAt).getTime();
        return notifications.filter((notification) => new Date(notification.createdAt).getTime() > lastReadTimestamp).length;
    }, [lastReadAt, notifications]);

    const toggleNotifications = () => {
        const willOpen = !isOpen;
        setIsOpen(willOpen);
        if (willOpen) {
            const now = new Date().toISOString();
            setLastReadAt(now);
            try {
                window.localStorage.setItem(LAST_READ_KEY, now);
            } catch (error) {
                console.error("Unable to save notification read state:", error);
            }
        }
    };

    const selectNotification = (notification: AdminNotification) => {
        setIsOpen(false);
        onNavigate(notification.kind === "user" ? "users" : notification.kind === "subscription" ? "signals" : "orders");
    };

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between p-4 md:px-8 md:py-5 bg-dark-950/80 backdrop-blur-md border-b border-dark-800">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-white capitalize">{title}</h1>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
                <div className="relative">
                <button
                    type="button"
                    onClick={toggleNotifications}
                    aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
                    aria-expanded={isOpen}
                    className={`relative rounded-lg p-2 transition-colors ${isOpen ? "bg-dark-800 text-white" : "text-gray-400 hover:bg-dark-800 hover:text-white"}`}
                >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-dark-950 bg-red-500 px-1 text-[10px] font-bold text-white">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </button>
                {isOpen && (
                    <div className="absolute right-0 top-full z-50 mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-dark-700 bg-dark-900 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-dark-800 px-4 py-3">
                            <div>
                                <h2 className="font-semibold text-white">Notifications</h2>
                                <p className="text-xs text-gray-500">Accounts, payments, and subscriptions</p>
                            </div>
                            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close notifications" className="rounded-lg p-1.5 text-gray-400 hover:bg-dark-800 hover:text-white">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="max-h-[min(70vh,28rem)] overflow-y-auto">
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-gray-400"><Clock3 className="h-4 w-4 animate-pulse" /> Loading activity...</div>
                            ) : loadError ? (
                                <div className="space-y-3 px-4 py-6 text-center">
                                    <p role="alert" className="text-sm text-red-300">{loadError}</p>
                                    <button type="button" onClick={() => { setIsLoading(true); void loadNotifications(true); }} className="text-sm font-semibold text-gold-400 underline">Retry</button>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-gray-500">
                                    <Bell className="h-7 w-7 opacity-40" />
                                    <p className="text-sm">No recent activity yet.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-dark-800">
                                    {notifications.map((notification) => {
                                        const Icon = notification.kind === "user" ? UserPlus : notification.kind === "order" ? CreditCard : CheckCircle2;
                                        const unread = !!lastReadAt && new Date(notification.createdAt).getTime() > new Date(lastReadAt).getTime();
                                        return (
                                            <li key={notification.id}>
                                                <button type="button" onClick={() => selectNotification(notification)} className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-dark-800/70">
                                                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${notification.kind === "order" ? "bg-green-500/10 text-green-400" : notification.kind === "user" ? "bg-blue-500/10 text-blue-400" : "bg-gold-500/10 text-gold-400"}`}>
                                                        <Icon className="h-4 w-4" />
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="flex items-center gap-2">
                                                            <span className="truncate text-sm font-medium text-white">{notification.title}</span>
                                                            {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-gold-400" />}
                                                        </span>
                                                        <span className="mt-0.5 block truncate text-xs text-gray-400">{notification.detail}</span>
                                                        <span className="mt-1 block text-[11px] text-gray-500">{relativeTime(notification.createdAt)}</span>
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
                </div>

                <div className="flex items-center gap-3 pl-3 md:pl-6 border-l border-dark-800">
                    <div className="hidden md:block text-right">
                        <p className="text-sm font-bold text-white">{profile?.first_name || 'Admin'}</p>
                        <p className="text-xs text-gold-400">Administrator</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 p-[2px]">
                        <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center">
                            <User className="w-5 h-5 text-gold-500" />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
