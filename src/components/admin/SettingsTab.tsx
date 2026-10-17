"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Globe, Loader2, Lock, Shield, Wallet } from "lucide-react";
import {
    DEFAULT_PLATFORM_SETTINGS,
    type PlatformSettings,
} from "@/lib/platform-settings";

type SettingsSection = "general" | "payments" | "security" | "notifications";

const sections: { id: SettingsSection; label: string; icon: typeof Globe }[] = [
    { id: "general", label: "General", icon: Globe },
    { id: "payments", label: "Payments", icon: Wallet },
    { id: "security", label: "Security", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
];

export function SettingsTab() {
    const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
    const [activeSubTab, setActiveSubTab] = useState<SettingsSection>("general");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

    useEffect(() => {
        let cancelled = false;
        const loadSettings = async () => {
            try {
                const response = await fetch("/api/platform-settings", { cache: "no-store" });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || "Unable to load platform settings.");
                if (!cancelled) setSettings({ ...DEFAULT_PLATFORM_SETTINGS, ...result.settings });
            } catch (error) {
                console.error("Unable to load admin settings:", error);
                if (!cancelled) {
                    setNotification({
                        type: "error",
                        message: error instanceof Error ? error.message : "Unable to load platform settings.",
                    });
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        void loadSettings();
        return () => { cancelled = true; };
    }, []);

    const updateSetting = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
        setSettings((current) => ({ ...current, [key]: value }));
        setNotification(null);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setNotification(null);
        try {
            const response = await fetch("/api/platform-settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ settings }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Unable to save platform settings.");
            setSettings({ ...DEFAULT_PLATFORM_SETTINGS, ...result.settings });
            setNotification({ type: "success", message: "Settings saved successfully." });
            window.dispatchEvent(new Event("platform-settings-updated"));
        } catch (error) {
            console.error("Unable to save admin settings:", error);
            setNotification({
                type: "error",
                message: error instanceof Error ? error.message : "Unable to save platform settings.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const toggleRow = (
        title: string,
        description: string,
        checked: boolean,
        onChange: (checked: boolean) => void,
    ) => (
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-dark-800 bg-dark-900/50 p-4">
            <span>
                <span className="block font-medium text-white">{title}</span>
                <span className="mt-1 block text-sm text-gray-500">{description}</span>
            </span>
            <input
                type="checkbox"
                className="h-5 w-5 shrink-0 accent-yellow-500"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                disabled={isLoading || isSaving}
            />
        </label>
    );

    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold font-display text-white">Platform Settings</h2>
                <p className="mt-1 text-gray-400">Manage public information, checkout, site access, and admin notifications.</p>
            </header>

            {notification && (
                <div
                    role={notification.type === "error" ? "alert" : "status"}
                    className={`flex items-center gap-3 rounded-xl border p-4 ${
                        notification.type === "success"
                            ? "border-green-500/20 bg-green-500/10 text-green-400"
                            : "border-red-500/20 bg-red-500/10 text-red-300"
                    }`}
                >
                    {notification.type === "success" ? <Check className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                    {notification.message}
                </div>
            )}

            {isLoading ? (
                <div className="dark-card flex items-center justify-center gap-3 p-12 text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading settings...
                </div>
            ) : (
                <div className="flex flex-col gap-6 lg:flex-row">
                    <nav className="w-full shrink-0 space-y-1 lg:w-64" aria-label="Settings sections">
                        {sections.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setActiveSubTab(id)}
                                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                                    activeSubTab === id
                                        ? "border border-gold-500/10 bg-gold-500/10 text-gold-400"
                                        : "text-gray-400 hover:bg-dark-800 hover:text-white"
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                <span className="font-medium">{label}</span>
                            </button>
                        ))}
                    </nav>

                    <section className="dark-card min-w-0 flex-1 space-y-6 p-5 lg:p-8">
                        {activeSubTab === "general" && (
                            <>
                                <div>
                                    <h3 className="border-b border-dark-800 pb-4 text-lg font-bold text-white">General information</h3>
                                    <p className="mt-3 text-sm text-gray-500">Shown to customers as the platform name and support contact.</p>
                                </div>
                                <label className="block space-y-2 text-sm font-medium text-gray-400">
                                    Platform name
                                    <input
                                        type="text"
                                        maxLength={80}
                                        value={settings.platformName}
                                        onChange={(event) => updateSetting("platformName", event.target.value)}
                                        className="w-full rounded-xl border border-dark-800 bg-dark-900 px-4 py-3 text-white focus:border-gold-500/50 focus:outline-none"
                                    />
                                </label>
                                <label className="block space-y-2 text-sm font-medium text-gray-400">
                                    Support email
                                    <input
                                        type="email"
                                        maxLength={254}
                                        value={settings.supportEmail}
                                        onChange={(event) => updateSetting("supportEmail", event.target.value)}
                                        className="w-full rounded-xl border border-dark-800 bg-dark-900 px-4 py-3 text-white focus:border-gold-500/50 focus:outline-none"
                                    />
                                </label>
                            </>
                        )}

                        {activeSubTab === "payments" && (
                            <>
                                <div>
                                    <h3 className="border-b border-dark-800 pb-4 text-lg font-bold text-white">Checkout methods</h3>
                                    <p className="mt-3 text-sm text-gray-500">Disabled methods are hidden from customers and rejected by the payment API.</p>
                                </div>
                                {toggleRow(
                                    "Mobile Money",
                                    "Allow manual MTN Rwanda Mobile Money payments.",
                                    settings.mobileMoneyEnabled,
                                    (checked) => updateSetting("mobileMoneyEnabled", checked),
                                )}
                                {toggleRow(
                                    "Binance Pay",
                                    "Allow manual Binance ID / USDT payments.",
                                    settings.binanceEnabled,
                                    (checked) => updateSetting("binanceEnabled", checked),
                                )}
                            </>
                        )}

                        {activeSubTab === "security" && (
                            <>
                                <div>
                                    <h3 className="border-b border-dark-800 pb-4 text-lg font-bold text-white">Access and registration</h3>
                                    <p className="mt-3 text-sm text-gray-500">Admins can still sign in and use the dashboard during maintenance.</p>
                                </div>
                                {toggleRow(
                                    "Maintenance mode",
                                    "Show a maintenance page to visitors and block customer pages and APIs.",
                                    settings.maintenanceMode,
                                    (checked) => updateSetting("maintenanceMode", checked),
                                )}
                                {toggleRow(
                                    "New registrations",
                                    "Allow visitors to create new accounts.",
                                    settings.registrationsOpen,
                                    (checked) => updateSetting("registrationsOpen", checked),
                                )}
                            </>
                        )}

                        {activeSubTab === "notifications" && (
                            <>
                                <div>
                                    <h3 className="border-b border-dark-800 pb-4 text-lg font-bold text-white">Admin notifications</h3>
                                    <p className="mt-3 text-sm text-gray-500">Control recent activity notifications in the admin dashboard header.</p>
                                </div>
                                {toggleRow(
                                    "Dashboard activity bell",
                                    "Show recent account, order, payment, and subscription activity.",
                                    settings.adminNotificationsEnabled,
                                    (checked) => updateSetting("adminNotificationsEnabled", checked),
                                )}
                            </>
                        )}

                        <div className="flex justify-end border-t border-dark-800 pt-5">
                            <button
                                type="button"
                                onClick={() => void handleSave()}
                                disabled={isSaving}
                                className="flex items-center gap-2 rounded-xl bg-gold-500 px-8 py-3 font-bold text-dark-950 transition-all hover:bg-gold-600 disabled:opacity-50"
                            >
                                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
