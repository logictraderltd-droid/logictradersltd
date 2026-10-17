"use client";

import { useEffect, useState } from "react";
import { Search, Eye, Filter, Download, ShoppingCart, Calendar, User, Package, CreditCard, X, Trash2, Loader2 } from "lucide-react";
import { Order } from "@/types";
import { createBrowserClient } from "@/lib/supabase";

interface OrdersTabProps {
    orders: Order[];
    loadError?: string;
    onRefresh: () => void;
}

interface ManualPaymentRequest {
    id: string;
    method: 'mobile_money' | 'binance';
    amount_minor: number;
    currency: 'RWF' | 'USDT';
    display_amount_minor: number;
    display_currency: 'USD' | 'RWF' | 'USDT';
    original_amount_cents: number;
    original_currency: string;
    exchange_rate: number;
    rate_source: string;
    rate_as_of: string;
    quote_expires_at: string;
    full_name: string;
    sender_phone: string | null;
    customer_binance_id: string | null;
    transaction_reference: string | null;
    status: 'pending' | 'verifying' | 'paid' | 'rejected';
    reviewed_by: string | null;
    reviewed_at: string | null;
    rejection_reason: string | null;
}

export function OrdersTab({ orders, loadError, onRefresh }: OrdersTabProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
    const [deliveryRequest, setDeliveryRequest] = useState<any | null>(null);
    const [deliveryLoading, setDeliveryLoading] = useState(false);
    const [manualPayment, setManualPayment] = useState<ManualPaymentRequest | null>(null);
    const [manualPaymentLoading, setManualPaymentLoading] = useState(false);
    const [manualPaymentAction, setManualPaymentAction] = useState(false);
    const [manualPaymentReason, setManualPaymentReason] = useState("");
    const [manualPaymentError, setManualPaymentError] = useState("");

    useEffect(() => {
        let cancelled = false;
        const loadDelivery = async () => {
            if (!selectedOrder || selectedOrder.product_type !== 'bot' || selectedOrder.metadata?.delivery_method !== 'manual_email') {
                setDeliveryRequest(null);
                return;
            }
            setDeliveryLoading(true);
            const { data, error } = await createBrowserClient()
                .from('bot_delivery_requests')
                .select('id, full_name, email, mt5_account_number, status, delivered_at')
                .eq('order_id', selectedOrder.id)
                .maybeSingle();
            if (error) {
                console.error('Unable to load bot delivery request:', error);
            }
            if (!cancelled) {
                setDeliveryRequest(data || null);
                setDeliveryLoading(false);
            }
        };
        void loadDelivery();
        return () => { cancelled = true; };
    }, [selectedOrder]);

    useEffect(() => {
        let cancelled = false;
        const loadManualPayment = async () => {
            if (!selectedOrder || !['mobile_money', 'binance'].includes(selectedOrder.payment_method || '')) {
                setManualPayment(null);
                setManualPaymentLoading(false);
                setManualPaymentError("");
                return;
            }
            setManualPaymentLoading(true);
            setManualPaymentError("");
            const { data, error } = await createBrowserClient()
                .from('manual_payment_requests')
                .select('*')
                .eq('order_id', selectedOrder.id)
                .maybeSingle();
            if (error) {
                console.error('Unable to load manual payment request:', error);
                setManualPaymentError(error.message);
            }
            if (!cancelled) {
                setManualPayment(data as ManualPaymentRequest | null);
                setManualPaymentLoading(false);
            }
        };
        void loadManualPayment();
        return () => { cancelled = true; };
    }, [selectedOrder]);

    const reviewManualPayment = async (action: 'approve' | 'reject') => {
        if (!manualPayment) return;
        setManualPaymentAction(true);
        setManualPaymentError("");
        try {
            const response = await fetch('/api/admin/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId: manualPayment.id,
                    action,
                    reason: manualPaymentReason,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Unable to update payment verification.');
            setManualPayment((current) => current
                ? {
                    ...current,
                    status: action === 'approve' ? 'paid' : 'rejected',
                    rejection_reason: action === 'reject' ? manualPaymentReason.trim() : null,
                    reviewed_at: new Date().toISOString(),
                }
                : current);
            if (action === 'approve' && selectedOrder) {
                setSelectedOrder({ ...selectedOrder, status: 'completed' });
            }
            await onRefresh();
        } catch (error) {
            console.error('Unable to review manual payment:', error);
            setManualPaymentError(error instanceof Error ? error.message : 'Unable to update payment verification.');
        } finally {
            setManualPaymentAction(false);
        }
    };

    const markDelivered = async () => {
        if (!selectedOrder) return;
        setDeliveryLoading(true);
        try {
            const response = await fetch('/api/admin/bot-deliveries/mark-delivered', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: selectedOrder.id }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to update delivery.');
            setDeliveryRequest((current: any) => ({ ...current, status: 'delivered', delivered_at: new Date().toISOString() }));
            await onRefresh();
        } catch (error) {
            console.error('Unable to mark bot delivered:', error);
            alert(error instanceof Error ? error.message : 'Unable to update delivery status.');
        } finally {
            setDeliveryLoading(false);
        }
    };

    const filteredOrders = orders.filter(order => {
        const email = (order as any).user?.email || "";
        const productName = (order as any).product?.name || "";
        const searchLower = searchTerm.toLowerCase();

        const matchesSearch =
            order.id.toLowerCase().includes(searchLower) ||
            email.toLowerCase().includes(searchLower) ||
            productName.toLowerCase().includes(searchLower);

        const matchesStatus = statusFilter === "all"
            || order.status === statusFilter
            || (statusFilter === "needs_review" &&
                (order.manual_payment_status === "pending" || order.manual_payment_status === "verifying"));

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

            {loadError && (
                <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    Unable to load orders: {loadError}
                </div>
            )}

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
                        <option value="needs_review">Manual payment needs review</option>
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
                        {order.manual_payment_status && (
                            <div className="mb-3 flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                                <span className="text-xs text-amber-200">
                                    Manual payment · {order.manual_payment_status}
                                </span>
                                {["pending", "verifying"].includes(order.manual_payment_status) && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedOrder(order)}
                                        className="text-xs font-semibold text-gold-300 underline underline-offset-2"
                                    >
                                        Review
                                    </button>
                                )}
                            </div>
                        )}

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
                                <span className="text-lg font-mono font-bold text-white">{new Intl.NumberFormat('en-US', { style: 'currency', currency: order.currency || 'USD' }).format(Number(order.amount ?? (Number((order as any).amount_cents ?? 0) / 100)))} </span>
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
                                    <p className="text-lg font-mono font-bold text-white">{new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedOrder.currency || 'USD' }).format(Number(selectedOrder.amount ?? (Number(selectedOrder.amount_cents ?? 0) / 100)))}</p>
                                </div>
                            </div>

                            {selectedOrder.product_type === 'bot' && selectedOrder.metadata?.delivery_method === 'manual_email' && (
                                <div className="rounded-xl border border-gold-500/20 bg-gold-500/5 p-4">
                                    <h4 className="mb-3 font-semibold text-white">Manual bot delivery</h4>
                                    {deliveryLoading ? <p className="text-sm text-gray-400">Loading delivery details...</p> : deliveryRequest ? (
                                        <div className="space-y-2 text-sm">
                                            <p>Customer: <span className="text-white">{deliveryRequest.full_name}</span></p>
                                            <p>Email: <a className="text-gold-300 underline" href={`mailto:${deliveryRequest.email}`}>{deliveryRequest.email}</a></p>
                                            <p>MT5 account: <span className="font-mono text-white">{deliveryRequest.mt5_account_number}</span></p>
                                            <p>Status: <span className="capitalize text-white">{deliveryRequest.status.replace('_', ' ')}</span></p>
                                            {selectedOrder.status === 'completed' && deliveryRequest.status === 'pending_delivery' && (
                                                <button type="button" disabled={deliveryLoading} onClick={markDelivered} className="mt-2 rounded-lg bg-gold-500 px-4 py-2 font-semibold text-dark-950 disabled:opacity-50">
                                                    Mark emailed and delivered
                                                </button>
                                            )}
                                        </div>
                                    ) : <p className="text-sm text-gray-400">No delivery details are available for this order.</p>}
                                </div>
                            )}

                            {['mobile_money', 'binance'].includes(selectedOrder.payment_method || '') && (
                                <div className="rounded-xl border border-gold-500/20 bg-gold-500/5 p-4">
                                    <h4 className="mb-3 font-semibold text-white">Manual payment verification</h4>
                                    {manualPaymentLoading ? <p className="text-sm text-gray-400">Loading payment request...</p> : manualPayment ? (
                                        <div className="space-y-2 text-sm">
                                            <p>Method: <span className="text-white">{manualPayment.method === 'mobile_money' ? 'Mobile Money' : 'Binance Pay ID'}</span></p>
                                            <p>Transfer amount: <span className="font-mono text-white">
                                                {new Intl.NumberFormat('en-US', {
                                                    minimumFractionDigits: manualPayment.currency === 'RWF' ? 0 : 2,
                                                    maximumFractionDigits: manualPayment.currency === 'RWF' ? 0 : 2,
                                                }).format(manualPayment.amount_minor / (manualPayment.currency === 'RWF' ? 1 : 100))} {manualPayment.currency}
                                            </span></p>
                                            <p>Original price: <span className="font-mono text-white">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: manualPayment.original_currency }).format(manualPayment.original_amount_cents / 100)}
                                            </span></p>
                                            <p>Customer display quote: <span className="font-mono text-white">
                                                {new Intl.NumberFormat('en-US', {
                                                    minimumFractionDigits: manualPayment.display_currency === 'RWF' ? 0 : 2,
                                                    maximumFractionDigits: manualPayment.display_currency === 'RWF' ? 0 : 2,
                                                }).format(manualPayment.display_amount_minor / (manualPayment.display_currency === 'RWF' ? 1 : 100))} {manualPayment.display_currency}
                                            </span></p>
                                            <p>Exchange rate: <span className="font-mono text-white">{Number(manualPayment.exchange_rate).toPrecision(8)} {manualPayment.currency} per USD</span></p>
                                            <p>Rate source: <span className="text-white">{manualPayment.rate_source}</span></p>
                                            <p>Rate timestamp: <span className="text-white">{new Date(manualPayment.rate_as_of).toLocaleString()}</span></p>
                                            <p>Customer name: <span className="text-white">{manualPayment.full_name}</span></p>
                                            {manualPayment.sender_phone && <p>Sender phone: <span className="font-mono text-white">{manualPayment.sender_phone}</span></p>}
                                            {manualPayment.customer_binance_id && <p>Customer Binance ID: <span className="font-mono text-white">{manualPayment.customer_binance_id}</span></p>}
                                            <p>Transaction/reference: <span className="font-mono text-white">{manualPayment.transaction_reference || 'Not submitted yet'}</span></p>
                                            <p>Status: <span className="capitalize text-white">{manualPayment.status}</span></p>
                                            {manualPayment.reviewed_by && <p>Reviewed by: <span className="font-mono text-white">{manualPayment.reviewed_by}</span></p>}
                                            {manualPayment.reviewed_at && <p>Reviewed at: <span className="text-white">{new Date(manualPayment.reviewed_at).toLocaleString()}</span></p>}
                                            {manualPayment.rejection_reason && <p className="text-red-300">Rejection reason: {manualPayment.rejection_reason}</p>}
                                            {manualPayment.status === 'pending' && (
                                                <div className="space-y-2 border-t border-dark-700 pt-3">
                                                    <p className="text-xs text-gray-400">Confirm the transfer against the provider account and reference before approving.</p>
                                                    {!manualPayment.transaction_reference && <p className="text-xs text-amber-300">A reference is required before approval.</p>}
                                                    <label className="block text-xs text-gray-400" htmlFor="manual-payment-rejection-reason">Rejection reason (required only to reject)</label>
                                                    <textarea
                                                        id="manual-payment-rejection-reason"
                                                        value={manualPaymentReason}
                                                        onChange={(event) => setManualPaymentReason(event.target.value)}
                                                        maxLength={500}
                                                        className="dark-input min-h-20 w-full"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button type="button" disabled={manualPaymentAction || !manualPayment.transaction_reference} onClick={() => void reviewManualPayment('approve')} className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
                                                            {manualPaymentAction ? 'Checking...' : 'Approve and grant access'}
                                                        </button>
                                                        <button type="button" disabled={manualPaymentAction || manualPaymentReason.trim().length < 5} onClick={() => void reviewManualPayment('reject')} className="rounded-lg border border-red-500/50 px-4 py-2 font-semibold text-red-300 disabled:opacity-50">
                                                            Reject payment
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            {manualPayment.status === 'verifying' && (
                                                <p className="border-t border-dark-700 pt-3 text-xs text-amber-200">
                                                    Verification is in progress. Refresh the order shortly before trying another action.
                                                </p>
                                            )}
                                            {manualPayment.status === 'paid' && (
                                                <p className="border-t border-dark-700 pt-3 text-xs text-green-300">
                                                    Approved. Course or product access has been granted.
                                                </p>
                                            )}
                                            {manualPaymentError && <p role="alert" className="text-red-300">{manualPaymentError}</p>}
                                        </div>
                                    ) : manualPaymentError
                                        ? <p role="alert" className="text-sm text-red-300">{manualPaymentError}</p>
                                        : <p className="text-sm text-gray-400">No manual payment request is linked to this order.</p>}
                                </div>
                            )}

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
