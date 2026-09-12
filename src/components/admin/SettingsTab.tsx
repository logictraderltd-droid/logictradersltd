"use client";

import { useState } from "react";
import { Settings, Save, Lock, Bell, Wallet, Globe, Shield, Loader2, Check } from "lucide-react";

export function SettingsTab() {
    const [isLoading, setIsLoading] = useState(false);
    const [activeSubTab, setActiveSubTab] = useState('general');
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const [settings, setSettings] = useState({
        platformName: "Logic Traders Ltd",
        supportEmail: "support@logictraders.com",
        maintenanceMode: false,
        registrationsOpen: true,
        stripeEnabled: true,
        momoEnabled: true,
    });

    const handleSave = async () => {
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            setNotification({ type: 'success', message: 'Settings saved successfully' });
            setTimeout(() => setNotification(null), 3000);
        }, 1000);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-display text-white">Platform Settings</h2>
                    <p className="text-gray-400 mt-1">Configure global platform options and integrations.</p>
                </div>
            </div>

            {notification && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${notification.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                    {notification.type === 'success' ? <Check className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                    {notification.message}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Settings Navigation */}
                <div className="w-full lg:w-64 flex-shrink-0 space-y-1">
                    {[
                        { id: 'general', label: 'General', icon: Globe },
                        { id: 'payments', label: 'Payments', icon: Wallet },
                        { id: 'security', label: 'Security', icon: Lock },
                        { id: 'notifications', label: 'Notifications', icon: Bell },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSubTab === tab.id
                                    ? 'bg-gold-500/10 text-gold-400 border border-gold-500/10'
                                    : 'text-gray-400 hover:bg-dark-800 hover:text-white'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span className="font-medium">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Settings Content */}
                <div className="flex-1">
                    <div className="dark-card p-6 lg:p-8 space-y-8">
                        {activeSubTab === 'general' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-bold text-white border-b border-dark-800 pb-4">General Configuration</h3>

                                <div className="grid gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-400">Platform Name</label>
                                        <input
                                            type="text"
                                            value={settings.platformName}
                                            onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                                            className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-400">Support Email</label>
                                        <input
                                            type="email"
                                            value={settings.supportEmail}
                                            onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                                            className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-dark-900/50 rounded-xl border border-dark-800">
                                        <div>
                                            <h4 className="font-medium text-white">Maintenance Mode</h4>
                                            <p className="text-sm text-gray-500">Disable access for non-admin users</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={settings.maintenanceMode}
                                                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                                            />
                                            <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSubTab === 'payments' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-bold text-white border-b border-dark-800 pb-4">Payment Gateways</h3>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-dark-900/50 rounded-xl border border-dark-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                                                <span className="text-dark-950 font-bold">Stripe</span>
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-white">Stripe Integration</h4>
                                                <p className="text-sm text-gray-500">Credit Cards & International Payments</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={settings.stripeEnabled}
                                                onChange={(e) => setSettings({ ...settings, stripeEnabled: e.target.checked })}
                                            />
                                            <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-dark-900/50 rounded-xl border border-dark-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-yellow-400 flex items-center justify-center">
                                                <span className="text-dark-950 font-bold text-xs">MoMo</span>
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-white">MTN Mobile Money</h4>
                                                <p className="text-sm text-gray-500">Local Payments (UG/Sub-Saharan)</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={settings.momoEnabled}
                                                onChange={(e) => setSettings({ ...settings, momoEnabled: e.target.checked })}
                                            />
                                            <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Save Button Footer */}
                        <div className="pt-6 border-t border-dark-800 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={isLoading}
                                className="bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold px-8 py-3 rounded-xl flex items-center gap-2 transition-all hover:shadow-lg hover:shadow-gold-500/20 disabled:opacity-50"
                            >
                                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
