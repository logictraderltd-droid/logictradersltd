"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, X, Check, Upload, AlertCircle, Loader2, Package, Video, Bot, LineChart, Link as LinkIcon, Download as DownloadIcon, Play, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { CldUploadWidget } from 'next-cloudinary';
import { Product } from "@/types";
import { createBrowserClient } from "@/lib/supabase";

interface ProductsTabProps {
    products: Product[];
    onRefresh: () => void;
}

export function ProductsTab({ products, onRefresh }: ProductsTabProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Filter & Search states
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("newest");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 6; // Adjusted to display 2 rows (3 columns x 2 rows)

    // Form states
    const [formData, setFormData] = useState<Partial<Product>>({
        name: "",
        description: "",
        type: "course",
        price: 0,
        currency: "USD",
        is_active: true,
        thumbnail_url: "",
    });

    // Additional state for specific fields
    const [videoUrl, setVideoUrl] = useState("");
    const [downloadUrl, setDownloadUrl] = useState("");
    const [visitUrl, setVisitUrl] = useState("");

    // Metadata Fields
    const [level, setLevel] = useState("beginner");
    const [duration, setDuration] = useState("");
    const [instructor, setInstructor] = useState("");
    const [lessonsCount, setLessonsCount] = useState<number>(0);
    const [studentsCount, setStudentsCount] = useState<number>(0);
    const [rating, setRating] = useState<number>(4.8);
    const [listItems, setListItems] = useState<string[]>([]); // Features or What You'll Learn
    const [requirements, setRequirements] = useState<string[]>([]);
    const [newListItem, setNewListItem] = useState("");
    const [newRequirement, setNewRequirement] = useState("");

    // Lesson Management
    const [isLessonsModalOpen, setIsLessonsModalOpen] = useState(false);
    const [activeCourseForLessons, setActiveCourseForLessons] = useState<Product | null>(null);
    const [lessons, setLessons] = useState<any[]>([]);
    const [isAddingLesson, setIsAddingLesson] = useState(false);
    const [editingLesson, setEditingLesson] = useState<any | null>(null);
    const [lessonForm, setLessonForm] = useState({
        title: "",
        description: "",
        video_url: "",
        cloudinary_public_id: "",
        order_index: 0,
        is_preview: false
    });

    const handleOpenModal = (product?: Product) => {
        setNotification(null);
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                description: product.description,
                type: product.type,
                price: product.price,
                currency: product.currency,
                is_active: product.is_active,
                thumbnail_url: product.thumbnail_url || "",
            });
            // Extract specialized fields
            setVideoUrl(product.metadata?.video_url || "");
            setVisitUrl(product.metadata?.visit_url || "");
            setDownloadUrl((product as any).download_url || product.metadata?.download_url || "");

            // Set metadata fields
            setLevel(product.metadata?.level || "beginner");
            setDuration(product.metadata?.duration || "");
            setInstructor(product.metadata?.instructor || "");
            setLessonsCount(product.metadata?.lessons || 0);
            setStudentsCount(product.metadata?.students || 0);
            setRating(product.metadata?.rating || 4.8);
            setListItems(product.type === 'course' ? (product.metadata?.what_you_learn || []) : (product.metadata?.features || []));
            setRequirements(product.metadata?.requirements || []);
        } else {
            setEditingProduct(null);
            setFormData({
                name: "",
                description: "",
                type: "course",
                price: 0,
                currency: "USD",
                is_active: true,
                thumbnail_url: "",
            });
            setVideoUrl("");
            setDownloadUrl("");
            setVisitUrl("");
            setLevel("beginner");
            setDuration("");
            setInstructor("");
            setLessonsCount(0);
            setStudentsCount(0);
            setRating(4.8);
            setListItems([]);
            setRequirements([]);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setNotification(null);

        const supabase = createBrowserClient();

        try {
            console.log("Submitting product form...");

            // Validate price
            const priceValue = parseFloat(formData.price?.toString() || "0");
            if (isNaN(priceValue)) {
                throw new Error("Invalid price value");
            }

            // Validate thumbnail (prevent Base64)
            if (formData.thumbnail_url?.startsWith('data:')) {
                throw new Error("Thumbnail cannot be a pasted image (Base64). Please use the 'Upload' button or a direct https:// link.");
            }

            // Prepare payload
            const payload: any = {
                ...formData,
                price: priceValue,
                metadata: {
                    ...(editingProduct?.metadata || {}),
                }
            };

            // Add type-specific fields
            if (formData.type === 'course') {
                payload.metadata.video_url = videoUrl;
                payload.metadata.level = level;
                payload.metadata.duration = duration;
                payload.metadata.instructor = instructor;
                payload.metadata.lessons = lessonsCount;
                payload.metadata.what_you_learn = listItems;
            } else if (formData.type === 'bot') {
                payload.metadata.visit_url = visitUrl;
                payload.metadata.download_url = downloadUrl;
                payload.metadata.features = listItems;
            } else if (formData.type === 'signal') {
                payload.metadata.features = listItems;
            }

            // Global metadata
            payload.metadata.students = studentsCount;
            payload.metadata.rating = rating;
            payload.metadata.requirements = requirements;

            // Cleanup payload
            if (!payload.thumbnail_url) delete payload.thumbnail_url;

            // Remove 'id' if present in payload to prevent PK update errors on insert
            delete payload.id;
            delete payload.created_at;
            delete payload.updated_at;

            console.log("Payload:", payload);

            let error;

            if (editingProduct) {
                console.log("Updating product:", editingProduct.id);
                // We add .select() only if we specifically need the returned data, 
                // but for simple updates, removing it avoids recursive RLS checks in some cases.
                const { error: updateError } = await supabase
                    .from("products")
                    .update(payload)
                    .eq("id", editingProduct.id);
                error = updateError;
                if (!error) setNotification({ type: 'success', message: 'Product updated successfully' });
            } else {
                console.log("Creating new product");
                const { error: insertError } = await supabase
                    .from("products")
                    .insert([payload]);
                error = insertError;
                if (!error) setNotification({ type: 'success', message: 'Product created successfully' });
            }

            if (error) {
                console.error("Supabase Error details:", error);
                throw error;
            }

            console.log("Submission successful");

            // Critical: Close modal FIRST before triggering refresh
            setIsModalOpen(false);
            setNotification({
                type: 'success',
                message: `Product ${editingProduct ? 'updated' : 'created'} successfully`
            });

            // Trigger background refresh - don't let it block the local state reset
            onRefresh();

        } catch (error: any) {
            console.error("Error saving product:", error);
            setNotification({
                type: 'error',
                message: error.message || 'Failed to save product. Ensure you have admin permissions.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Delete state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);

    const handleDeleteClick = (product: Product) => {
        setProductToDelete(product);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!productToDelete) return;
        setIsLoading(true);
        const supabase = createBrowserClient();

        try {
            console.log("Deleting product:", productToDelete.id);
            const { error } = await supabase
                .from("products")
                .delete()
                .eq("id", productToDelete.id);

            if (error) throw error;

            setNotification({ type: 'success', message: 'Product deleted successfully' });
            setIsDeleteModalOpen(false);
            onRefresh();
        } catch (error: any) {
            console.error("Error deleting product:", error);
            setNotification({ type: 'error', message: error.message || 'Failed to delete product' });
        } finally {
            setIsLoading(false);
            setProductToDelete(null);
        }
    };

    const handleManageLessons = async (product: Product) => {
        setActiveCourseForLessons(product);
        setIsLessonsModalOpen(true);
        fetchLessons(product.id);
    };

    const fetchLessons = async (courseId: string) => {
        setIsLoading(true);
        const supabase = createBrowserClient();
        const { data, error } = await supabase
            .from('course_lessons')
            .select('*')
            .eq('course_id', courseId)
            .order('order_index', { ascending: true });

        if (error) {
            setNotification({ type: 'error', message: 'Failed to fetch lessons' });
        } else {
            setLessons(data || []);
        }
        setIsLoading(false);
    };

    const handleSaveLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeCourseForLessons) return;
        setIsLoading(true);

        const supabase = createBrowserClient();
        const payload = {
            ...lessonForm,
            course_id: activeCourseForLessons.id
        };

        try {
            if (editingLesson) {
                const { error } = await supabase
                    .from('course_lessons')
                    .update(payload)
                    .eq('id', editingLesson.id);
                if (error) throw error;
                setNotification({ type: 'success', message: 'Lesson updated successfully' });
            } else {
                const { error } = await supabase
                    .from('course_lessons')
                    .insert([payload]);
                if (error) throw error;
                setNotification({ type: 'success', message: 'Lesson created successfully' });
            }

            setIsAddingLesson(false);
            setEditingLesson(null);
            // Refresh lessons list immediately
            await fetchLessons(activeCourseForLessons.id);
        } catch (error: any) {
            console.error("Error saving lesson:", error);
            setNotification({ type: 'error', message: error.message || 'Failed to save lesson. Check RLS policies.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteLesson = async (lessonId: string) => {
        if (!confirm('Are you sure you want to delete this lesson?')) return;
        setIsLoading(true);
        const supabase = createBrowserClient();
        try {
            const { error } = await supabase
                .from('course_lessons')
                .delete()
                .eq('id', lessonId);
            if (error) throw error;
            if (activeCourseForLessons) await fetchLessons(activeCourseForLessons.id);
            setNotification({ type: 'success', message: 'Lesson deleted successfully' });
        } catch (error: any) {
            console.error("Error deleting lesson:", error);
            setNotification({ type: 'error', message: error.message || 'Failed to delete lesson' });
        } finally {
            setIsLoading(false);
        }
    };

    // Filtered and sorted products
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === "all" || product.type === typeFilter;
        const matchesStatus = statusFilter === "all" ||
            (statusFilter === "active" ? product.is_active : !product.is_active);

        return matchesSearch && matchesType && matchesStatus;
    }).sort((a, b) => {
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "price-desc") return b.price - a.price;
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, typeFilter, statusFilter]);

    const stats = {
        total: products.length,
        active: products.filter(p => p.is_active).length,
        draft: products.filter(p => !p.is_active).length,
        courses: products.filter(p => p.type === 'course').length,
        bots: products.filter(p => p.type === 'bot').length,
        signals: products.filter(p => p.type === 'signal').length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-display text-white">Product Management</h2>
                    <p className="text-gray-400 mt-1">Manage your courses, bots, and signal plans.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all hover:scale-105 shadow-lg shadow-gold-500/20"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add Product</span>
                </button>
            </div>

            {/* Notification */}
            {notification && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${notification.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                    {notification.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {notification.message}
                    <button onClick={() => setNotification(null)} className="ml-auto hover:text-white"><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[
                    { label: 'Total', value: stats.total, color: 'text-gray-400' },
                    { label: 'Active', value: stats.active, color: 'text-green-400' },
                    { label: 'Draft', value: stats.draft, color: 'text-amber-400' },
                    { label: 'Courses', value: stats.courses, color: 'text-purple-400' },
                    { label: 'Bots', value: stats.bots, color: 'text-blue-400' },
                    { label: 'Signals', value: stats.signals, color: 'text-gold-400' },
                ].map((stat, i) => (
                    <div key={i} className="bg-dark-900 border border-dark-800 p-4 rounded-2xl">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1">{stat.label}</p>
                        <p className={`text-2xl font-mono font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by name or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-gold-500/50 transition-all"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="bg-dark-900 border border-dark-800 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-gold-500/50"
                    >
                        <option value="all">All Types</option>
                        <option value="course">Courses</option>
                        <option value="bot">Bots</option>
                        <option value="signal">Signals</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-dark-900 border border-dark-800 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-gold-500/50"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                    </select>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-dark-900 border border-dark-800 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-gold-500/50"
                    >
                        <option value="newest">Newest</option>
                        <option value="name">Name</option>
                        <option value="price-asc">Price: Low to High</option>
                        <option value="price-desc">Price: High to Low</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedProducts.map((product) => (
                    <div key={product.id} className="group bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden hover:border-gold-500/50 transition-all hover:shadow-xl hover:shadow-gold-500/5 flex flex-col">
                        {/* Card Image */}
                        <div className="relative aspect-video bg-dark-800 overflow-hidden">
                            {product.thumbnail_url ? (
                                <img
                                    src={product.thumbnail_url}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-700 bg-dark-800">
                                    <Package className="w-12 h-12 opacity-20" />
                                </div>
                            )}

                            {/* Type Badge Overlay */}
                            <div className="absolute top-3 left-3">
                                <span className={`backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold border shadow-lg ${product.type === 'course' ? 'bg-purple-500/20 text-purple-200 border-purple-500/30' :
                                    product.type === 'bot' ? 'bg-amber-500/20 text-amber-200 border-amber-500/30' :
                                        'bg-blue-500/20 text-blue-200 border-blue-500/30'
                                    }`}>
                                    {product.type}
                                </span>
                            </div>

                            {/* Status Badge Overlay */}
                            <div className="absolute top-3 right-3">
                                <div className={`px-2 py-1 rounded-lg text-xs font-bold uppercase backdrop-blur-md flex items-center gap-1.5 border shadow-lg ${product.is_active
                                    ? "bg-green-500/20 text-green-200 border-green-500/30"
                                    : "bg-gray-500/20 text-gray-300 border-gray-500/30"
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${product.is_active ? "bg-green-400 animate-pulse" : "bg-gray-400"}`}></span>
                                    {product.is_active ? "Active" : "Draft"}
                                </div>
                            </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-gold-400 transition-colors" title={product.name}>
                                    {product.name}
                                </h3>
                                <p className="text-sm text-gray-400 line-clamp-2 mb-4 h-10">
                                    {product.description}
                                </p>
                            </div>

                            <div className="flex items-end justify-between pt-4 border-t border-dark-800/50 mt-2">
                                <div className="font-mono font-bold text-white text-xl">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency }).format(product.price)}
                                </div>
                                <div className="flex gap-2">
                                    {product.type === 'course' && (
                                        <button
                                            onClick={() => handleManageLessons(product)}
                                            className="p-2 rounded-lg bg-dark-800 hover:bg-purple-500 hover:text-white text-gray-400 transition-all border border-dark-700 hover:border-purple-500"
                                            title="Manage Lessons"
                                        >
                                            <Video className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleOpenModal(product)}
                                        className="p-2 rounded-lg bg-dark-800 hover:bg-gold-500 hover:text-dark-950 text-gray-400 transition-all border border-dark-700 hover:border-gold-500"
                                        title="Edit"
                                        aria-label="Edit product"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(product)}
                                        className="p-2 rounded-lg bg-dark-800 hover:bg-red-500 hover:text-white text-gray-400 transition-all border border-dark-700 hover:border-red-500"
                                        title="Delete"
                                        aria-label="Delete product"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 py-8 border-t border-dark-800">
                    <button
                        type="button"
                        onClick={() => {
                            setCurrentPage(prev => Math.max(1, prev - 1));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        disabled={currentPage === 1}
                        className="flex items-center gap-2 px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-gray-400 hover:text-white hover:border-gold-500 disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:border-dark-800 transition-all font-bold group"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span>Previous</span>
                    </button>

                    <div className="flex items-center gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                type="button"
                                onClick={() => {
                                    setCurrentPage(page);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={`w-10 h-10 rounded-xl font-mono text-sm border transition-all ${currentPage === page
                                    ? 'bg-gold-500 border-gold-500 text-dark-950 font-bold'
                                    : 'bg-dark-900 border-dark-800 text-gray-400 hover:border-gold-500/50'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setCurrentPage(prev => Math.min(totalPages, prev + 1));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-2 px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl text-gray-400 hover:text-white hover:border-gold-500 disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:border-dark-800 transition-all font-bold group"
                    >
                        <span>Next</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            )}

            {products.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-dark-900/50 rounded-2xl border border-dark-800 border-dashed">
                    <Package className="w-16 h-16 text-dark-800 mb-4" />
                    <p className="text-xl font-medium text-gray-400">No products found</p>
                    <p className="text-gray-600 mt-2">Get started by creating your first product.</p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="mt-6 px-6 py-2 bg-dark-800 hover:bg-gold-500 hover:text-dark-950 text-white rounded-xl transition-all font-medium"
                    >
                        Create Product
                    </button>
                </div>
            )}


            {/* Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                            <div className="flex items-center justify-between p-6 border-b border-dark-800 sticky top-0 bg-dark-900 z-10">
                                <h3 className="text-xl font-bold text-white">
                                    {editingProduct ? "Edit Product" : "New Product"}
                                </h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-gray-500 hover:text-white transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-8">

                                {/* Product Type Selection */}
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { id: 'course', label: 'Course', icon: Video },
                                        { id: 'bot', label: 'Trading Bot', icon: Bot },
                                        { id: 'signal', label: 'Signal Plan', icon: LineChart },
                                    ].map((type) => (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: type.id as any })}
                                            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${formData.type === type.id
                                                ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                                                : 'border-dark-800 bg-dark-950 text-gray-500 hover:border-gold-500/50 hover:text-gray-300'
                                                }`}
                                        >
                                            <type.icon className="w-6 h-6" />
                                            <span className="font-bold text-sm">{type.label}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Section: Basic Info */}
                                <div className="space-y-4">
                                    <h4 className="text-sm uppercase tracking-wider text-gray-500 font-semibold border-b border-dark-800 pb-2">Basic Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-400">Product Name <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50 transition-colors"
                                                placeholder={`e.g. ${formData.type === 'bot' ? 'SuperScalper Bot' : 'Pro Trading Course'}`}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-400">Thumbnail URL</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="url"
                                                    value={formData.thumbnail_url || ""}
                                                    onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                                                    className="flex-1 bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50 transition-colors"
                                                    placeholder="https://example.com/image.jpg"
                                                />
                                                <CldUploadWidget
                                                    uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "logic_traders_unsigned"}
                                                    onSuccess={(result: any) => {
                                                        if (result.info?.secure_url) {
                                                            setFormData({ ...formData, thumbnail_url: result.info.secure_url });
                                                        }
                                                    }}
                                                >
                                                    {({ open }) => (
                                                        <button
                                                            type="button"
                                                            onClick={() => open()}
                                                            className="px-4 py-2 bg-dark-800 hover:bg-gold-500 hover:text-dark-950 text-gray-300 rounded-xl border border-dark-700 transition-all flex items-center gap-2"
                                                        >
                                                            <Upload className="w-4 h-4" /> Upload
                                                        </button>
                                                    )}
                                                </CldUploadWidget>
                                            </div>
                                            <p className="text-xs text-gray-500">Upload an image for the product card. Do not paste Base64 image data directly.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-400">Description <span className="text-red-500">*</span></label>
                                        <textarea
                                            required
                                            rows={3}
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50 transition-colors resize-none"
                                            placeholder="Describe features, benefits, and what's included..."
                                        />
                                    </div>
                                </div>

                                {/* Section: Type Specific Fields */}
                                {formData.type !== 'signal' && (
                                    <div className="space-y-4">
                                        <h4 className="text-sm uppercase tracking-wider text-gray-500 font-semibold border-b border-dark-800 pb-2">
                                            {formData.type === 'course' ? 'Course Content' : 'Bot Resources'}
                                        </h4>

                                        {formData.type === 'course' && (
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                                    <Video className="w-4 h-4 text-gold-500" />
                                                    Video URL
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="url"
                                                        value={videoUrl}
                                                        onChange={(e) => setVideoUrl(e.target.value)}
                                                        className="flex-1 bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50 transition-colors"
                                                        placeholder="http://..."
                                                    />
                                                    <CldUploadWidget
                                                        uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "logic_traders_unsigned"}
                                                        onSuccess={(result: any) => {
                                                            if (result.info?.secure_url) setVideoUrl(result.info.secure_url);
                                                        }}
                                                    >
                                                        {({ open }) => (
                                                            <button
                                                                type="button"
                                                                onClick={() => open()}
                                                                className="px-4 py-2 bg-dark-800 hover:bg-gold-500 hover:text-dark-950 text-gray-300 rounded-xl border border-dark-700 transition-all flex items-center gap-2"
                                                            >
                                                                <Upload className="w-4 h-4" /> Upload
                                                            </button>
                                                        )}
                                                    </CldUploadWidget>
                                                </div>
                                                <p className="text-xs text-gray-500">Provide a link to the course video or upload one.</p>
                                            </div>
                                        )}

                                        {formData.type === 'bot' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                                        <DownloadIcon className="w-4 h-4 text-gold-500" />
                                                        Download Link
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="url"
                                                            value={downloadUrl}
                                                            onChange={(e) => setDownloadUrl(e.target.value)}
                                                            className="flex-1 bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50 transition-colors"
                                                            placeholder="http://..."
                                                        />
                                                        <CldUploadWidget
                                                            uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "logic_traders_unsigned"}
                                                            onSuccess={(result: any) => {
                                                                if (result.info?.secure_url) setDownloadUrl(result.info.secure_url);
                                                            }}
                                                        >
                                                            {({ open }) => (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => open()}
                                                                    className="px-4 py-2 bg-dark-800 hover:bg-gold-500 hover:text-dark-950 text-gray-300 rounded-xl border border-dark-700 transition-all flex items-center gap-2"
                                                                >
                                                                    <Upload className="w-4 h-4" /> Upload
                                                                </button>
                                                            )}
                                                        </CldUploadWidget>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                                        <LinkIcon className="w-4 h-4 text-gold-500" />
                                                        Visit / Demo Link
                                                    </label>
                                                    <input
                                                        type="url"
                                                        value={visitUrl}
                                                        onChange={(e) => setVisitUrl(e.target.value)}
                                                        className="w-full bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50 transition-colors"
                                                        placeholder="https://example.com/demo"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Market Stats */}
                                <div className="space-y-4">
                                    <h4 className="text-sm uppercase tracking-wider text-gray-500 font-semibold border-b border-dark-800 pb-2">Marketing Stats</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-400">Rating (0-5)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                max="5"
                                                min="0"
                                                value={rating}
                                                onChange={(e) => setRating(parseFloat(e.target.value))}
                                                className="w-full bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50 transition-colors font-mono"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-400">Students / Users</label>
                                            <input
                                                type="number"
                                                value={studentsCount}
                                                onChange={(e) => setStudentsCount(parseInt(e.target.value))}
                                                className="w-full bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50 transition-colors font-mono"
                                            />
                                        </div>
                                        {formData.type === 'course' && (
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-400">Lessons Count</label>
                                                <input
                                                    type="number"
                                                    value={lessonsCount}
                                                    onChange={(e) => setLessonsCount(parseInt(e.target.value))}
                                                    className="w-full bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50 transition-colors font-mono"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Dynamic Lists */}
                                <div className="space-y-6">
                                    <h4 className="text-sm uppercase tracking-wider text-gray-500 font-semibold border-b border-dark-800 pb-2">
                                        {formData.type === 'course' ? "What You'll Learn" : "Features"} & Requirements
                                    </h4>

                                    {/* Features / Learn List */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-gray-400">
                                            {formData.type === 'course' ? "Learning Objectives" : "Product Features"}
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newListItem}
                                                onChange={(e) => setNewListItem(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), newListItem && (setListItems([...listItems, newListItem]), setNewListItem("")))}
                                                className="flex-1 bg-dark-950 border border-dark-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-gold-500/50"
                                                placeholder={`Add ${formData.type === 'course' ? 'learning point' : 'feature'}...`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => { if (newListItem) { setListItems([...listItems, newListItem]); setNewListItem(""); } }}
                                                className="px-4 py-2 bg-dark-800 hover:bg-gold-500 hover:text-dark-950 text-gray-300 rounded-xl border border-dark-700 transition-all font-bold"
                                            >
                                                Add
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 min-h-[40px] p-4 bg-dark-950/50 border border-dark-800 border-dashed rounded-xl">
                                            {listItems.map((item, i) => (
                                                <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-gold-500/10 text-gold-400 border border-gold-500/20 rounded-lg text-xs font-medium group">
                                                    {item}
                                                    <button type="button" onClick={() => setListItems(listItems.filter((_, idx) => idx !== i))} className="hover:text-red-500 ml-1">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                            {listItems.length === 0 && <span className="text-gray-600 text-xs italic">No items added yet</span>}
                                        </div>
                                    </div>

                                    {/* Requirements List */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-gray-400">Requirements / Prerequisites</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newRequirement}
                                                onChange={(e) => setNewRequirement(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), newRequirement && (setRequirements([...requirements, newRequirement]), setNewRequirement("")))}
                                                className="flex-1 bg-dark-950 border border-dark-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-gold-500/50"
                                                placeholder="Add requirement..."
                                            />
                                            <button
                                                type="button"
                                                onClick={() => { if (newRequirement) { setRequirements([...requirements, newRequirement]); setNewRequirement(""); } }}
                                                className="px-4 py-2 bg-dark-800 hover:bg-gold-500 hover:text-dark-950 text-gray-300 rounded-xl border border-dark-700 transition-all font-bold"
                                            >
                                                Add
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 min-h-[40px] p-4 bg-dark-950/50 border border-dark-800 border-dashed rounded-xl">
                                            {requirements.map((item, i) => (
                                                <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-dark-800 text-gray-400 border border-dark-700 rounded-lg text-xs font-medium group">
                                                    {item}
                                                    <button type="button" onClick={() => setRequirements(requirements.filter((_, idx) => idx !== i))} className="hover:text-red-500 ml-1">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                            {requirements.length === 0 && <span className="text-gray-600 text-xs italic">No requirements added yet</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Pricing & Settings */}
                                <div className="space-y-4">
                                    <h4 className="text-sm uppercase tracking-wider text-gray-500 font-semibold border-b border-dark-800 pb-2">Pricing & Visibility</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-400">Price <span className="text-red-500">*</span></label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        required
                                                        min="0"
                                                        value={formData.price}
                                                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                                        className="w-full bg-dark-950 border border-dark-800 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-gold-500/50 transition-colors font-mono"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-gray-400">Currency</label>
                                                <select
                                                    value={formData.currency}
                                                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                                    className="w-full bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50 transition-colors"
                                                >
                                                    <option value="USD">USD</option>
                                                    <option value="EUR">EUR</option>
                                                    <option value="GBP">GBP</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="h-full flex items-center pt-6">
                                            <label className="flex items-center gap-3 cursor-pointer select-none group">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.is_active}
                                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                                    className="w-5 h-5 rounded border-gray-600 text-gold-500 focus:ring-gold-500 bg-dark-900 transition-all"
                                                    style={{ accentColor: '#EAB308' }}
                                                />
                                                <div>
                                                    <span className="text-white font-medium block">Active Product</span>
                                                    <span className="text-xs text-gray-500 block">Visible to customers in dashboard</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 flex justify-end gap-3 border-t border-dark-800">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-2.5 rounded-xl border border-dark-700 text-gray-400 hover:text-white font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold px-8 py-2.5 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gold-500/20"
                                    >
                                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {editingProduct ? "Save Changes" : "Create Product"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                isDeleteModalOpen && productToDelete && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4">
                            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Delete Product?</h3>
                                <p className="text-gray-400 mt-2 text-sm">
                                    Are you sure you want to delete <span className="text-white font-bold">"{productToDelete.name}"</span>? This action cannot be undone.
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
                )
            }

            {/* Lessons Management Modal */}
            {isLessonsModalOpen && activeCourseForLessons && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-dark-800 flex items-center justify-between bg-dark-950/20">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Video className="w-5 h-5 text-purple-400" />
                                    Manage Curriculum: {activeCourseForLessons.name}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">Add and organize video lessons for this course.</p>
                            </div>
                            <button onClick={() => setIsLessonsModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {!isAddingLesson ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="font-bold text-gray-400 uppercase tracking-widest text-xs">Course Lessons ({lessons.length})</h4>
                                        <button
                                            onClick={() => {
                                                setLessonForm({ title: "", description: "", video_url: "", cloudinary_public_id: "", order_index: lessons.length + 1, is_preview: false });
                                                setEditingLesson(null);
                                                setIsAddingLesson(true);
                                            }}
                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                                        >
                                            <Plus className="w-4 h-4" /> Add Lesson
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        {lessons.map((lesson, idx) => (
                                            <div key={lesson.id} className="bg-dark-950 border border-dark-800 rounded-xl p-4 flex items-center gap-4 group">
                                                <div className="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center font-mono font-bold text-gray-500">
                                                    {lesson.order_index}
                                                </div>
                                                <div className="flex-1">
                                                    <h5 className="font-bold text-white group-hover:text-purple-400 transition-colors">{lesson.title}</h5>
                                                    <p className="text-xs text-gray-500 line-clamp-1">{lesson.description || 'No description provided.'}</p>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs">
                                                    {lesson.is_preview && <span className="px-2 py-0.5 bg-gold-500/10 text-gold-500 border border-gold-500/20 rounded">Preview</span>}
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingLesson(lesson);
                                                                setLessonForm({
                                                                    title: lesson.title,
                                                                    description: lesson.description || "",
                                                                    video_url: lesson.video_url || "",
                                                                    cloudinary_public_id: (lesson as any).cloudinary_public_id || "",
                                                                    order_index: lesson.order_index,
                                                                    is_preview: lesson.is_preview || false
                                                                });
                                                                setIsAddingLesson(true);
                                                            }}
                                                            className="p-2 rounded-lg bg-dark-800 hover:bg-blue-500 text-gray-400 hover:text-white transition-all"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteLesson(lesson.id)}
                                                            className="p-2 rounded-lg bg-dark-800 hover:bg-red-500 text-gray-400 hover:text-white transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {lessons.length === 0 && (
                                            <div className="text-center py-12 bg-dark-950/50 border border-dashed border-dark-800 rounded-2xl">
                                                <Play className="w-12 h-12 text-dark-800 mx-auto mb-4 opacity-50" />
                                                <p className="text-gray-500">No lessons added yet for this course.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSaveLesson} className="space-y-6 max-w-2xl mx-auto py-4">
                                    <div className="flex items-center gap-4 mb-8">
                                        <button type="button" onClick={() => setIsAddingLesson(false)} className="text-gray-500 hover:text-white">
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                        <h4 className="text-xl font-bold text-white">{editingLesson ? 'Edit Lesson' : 'Add New Lesson'}</h4>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-sm font-medium text-gray-400">Lesson Title</label>
                                            <input
                                                type="text"
                                                required
                                                value={lessonForm.title}
                                                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                                                className="w-full bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-white focus:border-purple-500/50 outline-none"
                                                placeholder="e.g. Introduction to Forex"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-sm font-medium text-gray-400">Video URL (NextCloud, YouTube, Cloudinary, etc.)</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="url"
                                                    required
                                                    value={lessonForm.video_url}
                                                    onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                                                    className="flex-1 bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-white focus:border-purple-500/50 outline-none font-mono text-sm"
                                                    placeholder="https://..."
                                                />
                                                <CldUploadWidget
                                                    uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "logic_traders_unsigned"}
                                                    onSuccess={(result: any) => {
                                                        if (result.info?.secure_url) {
                                                            setLessonForm({
                                                                ...lessonForm,
                                                                video_url: result.info.secure_url,
                                                                cloudinary_public_id: result.info.public_id
                                                            });
                                                        }
                                                    }}
                                                >
                                                    {({ open }) => (
                                                        <button type="button" onClick={() => open()} className="px-4 py-2 bg-dark-800 text-gray-300 rounded-xl border border-dark-700 hover:bg-purple-600 transition-all">
                                                            <Upload className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </CldUploadWidget>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-400">Order Index</label>
                                            <input
                                                type="number"
                                                required
                                                value={lessonForm.order_index}
                                                onChange={(e) => setLessonForm({ ...lessonForm, order_index: parseInt(e.target.value) })}
                                                className="w-full bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-white focus:border-purple-500/50 outline-none"
                                            />
                                        </div>
                                        <div className="flex items-center gap-3 pt-8">
                                            <input
                                                type="checkbox"
                                                checked={lessonForm.is_preview}
                                                onChange={(e) => setLessonForm({ ...lessonForm, is_preview: e.target.checked })}
                                                className="w-5 h-5 rounded bg-dark-950 border-dark-800 text-purple-600 focus:ring-purple-500"
                                            />
                                            <label className="text-sm text-gray-300 font-medium">Free Preview Lesson</label>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-sm font-medium text-gray-400">Lesson Description</label>
                                            <textarea
                                                rows={3}
                                                value={lessonForm.description}
                                                onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                                                className="w-full bg-dark-950 border border-dark-800 rounded-xl px-4 py-3 text-white focus:border-purple-500/50 outline-none resize-none"
                                                placeholder="What will students learn in this lesson?..."
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-6 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingLesson(false)}
                                            className="px-6 py-2.5 rounded-xl border border-dark-700 text-gray-400 hover:text-white font-medium transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 py-2.5 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                                        >
                                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                            {editingLesson ? 'Update Lesson' : 'Add Lesson'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
