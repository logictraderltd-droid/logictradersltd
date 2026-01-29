"use client";

import { useState } from "react";
import { Search, Eye, Filter, Download, ShoppingCart, Calendar, User, Package, CreditCard, X, Trash2, Loader2 } from "lucide-react";
import { Order } from "@/types";
import { createBrowserClient } from "@/lib/supabase";

interface OrdersTabProps {
    orders: Order[];
    onRefresh: () => void;
}

export function OrdersTab({ orders, onRefresh }: OrdersTabProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

    const filteredOrders = orders.filter(order => {
        const email = (order as any).user?.email || "";
        const productName = (order as any).product?.name || "";
        const searchLower = searchTerm.toLowerCase();

        const matchesSearch =
            order.id.toLowerCase().includes(searchLower) ||
            email.toLowerCase().includes(searchLower) ||
            productName.toLowerCase().includes(searchLower);

        const matchesStatus = statusFilter === "all" || order.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const handleDeleteClick = (order: Order) => {
        setOrderToDelete(order);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!orderToDelete) return;

        setIsDeleting(true);
        const supabase = createBrowserClient();

        try {
            const { error } = await supabase
                .from('orders')
                .delete()
                .eq('id', orderToDelete.id);

            if (error) throw error;

            setIsDeleteModalOpen(false);
            setOrderToDelete(null);
            await onRefresh();
        } catch (err: any) {
            console.error('Error deleting order:', err);
            alert('Failed to delete order: ' + err.message);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-display text-white">Order History</h2>
                    <p className="text-gray-400 mt-1">Review and manage customer transactions.</p>
                </div>
                <button className="px-4 py-2 bg-dark-800 text-gray-300 rounded-xl hover:bg-dark-700 transition-colors text-sm font-medium flex items-center gap-2">
                    <Download className="w-4 h-4" /> Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search orders by ID, email, or product..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-gold-500/50 transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-dark-900 border border-dark-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold-500/50 transition-all cursor-pointer"
                    >
                        <option value="all">All Statuses</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>
            </div>

            {/* Orders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOrders.map((order) => (
                    <div key={order.id} className="group bg-dark-900 border border-dark-800 rounded-2xl p-5 hover:border-gold-500/50 transition-all flex flex-col shadow-lg">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-col">
                                <span className="text-xs font-mono text-gray-500">#{order.id.slice(0, 8)}</span>
                                <div className="flex items-center gap-2 text-gray-400 mt-1">
                                    <Calendar className="w-3 h-3" />
                                    <span className="text-xs">{new Date(order.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${order.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                order.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                    'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}>
                                {order.status}
                            </span>
                        </div>

                        <div className="space-y-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-dark-800 flex items-center justify-center text-gold-500">
                                    <User className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-500 uppercase font-bold">Customer</span>
                                    <span className="text-sm text-gray-200 truncate max-w-[200px]" title={(order as any).user?.email}>
                                        {(order as any).user?.email || 'Unknown'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-dark-800 flex items-center justify-center text-purple-500">
                                    <Package className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-500 uppercase font-bold">Product</span>
                                    <span className="text-sm text-gray-200 truncate max-w-[200px]" title={(order as any).product?.name}>
                                        {(order as any).product?.name || 'Unknown Product'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-dark-800 flex justify-between items-center">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 uppercase font-bold">Total Amount</span>
                                <span className="text-lg font-mono font-bold text-white">${order.amount}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedOrder(order)}
                                    className="p-2.5 rounded-xl bg-dark-800 hover:bg-gold-500 hover:text-dark-950 text-gray-400 transition-all border border-dark-700 hover:border-gold-500"
                                    title="View details"
                                >
                                    <Eye className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleDeleteClick(order)}
                                    className="p-2.5 rounded-xl bg-dark-800 hover:bg-red-500 hover:text-white text-gray-400 transition-all border border-dark-700 hover:border-red-500"
                                    title="Delete order"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredOrders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-dark-900/50 rounded-2xl border border-dark-800 border-dashed">
                    <ShoppingCart className="w-16 h-16 text-dark-800 mb-4 opacity-20" />
                    <p className="text-xl font-medium text-gray-400">No orders found</p>
                    <p className="text-gray-600 mt-2">Try adjusting your filters or search terms.</p>
                </div>
            )}

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-dark-800">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-gold-500" />
                                Order Details
                            </h3>
                            <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6 text-gray-300">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Order ID</label>
                                    <p className="text-sm font-mono text-white">{selectedOrder.id}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Date</label>
                                    <p className="text-sm text-white">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Status</label>
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${selectedOrder.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                        selectedOrder.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                            'bg-red-500/10 text-red-400 border-red-500/20'
                                        }`}>
                                        {selectedOrder.status}
                                    </span>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Amount</label>
                                    <p className="text-lg font-mono font-bold text-white">${selectedOrder.amount}</p>
                                </div>
                            </div>

                            <div className="p-4 bg-dark-950 rounded-xl border border-dark-800">
                                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-3">Customer Information</label>
                                <div className="space-y-2">
                                    <p className="text-sm flex justify-between">
                                        <span className="text-gray-400">Email:</span>
                                        <span className="text-white">{(selectedOrder as any).user?.email || 'Unknown'}</span>
                                    </p>
                                    <p className="text-sm flex justify-between">
                                        <span className="text-gray-400">User ID:</span>
                                        <span className="text-white font-mono text-xs truncate max-w-[150px]">{selectedOrder.user_id}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 bg-dark-950 rounded-xl border border-dark-800">
                                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-3">Product Information</label>
                                <div className="space-y-2">
                                    <p className="text-sm flex justify-between">
                                        <span className="text-gray-400">Name:</span>
                                        <span className="text-white">{(selectedOrder as any).product?.name || 'Unknown Product'}</span>
                                    </p>
                                    <p className="text-sm flex justify-between">
                                        <span className="text-gray-400">Product ID:</span>
                                        <span className="text-white font-mono text-xs truncate max-w-[150px]">{selectedOrder.product_id}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-dark-950/50 border-t border-dark-800">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="w-full py-3 bg-dark-800 hover:bg-dark-700 text-white rounded-xl font-bold transition-all border border-dark-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && orderToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Delete Order?</h3>
                            <p className="text-gray-400 mt-2 text-sm">
                                Are you sure you want to delete order <span className="text-white font-mono font-bold">#{orderToDelete.id.slice(0, 8)}</span>?
                                This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-dark-700 text-gray-400 hover:text-white font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


