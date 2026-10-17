"use client";

import { useState } from "react";
import { Search, Edit, Trash2, Mail, Shield, User as UserIcon, Calendar, CheckCircle, X, Loader2, AlertCircle } from "lucide-react";
import { User } from "@/types";

interface UsersTabProps {
    users: User[];
    currentUserId: string;
    loadError?: string;
    onRefresh: () => void;
}

export function UsersTab({ users, currentUserId, loadError, onRefresh }: UsersTabProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
    const [fullName, setFullName] = useState("");
    const [role, setRole] = useState<"admin" | "customer">("customer");
    const [isSaving, setIsSaving] = useState(false);
    const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.id || "").toLowerCase().includes(searchTerm.toLowerCase());

        const normalizedUserRole = (user.role || "").toLowerCase().trim();
        const matchesRole = roleFilter === "all" || normalizedUserRole === roleFilter.toLowerCase();

        return matchesSearch && matchesRole;
    });

    const saveUser = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!editingUser) return;
        setIsSaving(true);
        setNotice(null);
        try {
            const response = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName, role }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Unable to update user.");
            setEditingUser(null);
            setNotice({ type: "success", text: "User details updated." });
            await onRefresh();
        } catch (error) {
            console.error("Unable to update user:", error);
            setNotice({ type: "error", text: error instanceof Error ? error.message : "Unable to update user." });
        } finally {
            setIsSaving(false);
        }
    };

    const deleteUser = async () => {
        if (!deleteTarget) return;
        setIsSaving(true);
        setNotice(null);
        try {
            const response = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Unable to delete user.");
            setDeleteTarget(null);
            setNotice({ type: "success", text: "User account deleted." });
            await onRefresh();
        } catch (error) {
            console.error("Unable to delete user:", error);
            setNotice({ type: "error", text: error instanceof Error ? error.message : "Unable to delete user." });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-display text-white">User Management</h2>
                    <p className="text-gray-400 mt-1">View and manage user accounts and permissions.</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-dark-800 text-gray-300 rounded-xl hover:bg-dark-700 transition-colors text-sm font-medium flex items-center gap-2">
                        <Mail className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            {notice && (
                <div role={notice.type === "error" ? "alert" : "status"} className={`flex items-center gap-3 rounded-xl border p-4 ${notice.type === "error" ? "border-red-500/20 bg-red-500/10 text-red-300" : "border-green-500/20 bg-green-500/10 text-green-300"}`}>
                    {notice.type === "error" && <AlertCircle className="h-4 w-4 shrink-0" />}
                    <span>{notice.text}</span>
                    <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message" className="ml-auto"><X className="h-4 w-4" /></button>
                </div>
            )}
            {loadError && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">Unable to load users: {loadError}</p>}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search users by email or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-gold-500/50 transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-dark-900 border border-dark-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold-500/50 transition-all cursor-pointer"
                    >
                        <option value="all">All Roles</option>
                        <option value="customer">Customer</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
            </div>

            {/* Users Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredUsers.map((user) => (
                    <div key={user.id} className="group bg-dark-900 border border-dark-800 rounded-2xl p-6 hover:border-gold-500/50 transition-all flex flex-col items-center text-center shadow-lg relative overflow-hidden">
                        {/* Background Decoration */}
                        <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full blur-3xl opacity-20 ${user.role === 'admin' ? 'bg-gold-500' : 'bg-blue-500'
                            }`}></div>

                        <div className="relative mb-4">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 ${user.role === 'admin' ? 'bg-gold-500/10 border-gold-500/20 text-gold-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                }`}>
                                <UserIcon className="w-8 h-8" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-dark-900 animate-pulse"></div>
                        </div>

                        <div className="w-full">
                            <h3 className="text-white font-bold truncate px-2 mb-1" title={user.email}>
                                {user.email?.split('@')[0]}
                            </h3>
                            <p className="text-xs text-gray-500 truncate mb-4" title={user.email}>
                                {user.email}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-2 mb-6 w-full">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1.5 border ${user.role === 'admin' ? 'bg-gold-500/10 text-gold-400 border-gold-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                }`}>
                                {user.role === 'admin' && <Shield className="w-3 h-3" />}
                                {user.role}
                            </span>
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border bg-green-500/10 text-green-400 border-green-500/20 flex items-center gap-1.5">
                                <CheckCircle className="w-3 h-3" />
                                Active
                            </span>
                        </div>

                        <div className="mt-auto w-full pt-4 border-t border-dark-800 flex flex-col gap-3">
                            <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase font-bold px-1">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Joined
                                </span>
                                <span className="text-gray-400">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={user.id === currentUserId}
                                    onClick={() => {
                                        setEditingUser(user);
                                        setFullName(user.full_name || "");
                                        setRole(user.role);
                                        setNotice(null);
                                    }}
                                    className="flex-1 py-2 rounded-xl bg-dark-800 hover:bg-gold-500 hover:text-dark-950 text-gray-400 transition-all border border-dark-700 hover:border-gold-500 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Edit Details
                                </button>
                                <button
                                    type="button"
                                    disabled={user.id === currentUserId || user.role === "admin"}
                                    onClick={() => { setDeleteTarget(user); setNotice(null); }}
                                    aria-label={`Delete ${user.email}`}
                                    title={user.role === "admin" ? "Administrator accounts cannot be deleted here" : "Delete user"}
                                    className="p-2 rounded-xl bg-dark-800 hover:bg-red-500 hover:text-white text-gray-400 transition-all border border-dark-700 hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredUsers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-dark-900/50 rounded-2xl border border-dark-800 border-dashed">
                    <Search className="w-16 h-16 text-dark-800 mb-4 opacity-20" />
                    <p className="text-xl font-medium text-gray-400">No users found</p>
                    <p className="text-gray-600 mt-2">Try adjusting your filters or search terms.</p>
                </div>
            )}

            {editingUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
                    <form onSubmit={saveUser} className="w-full max-w-md space-y-5 rounded-2xl border border-dark-700 bg-dark-900 p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">Edit user details</h3>
                            <button type="button" onClick={() => setEditingUser(null)} aria-label="Close edit user dialog" className="text-gray-400 hover:text-white"><X /></button>
                        </div>
                        <p className="truncate text-sm text-gray-400">{editingUser.email}</p>
                        <label className="block space-y-2 text-sm text-gray-400">
                            Full name
                            <input value={fullName} maxLength={150} onChange={(event) => setFullName(event.target.value)} className="dark-input w-full" />
                        </label>
                        <label className="block space-y-2 text-sm text-gray-400">
                            Account role
                            <select value={role} onChange={(event) => setRole(event.target.value as "admin" | "customer")} className="dark-input w-full">
                                <option value="customer">Customer</option>
                                <option value="admin">Admin</option>
                            </select>
                        </label>
                        {notice?.type === "error" && <p role="alert" className="text-sm text-red-300">{notice.text}</p>}
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setEditingUser(null)} className="rounded-xl border border-dark-700 px-4 py-2 text-gray-300">Cancel</button>
                            <button type="submit" disabled={isSaving} className="flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2 font-bold text-dark-950 disabled:opacity-50">
                                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />} Save
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {deleteTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
                    <div className="w-full max-w-md space-y-5 rounded-2xl border border-dark-700 bg-dark-900 p-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">Delete user account?</h3>
                            <button type="button" onClick={() => setDeleteTarget(null)} aria-label="Close delete user dialog" className="text-gray-400 hover:text-white"><X /></button>
                        </div>
                        <p className="text-sm text-gray-400">
                            This permanently deletes <span className="text-white">{deleteTarget.email}</span> from the authentication system. Accounts with order history cannot be deleted so financial records remain intact.
                        </p>
                        {notice?.type === "error" && <p role="alert" className="text-sm text-red-300">{notice.text}</p>}
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border border-dark-700 px-4 py-2 text-gray-300">Cancel</button>
                            <button type="button" onClick={() => void deleteUser()} disabled={isSaving} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 font-bold text-white disabled:opacity-50">
                                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />} Delete account
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
