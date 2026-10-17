"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Menu, User, X } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";

interface AdminHeaderProps {
    onMenuClick: () => void;
    onNavigate: (tab: string) => void;
    title: string;
}

type ActivityKind = "user" | "order" | "transaction" | "subscription";

interface AdminActivity {
    id: string;
    kind: ActivityKind;
    title: string;
    description: string;
    createdAt: string;
    tab: "users" | "orders";
}

const READ_ACTIVITIES_KEY = "admin-notifications-read-v2";

function wasUpdatedAfterCreation(createdAt: string, updatedAt: string) {
    return Date.parse(updatedAt) > Date.parse(createdAt) + 1_000;
}

export function AdminHeader({ onMenuClick, onNavigate, title }: AdminHeaderProps) {
    const { profile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activities, setActivities] = useState<AdminActivity[]>([]);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [readActivityKeys, setReadActivityKeys] = useState<Set<string>>(new Set());
    const isFetchingRef = useRef(false);

    const activityKey = (activity: AdminActivity) => `${activity.id}:${activity.createdAt}`;

    const loadActivities = useCallback(async () => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        setIsLoading(true);
        try {
            const settingsResponse = await fetch("/api/platform-settings", { cache: "no-store" });
            const settingsResult = await settingsResponse.json();
            if (!settingsResponse.ok) {
                throw new Error(settingsResult.error || "Unable to load notification settings.");
            }
            if (settingsResult.settings?.adminNotificationsEnabled === false) {
                setNotificationsEnabled(false);
                setActivities([]);
                setLoadError("");
                return;
            }
            setNotificationsEnabled(true);

            const supabase = createBrowserClient();
            const [usersResult, ordersResult, paymentsResult, manualPaymentsResult, subscriptionsResult] = await Promise.all([
                supabase.from("users").select("id,email,full_name,created_at,updated_at").order("updated_at", { ascending: false }).limit(10),
                supabase.from("orders").select("id,user_id,amount_cents,status,created_at,updated_at").order("updated_at", { ascending: false }).limit(10),
                supabase.from("platform_payment_transactions").select("id,user_id,amount_cents,currency,status,provider,created_at,updated_at").order("updated_at", { ascending: false }).limit(10),
                supabase.from("manual_payment_requests").select("id,user_id,amount_minor,currency,status,method,created_at,updated_at").order("updated_at", { ascending: false }).limit(10),
                supabase.from("subscriptions").select("id,user_id,status,created_at,updated_at").order("updated_at", { ascending: false }).limit(10),
            ]);

            const nextActivities: AdminActivity[] = [
                ...(usersResult.data || []).map((user) => ({
                    id: `user:${user.id}`,
                    kind: "user" as const,
                    title: wasUpdatedAfterCreation(user.created_at, user.updated_at) ? "Account updated" : "New account created",
                    description: user.full_name || user.email || "A new user registered",
                    createdAt: user.updated_at || user.created_at,
                    tab: "users" as const,
                })),
                ...(ordersResult.data || []).map((order) => ({
                    id: `order:${order.id}`,
                    kind: "order" as const,
                    title: wasUpdatedAfterCreation(order.created_at, order.updated_at) ? "Order updated" : "Order placed",
                    description: `${order.status} · $${(Number(order.amount_cents || 0) / 100).toFixed(2)}`,
                    createdAt: order.updated_at || order.created_at,
                    tab: "orders" as const,
                })),
                ...(paymentsResult.data || []).map((payment) => ({
                    id: `payment:${payment.id}`,
                    kind: "transaction" as const,
                    title: wasUpdatedAfterCreation(payment.created_at, payment.updated_at) ? "Transaction updated" : "Payment transaction",
                    description: `${payment.provider} · ${payment.status} · ${(Number(payment.amount_cents || 0) / 100).toFixed(2)} ${payment.currency}`,
                    createdAt: payment.updated_at || payment.created_at,
                    tab: "orders" as const,
                })),
                ...(manualPaymentsResult.data || []).map((payment) => ({
                    id: `manual-payment:${payment.id}`,
                    kind: "transaction" as const,
                    title: wasUpdatedAfterCreation(payment.created_at, payment.updated_at) ? "Manual payment updated" : "Manual payment request",
                    description: `${payment.method} · ${payment.status} · ${new Intl.NumberFormat("en-US", {
                        minimumFractionDigits: payment.currency === "RWF" ? 0 : 2,
                        maximumFractionDigits: payment.currency === "RWF" ? 0 : 2,
                    }).format(Number(payment.amount_minor || 0) / (payment.currency === "RWF" ? 1 : 100))} ${payment.currency}`,
                    createdAt: payment.updated_at || payment.created_at,
                    tab: "orders" as const,
                })),
                ...(subscriptionsResult.data || []).map((subscription) => ({
                    id: `subscription:${subscription.id}`,
                    kind: "subscription" as const,
                    title: wasUpdatedAfterCreation(subscription.created_at, subscription.updated_at) ? "Subscription updated" : "Subscription created",
                    description: `Subscription ${subscription.status}`,
                    createdAt: subscription.updated_at || subscription.created_at,
                    tab: "orders" as const,
                })),
            ];
            nextActivities.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
            setActivities(nextActivities.slice(0, 30));

            const errors = [
                usersResult.error && `Accounts: ${usersResult.error.message}`,
                ordersResult.error && `Orders: ${ordersResult.error.message}`,
                paymentsResult.error && `Transactions: ${paymentsResult.error.message}`,
                manualPaymentsResult.error && `Manual payments: ${manualPaymentsResult.error.message}`,
                subscriptionsResult.error && `Subscriptions: ${subscriptionsResult.error.message}`,
            ].filter(Boolean);
            setLoadError(errors.join(" "));
        } catch (error) {
            console.error("Unable to load admin notifications:", error);
            setLoadError(error instanceof Error ? error.message : "Unable to load recent activity.");
        } finally {
            isFetchingRef.current = false;
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        try {
            const storedReadActivities = window.localStorage.getItem(READ_ACTIVITIES_KEY);
            if (storedReadActivities) {
                const parsed: unknown = JSON.parse(storedReadActivities);
                if (Array.isArray(parsed) && parsed.every((value) => typeof value === "string")) {
                    setReadActivityKeys(new Set(parsed));
                }
            }
        } catch (error) {
            console.error("Unable to read notification view state:", error);
        }

        void loadActivities();
        const refreshTimer = window.setInterval(() => {
            if (document.visibilityState === "visible") void loadActivities();
        }, 60_000);
        const refreshOnFocus = () => {
            if (document.visibilityState === "visible") void loadActivities();
        };
        const refreshSettings = () => void loadActivities();
        window.addEventListener("focus", refreshOnFocus);
        window.addEventListener("platform-settings-updated", refreshSettings);
        return () => {
            window.clearInterval(refreshTimer);
            window.removeEventListener("focus", refreshOnFocus);
            window.removeEventListener("platform-settings-updated", refreshSettings);
        };
    }, [loadActivities]);

    const visibleActivities = activities.filter((activity) =>
        !readActivityKeys.has(activityKey(activity))
    );
    const unreadCount = visibleActivities.length;

    const toggleNotifications = () => {
        setIsOpen((open) => !open);
    };

    const openActivity = (activity: AdminActivity) => {
        const nextReadKeys = new Set(readActivityKeys);
        nextReadKeys.add(activityKey(activity));
        setReadActivityKeys(nextReadKeys);
        try {
            window.localStorage.setItem(READ_ACTIVITIES_KEY, JSON.stringify(Array.from(nextReadKeys)));
        } catch (error) {
            console.error("Unable to persist seen notification:", error);
        }
        setIsOpen(false);
        onNavigate(activity.tab);
    };

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between p-4 md:px-8 md:py-5 bg-dark-950/80 backdrop-blur-md border-b border-dark-800">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    aria-label="Open admin menu"
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
                        aria-label={notificationsEnabled
                            ? `Recent activity${unreadCount ? `, ${unreadCount} unread` : ""}`
                            : "Recent activity notifications are disabled"}
                        aria-expanded={isOpen}
                        className="relative p-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && <span className="absolute -top-0.5 -right-1 min-w-4 h-4 px-1 bg-red-500 rounded-full border-2 border-dark-950 text-[9px] leading-3 text-white text-center">{unreadCount > 9 ? "9+" : unreadCount}</span>}
                    </button>

                    {isOpen && (
                        <section className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-dark-700 bg-dark-950 shadow-2xl" aria-label="Recent admin activity">
                            <div className="flex items-center justify-between border-b border-dark-800 px-4 py-3">
                                <h2 className="font-semibold text-white">Recent activity</h2>
                                <button type="button" onClick={() => setIsOpen(false)} aria-label="Close notifications" className="text-gray-400 hover:text-white">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            {loadError && <p role="alert" className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300">{loadError}</p>}
                            <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
                                {isLoading && activities.length === 0 ? (
                                    <p className="px-4 py-8 text-center text-sm text-gray-400">Loading recent activity...</p>
                                ) : visibleActivities.length === 0 ? (
                                    <p className="px-4 py-8 text-center text-sm text-gray-400">
                                        {loadError ? "Activity could not be loaded." : notificationsEnabled ? "No unseen notifications." : "Notifications are disabled in Settings."}
                                    </p>
                                ) : visibleActivities.map((activity) => (
                                    <button
                                        key={activity.id}
                                        type="button"
                                        data-activity-kind={activity.kind}
                                        onClick={() => openActivity(activity)}
                                        className="block w-full border-b border-dark-800/70 px-4 py-3 text-left hover:bg-dark-900"
                                    >
                                        <span className="block text-sm font-medium text-white">{activity.title}</span>
                                        <span className="mt-1 block truncate text-xs text-gray-400">{activity.description}</span>
                                        <time className="mt-1 block text-[11px] text-gray-500" dateTime={activity.createdAt}>
                                            {Number.isNaN(Date.parse(activity.createdAt)) ? "Date unavailable" : new Date(activity.createdAt).toLocaleString()}
                                        </time>
                                    </button>
                                ))}
                            </div>
                            <div className="border-t border-dark-800 px-4 py-2 text-right">
                                <button type="button" onClick={() => void loadActivities()} disabled={isLoading} className="text-xs text-gold-400 hover:text-gold-300 disabled:opacity-50">
                                    {isLoading ? "Refreshing..." : "Refresh"}
                                </button>
                            </div>
                        </section>
                    )}
                </div>

                <div className="flex items-center gap-3 pl-3 md:pl-6 border-l border-dark-800">
                    <div className="hidden md:block text-right">
                        <p className="text-sm font-bold text-white">{profile?.first_name || "Admin"}</p>
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
