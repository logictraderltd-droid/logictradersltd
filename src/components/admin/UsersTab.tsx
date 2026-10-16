"use client";

import { FormEvent, useState } from "react";
import { Search, Edit, Trash2, Mail, Shield, User as UserIcon, Calendar, CheckCircle, X } from "lucide-react";
import { User } from "@/types";

interface UsersTabProps {
    users: User[];
    onRefresh: () => Promise<void>;
}

export function UsersTab({ users, onRefresh }: UsersTabProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editEmail, setEditEmail] = useState("");
    const [editName, setEditName] = useState("");
    const [editRole, setEditRole] = useState<User["role"]>("customer");
    const [isSaving, setIsSaving] = useState(false);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    const openEdit = (user: User) => {
        setEditingUser(user);
        setEditEmail(user.email);
        setEditName(user.full_name || "");
        setEditRole(user.role);
        setErrorMessage("");
    };

    const saveUser = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingUser) return;

        setIsSaving(true);
        setErrorMessage("");
        try {
            const response = await fetch(`/api/admin/users/${encodeURIComponent(editingUser.id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: editEmail, full_name: editName, role: editRole }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Unable to update user.");
            setEditingUser(null);
            await onRefresh();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Unable to update user.");
        } finally {
            setIsSaving(false);
        }
    };

    const deleteUser = async (user: User) => {
        if (!window.confirm(`Delete ${user.email}? This permanently deletes the auth account and related records.`)) return;

        setDeletingUserId(user.id);
        setErrorMessage("");
        try {
            const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
                method: "DELETE",
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Unable to delete user.");
            await onRefresh();
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Unable to delete user.");
        } finally {
            setDeletingUserId(null);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.id || "").toLowerCase().includes(searchTerm.toLowerCase());

        const normalizedUserRole = (user.role || "").toLowerCase().trim();
        const matchesRole = roleFilter === "all" || normalizedUserRole === roleFilter.toLowerCase();

        return matchesSearch && matchesRole;
    });

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

            {errorMessage && (
                <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {errorMessage}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search users by name, email, or ID..."
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
                            <h3 className="text-white font-bold truncate px-2 mb-1" title={user.full_name || user.email}>
                                {user.full_name || user.email?.split('@')[0]}
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
                                    onClick={() => openEdit(user)}
                                    className="flex-1 py-2 rounded-xl bg-dark-800 hover:bg-gold-500 hover:text-dark-950 text-gray-400 transition-all border border-dark-700 hover:border-gold-500 text-xs font-bold"
                                >
                                    Edit Details
                                </button>
                                <button
                                    type="button"
                                    onClick={() => deleteUser(user)}
                                    disabled={deletingUserId === user.id}
                                    aria-label={`Delete ${user.email}`}
                                    className="p-2 rounded-xl bg-dark-800 hover:bg-red-500 hover:text-white text-gray-400 transition-all border border-dark-700 hover:border-red-500 disabled:opacity-50"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="presentation">
                    <form
                        onSubmit={saveUser}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-user-title"
                        className="w-full max-w-lg space-y-5 rounded-2xl border border-dark-700 bg-dark-900 p-6 shadow-2xl"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 id="edit-user-title" className="text-xl font-bold text-white">Edit user</h3>
                                <p className="mt-1 text-sm text-gray-400">{editingUser.email}</p>
                            </div>
                            <button type="button" onClick={() => setEditingUser(null)} aria-label="Close edit user form" className="rounded-lg p-2 text-gray-400 hover:bg-dark-800 hover:text-white">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <label className="block space-y-2 text-sm text-gray-300">
                            Full name
                            <input
                                type="text"
                                maxLength={120}
                                value={editName}
                                onChange={(event) => setEditName(event.target.value)}
                                className="w-full rounded-xl border border-dark-700 bg-dark-950 px-4 py-3 text-white focus:border-gold-500/50 focus:outline-none"
                            />
                        </label>
                        <label className="block space-y-2 text-sm text-gray-300">
                            Email
                            <input
                                type="email"
                                required
                                maxLength={254}
                                value={editEmail}
                                onChange={(event) => setEditEmail(event.target.value)}
                                className="w-full rounded-xl border border-dark-700 bg-dark-950 px-4 py-3 text-white focus:border-gold-500/50 focus:outline-none"
                            />
                        </label>
                        <label className="block space-y-2 text-sm text-gray-300">
                            Role
                            <select
                                value={editRole}
                                onChange={(event) => setEditRole(event.target.value as User["role"])}
                                className="w-full rounded-xl border border-dark-700 bg-dark-950 px-4 py-3 text-white focus:border-gold-500/50 focus:outline-none"
                            >
                                <option value="customer">Customer</option>
                                <option value="admin">Admin</option>
                            </select>
                        </label>
                        <div className="flex justify-end gap-3 pt-1">
                            <button type="button" onClick={() => setEditingUser(null)} className="rounded-xl border border-dark-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-dark-800">
                                Cancel
                            </button>
                            <button type="submit" disabled={isSaving} className="rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-bold text-dark-950 hover:bg-gold-400 disabled:opacity-50">
                                {isSaving ? "Saving..." : "Save changes"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
