"use client";


import {
    TrendingUp,
    BookOpen,
    Bell,
    Bot,
    CreditCard,
    User,
    X,
    LogOut,
} from "lucide-react";
import Link from "next/link";

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    counts: {
        courses: number;
        bots: number;
    };
    hasActiveSubscription: boolean;
    isOpen: boolean;
    onClose: () => void;
    onLogout: () => void;
}

const menuItems = [
    { id: "overview", label: "Overview", icon: TrendingUp },
    { id: "courses", label: "My Courses", icon: BookOpen },
    { id: "signals", label: "Signals", icon: Bell },
    { id: "bots", label: "My Bots", icon: Bot },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "profile", label: "Profile", icon: User },
];

export function Sidebar({
    activeTab,
    setActiveTab,
    counts,
    hasActiveSubscription,
    isOpen,
    onClose,
    onLogout,
}: SidebarProps) {
    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            {/* Sidebar Container */}
            <aside
                className={`
          fixed top-0 left-0 z-50 h-full w-72 
          bg-dark-950/80 backdrop-blur-xl border-r border-gold-500/10
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
            >
                <div className="flex flex-col h-full p-6">
                    {/* Logo */}
                    <div className="flex items-center justify-between mb-10">
                        <Link href="/" className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/20">
                                <TrendingUp className="w-6 h-6 text-dark-950" />
                            </div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gold-300 to-gold-600">
                                LOGIC
                            </span>
                        </Link>
                        <button
                            onClick={onClose}
                            className="lg:hidden p-2 text-gray-400 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-2">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActiveTab(item.id);
                                        onClose();
                                    }}
                                    className={`
                    w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 group
                    ${isActive
                                            ? "bg-gold-500/10 text-gold-400 shadow-[0_0_20px_rgba(212,160,23,0.1)] border border-gold-500/10"
                                            : "text-gray-400 hover:bg-dark-800 hover:text-gray-200"
                                        }
                  `}
                                >
                                    <Icon
                                        className={`w-5 h-5 transition-colors ${isActive ? "text-gold-400" : "text-gray-500 group-hover:text-gray-300"
                                            }`}
                                    />
                                    <span className="font-medium">{item.label}</span>

                                    {/* Badges */}
                                    {item.id === "courses" && counts.courses > 0 && (
                                        <span className="ml-auto bg-dark-800 text-gold-400 text-xs font-bold px-2 py-0.5 rounded-full border border-gold-500/20">
                                            {counts.courses}
                                        </span>
                                    )}
                                    {item.id === "bots" && counts.bots > 0 && (
                                        <span className="ml-auto bg-dark-800 text-gold-400 text-xs font-bold px-2 py-0.5 rounded-full border border-gold-500/20">
                                            {counts.bots}
                                        </span>
                                    )}
                                    {item.id === "signals" && hasActiveSubscription && (
                                        <span className="ml-auto flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Bottom Actions */}
                    <div className="pt-6 border-t border-dark-800">
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Sign Out</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
