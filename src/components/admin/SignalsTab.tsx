"use client";

import { useState } from "react";
import { Plus, Bell, Trash2, X, AlertTriangle, Target, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { TradingSignal, Product } from "@/types";
import { createBrowserClient } from "@/lib/supabase";

interface SignalsTabProps {
    signals: TradingSignal[];
    products: Product[]; // Used to select which plan the signal is for (if needed)
    onRefresh: () => void;
}

export function SignalsTab({ signals, products, onRefresh }: SignalsTabProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [editingSignal, setEditingSignal] = useState<TradingSignal | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [signalToDelete, setSignalToDelete] = useState<TradingSignal | null>(null);

    const [formData, setFormData] = useState({
        symbol: '',
        direction: 'buy',
        entry_price: '',
        stop_loss: '',
        take_profit: '',
        plan_id: '',
        description: '',
        status: 'active'
    });

    const handleOpenCreate = () => {
        setFormData({
            symbol: '',
            direction: 'buy',
            entry_price: '',
            stop_loss: '',
            take_profit: '',
            plan_id: '',
            description: '',
            status: 'active'
        });
        setEditingSignal(null);
        setIsCreating(true);
    };

    const handleOpenEdit = (signal: TradingSignal) => {
        setFormData({
            symbol: signal.symbol,
            direction: signal.direction,
            entry_price: signal.entry_price.toString(),
            stop_loss: signal.stop_loss?.toString() || '',
            take_profit: signal.take_profit?.toString() || '',
            plan_id: signal.plan_id,
            description: signal.description || '',
            status: signal.status
        });
        setEditingSignal(signal);
        setIsCreating(true);
    };

    const handleCreateOrUpdateSignal = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.plan_id) {
            alert("Please select a signal plan");
            return;
        }

        const entryPrice = parseFloat(formData.entry_price);
        if (isNaN(entryPrice)) {
            alert("Please enter a valid entry price");
            return;
        }

        setIsLoading(true);
        const supabase = createBrowserClient();
        try {
            const payload = {
                symbol: formData.symbol.toUpperCase(),
                direction: formData.direction,
                entry_price: entryPrice,
                stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : null,
                take_profit: formData.take_profit ? parseFloat(formData.take_profit) : null,
                plan_id: formData.plan_id,
                description: formData.description,
                status: formData.status
            };

            if (editingSignal) {
                const { error } = await supabase
                    .from('signals')
                    .update(payload)
                    .eq('id', editingSignal.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('signals').insert([payload]);
                if (error) throw error;
            }

            setIsCreating(false);
            setEditingSignal(null);
            onRefresh();

        } catch (err: any) {
            console.error(err);
            alert('Failed to save signal: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = (signal: TradingSignal) => {
        setSignalToDelete(signal);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!signalToDelete) return;
        setIsLoading(true);
        const supabase = createBrowserClient();
        try {
            const { error } = await supabase
                .from('signals')
                .delete()
                .eq('id', signalToDelete.id);
            if (error) throw error;
            setIsDeleteModalOpen(false);
            setSignalToDelete(null);
            onRefresh();
        } catch (err: any) {
            console.error(err);
            alert('Failed to delete signal: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const signalPlans = products.filter(p => p.type === 'signal');

    return (
        <div className="space-y-6">
            {!isCreating ? (
                <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold font-display text-white">Signal Management</h2>
                            <p className="text-gray-400 mt-1">Publish real-time trading signals to your subscribers.</p>
                        </div>
                        <button
                            onClick={handleOpenCreate}
                            className="bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all hover:scale-105 shadow-lg shadow-gold-500/20"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Post Signal</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {signals.map((signal) => (
                            <div key={signal.id} className="group bg-dark-900 border border-dark-800 rounded-2xl p-5 hover:border-gold-500/50 transition-all flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-black text-white tracking-wider">{signal.symbol}</span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(signal.created_at).toLocaleDateString()} {new Date(signal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 ${signal.direction === 'buy' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                            }`}>
                                            {signal.direction === 'buy' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                            {signal.direction === 'buy' ? 'LONG' : 'SHORT'}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${signal.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                            }`}>
                                            {signal.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-4 bg-dark-950/50 p-3 rounded-xl border border-dark-800">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">Entry</span>
                                        <span className="text-sm font-mono text-white font-bold">{signal.entry_price}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-red-500/70 uppercase font-bold mb-1">Stop Loss</span>
                                        <span className="text-sm font-mono text-red-400 font-bold">{signal.stop_loss || 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-green-500/70 uppercase font-bold mb-1">Take Profit</span>
                                        <span className="text-sm font-mono text-green-400 font-bold">{signal.take_profit || 'N/A'}</span>
                                    </div>
                                </div>

                                {signal.description && (
                                    <p className="text-sm text-gray-400 mb-4 line-clamp-2 italic h-10">
                                        "{signal.description}"
                                    </p>
                                )}

                                <div className="mt-auto pt-4 border-t border-dark-800 flex justify-between items-center">
                                    <span className="text-[10px] text-gray-500 truncate max-w-[120px]">
                                        Plan: {(signal as any).plan?.name || 'Loading...'}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenEdit(signal)}
                                            className="p-2 rounded-lg bg-dark-800 hover:bg-gold-500 hover:text-dark-950 text-gray-400 transition-all border border-dark-700 hover:border-gold-500"
                                            title="Edit"
                                        >
                                            <Bell className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(signal)}
                                            className="p-2 rounded-lg bg-dark-800 hover:bg-red-500 hover:text-white text-gray-400 transition-all border border-dark-700 hover:border-red-500"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {signals.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 bg-dark-900/50 rounded-2xl border border-dark-800 border-dashed">
                            <Bell className="w-16 h-16 text-dark-800 mb-4 opacity-20" />
                            <p className="text-xl font-medium text-gray-400">No signals found</p>
                            <p className="text-gray-600 mt-2">Get started by posting your first signal.</p>
                        </div>
                    )}
                </>
            ) : (
                <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold font-display text-white">{editingSignal ? 'Edit Signal' : 'Post New Signal'}</h2>
                        <button
                            onClick={() => setIsCreating(false)}
                            className="px-4 py-2 hover:bg-dark-800 rounded-lg text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
                        >
                            <X className="w-4 h-4" /> Cancel
                        </button>
                    </div>

                    <form onSubmit={handleCreateOrUpdateSignal} className="dark-card p-6 md:p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Pair / Symbol <span className="text-gold-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="e.g. BTCUSD"
                                    className="w-full bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50 transition-colors uppercase font-bold"
                                    value={formData.symbol}
                                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Direction <span className="text-gold-500">*</span></label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, direction: 'buy' })}
                                        className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all ${formData.direction === 'buy' ? 'bg-green-500 text-dark-950 border-green-500' : 'bg-dark-950 border-dark-800 text-gray-400 hover:bg-dark-900'}`}
                                    >
                                        <TrendingUp className="w-4 h-4" /> LONG
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, direction: 'sell' })}
                                        className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all ${formData.direction === 'sell' ? 'bg-red-500 text-white border-red-500' : 'bg-dark-950 border-dark-800 text-gray-400 hover:bg-dark-900'}`}
                                    >
                                        <TrendingDown className="w-4 h-4" /> SHORT
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-dark-950/50 rounded-xl border border-dark-800 space-y-4">
                            <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Price Levels</div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Entry Price <span className="text-gold-500">*</span></label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="0.00"
                                        className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold-500/50 transition-colors font-mono"
                                        value={formData.entry_price}
                                        onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-red-400">Stop Loss</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="0.00"
                                        className="w-full bg-dark-900 border border-red-500/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-red-500 transition-colors font-mono"
                                        value={formData.stop_loss}
                                        onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-green-400">Take Profit</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="0.00"
                                        className="w-full bg-dark-900 border border-green-500/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-500 transition-colors font-mono"
                                        value={formData.take_profit}
                                        onChange={(e) => setFormData({ ...formData, take_profit: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Target Plan <span className="text-gold-500">*</span></label>
                                <select
                                    className="w-full bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50 transition-colors"
                                    value={formData.plan_id}
                                    onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select a Plan...</option>
                                    {signalPlans.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Status</label>
                                <select
                                    className="w-full bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50 transition-colors"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="active">Active</option>
                                    <option value="closed">Closed</option>
                                    <option value="expired">Expired</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Analysis / Description</label>
                            <textarea
                                rows={3}
                                placeholder="Add technical analysis, reasoning..."
                                className="w-full bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50 transition-colors resize-none"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="pt-6 flex justify-end gap-4 border-t border-dark-800">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="px-6 py-3 rounded-xl border border-dark-700 text-gray-400 hover:text-white font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold px-8 py-3 rounded-xl shadow-lg shadow-gold-500/20 transition-all hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:scale-100"
                            >
                                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {editingSignal ? 'Update Signal' : 'Publish Signal'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && signalToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4">
                        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Delete Signal?</h3>
                            <p className="text-gray-400 mt-2 text-sm">
                                Are you sure you want to delete the signal for <span className="text-white font-bold">{signalToDelete.symbol}</span>?
                            </p>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 px-4 py-2 rounded-xl border border-dark-700 text-gray-400 hover:text-white font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
