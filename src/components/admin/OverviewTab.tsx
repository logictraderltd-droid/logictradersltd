"use client";

import { useState } from "react";
import {
    Users,
    ShoppingCart,
    CreditCard,
    Bell,
    ArrowUpRight,
    ArrowDownRight,
    DollarSign,
    Activity
} from "lucide-react";
import { motion } from "framer-motion";
import { Order, User } from "@/types";

interface OverviewTabProps {
    stats: {
        totalUsers: number;
        totalRevenue: number;
        totalOrders: number;
        activeSubscriptions: number;
    };
    recentOrders: Order[];
    recentUsers: User[];
    onNavigate: (tab: string) => void;
}

export function OverviewTab({ stats, recentOrders, recentUsers, onNavigate }: OverviewTabProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gold-600 to-gold-400 p-8 shadow-lg shadow-gold-500/10">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold text-dark-950 mb-2 font-display">
                        Dashboard Overview
                    </h1>
                    <p className="text-dark-900/80 font-medium max-w-xl">
                        Here's what's happening with your platform today. You have <span className="font-bold text-dark-950">{stats.activeSubscriptions} active subscriptions</span> generating revenue.
                    </p>
                </div>
                <div className="absolute right-0 top-0 h-full w-1/3 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-white/20 rounded-full blur-3xl"></div>
            </div>

            {/* Stats Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Revenue", value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10", trend: "+12.5%" },
                    { label: "Active Subs", value: stats.activeSubscriptions, icon: Activity, color: "text-blue-500", bg: "bg-blue-500/10", trend: "+4.2%" },
                    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-purple-500", bg: "bg-purple-500/10", trend: "+8.1%" },
                    { label: "Total Orders", value: stats.totalOrders, icon: ShoppingCart, color: "text-amber-500", bg: "bg-amber-500/10", trend: "+2.3%" },
                ].map((stat, i) => (
                    <div key={i} className="dark-card p-6 flex items-start justify-between group hover:border-gold-500/30 transition-all">
                        <div>
                            <p className="text-sm font-medium text-gray-400 mb-1">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-white font-mono">{stat.value}</h3>
                            <div className="flex items-center gap-1 mt-2 text-xs font-medium text-green-400">
                                <ArrowUpRight className="w-3 h-3" />
                                {stat.trend} <span className="text-gray-500 ml-1">vs last month</span>
                            </div>
                        </div>
                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Recent Orders */}
                <div className="dark-card p-6 h-full">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-gold-500" />
                            Recent Orders
                        </h3>
                        <button
                            onClick={() => onNavigate("orders")}
                            className="text-sm text-gold-400 hover:text-gold-300 font-medium hover:underline"
                        >
                            View All
                        </button>
                    </div>
                    <div className="space-y-4">
                        {recentOrders.map((order) => (
                            <div
                                key={order.id}
                                className="flex items-center justify-between p-4 bg-dark-900/50 border border-dark-800 rounded-xl hover:border-gold-500/20 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center text-gray-400">
                                        <CreditCard className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-white">{(order as any).product_name || 'Product'}</p>
                                        <p className="text-xs text-gray-500">{(order as any).user_email}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold font-mono text-white">${order.amount}</p>
                                    <span
                                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${order.status === "completed" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                                                order.status === "pending" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                                    "bg-red-500/10 text-red-400 border border-red-500/20"
                                            }`}
                                    >
                                        {order.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {recentOrders.length === 0 && <p className="text-gray-500 text-center py-8">No recent orders.</p>}
                    </div>
                </div>

                {/* Recent Users */}
                <div className="dark-card p-6 h-full">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Users className="w-5 h-5 text-gold-500" />
                            New Users
                        </h3>
                        <button
                            onClick={() => onNavigate("users")}
                            className="text-sm text-gold-400 hover:text-gold-300 font-medium hover:underline"
                        >
                            View All
                        </button>
                    </div>
                    <div className="space-y-4">
                        {recentUsers.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center justify-between p-4 bg-dark-900/50 border border-dark-800 rounded-xl hover:border-gold-500/20 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white font-bold text-xs ring-2 ring-dark-950">
                                        {user.email.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm text-white">{user.email}</p>
                                        <p className="text-xs text-gray-500">Joined {new Date(user.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded bg-dark-800 text-gray-400 border border-dark-700`}>
                                    {user.role}
                                </span>
                            </div>
                        ))}
                        {recentUsers.length === 0 && <p className="text-gray-500 text-center py-8">No recent users.</p>}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
