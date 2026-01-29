"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bot,
  Download,
  Check,
  ShoppingCart,
  FileText,
  Settings,
  Shield,
  Zap,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createBrowserClient } from "@/lib/supabase";

interface TradingBot {
  id: string;
  product_id: string;
  download_url: string;
  file_size: string;
  setup_instructions: string;
  requirements: string[];
  version: string;
  changelog: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  thumbnail_url: string;
  metadata: any;
}

export default function BotDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [bot, setBot] = useState<TradingBot | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetchBotData();
  }, [params.id, user]);

  const fetchBotData = async () => {
    const supabase = createBrowserClient();

    try {
      // Fetch product
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", params.id)
        .eq("type", "bot")
        .single();

      if (productError) throw productError;
      setProduct(productData);

      // Fetch bot details
      const { data: botData, error: botError } = await supabase
        .from("trading_bots")
        .select("*")
        .eq("product_id", params.id)
        .single();

      if (botError) throw botError;
      setBot(botData);

      // Check if user has access
      if (user) {
        const { data: accessData } = await supabase
          .from("user_access")
          .select("*")
          .eq("user_id", user.id)
          .eq("product_id", params.id)
          .eq("is_active", true)
          .single();

        if (accessData) {
          if (
            !accessData.access_expires_at ||
            new Date(accessData.access_expires_at) > new Date()
          ) {
            setHasAccess(true);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching bot:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/bots/${params.id}`);
      return;
    }
    router.push(`/checkout?product=${params.id}`);
  };

  const handleDownload = async () => {
    if (!hasAccess) {
      alert("Please purchase this bot first");
      return;
    }

    setIsDownloading(true);
    try {
      // Get download token from API
      const response = await fetch(`/api/downloads/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setDownloadToken(data.token);
        // Initiate download
        const downloadResponse = await fetch(`/api/downloads/${params.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: data.token }),
        });

        const downloadData = await downloadResponse.json();
        if (downloadData.success && downloadData.downloadUrl) {
          // Open download in new tab
          window.open(downloadData.downloadUrl, "_blank");
        }
      }
    } catch (error) {
      console.error("Error downloading bot:", error);
      alert("Failed to download bot. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!product || !bot) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Bot Not Found</h1>
          <Link href="/bots" className="gold-button">
            Back to Bots
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Hero Section */}
      <section className="relative py-20 border-b border-dark-800">
        <div className="absolute inset-0 bg-gradient-to-b from-gold-500/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <Link
            href="/bots"
            className="inline-flex items-center text-gray-400 hover:text-gold-400 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Trading Bots
          </Link>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Bot Info */}
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-gold-500/20 text-gold-400 text-sm mb-4">
                Version {bot.version}
              </div>

              <h1 className="text-4xl font-bold mb-4 gold-gradient-text">
                {product.name}
              </h1>

              <p className="text-gray-300 text-lg mb-6">{product.description}</p>

              {/* Key Features */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-center text-gray-300">
                  <Zap className="w-5 h-5 mr-2 text-gold-400" />
                  <span>Automated Trading</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <Shield className="w-5 h-5 mr-2 text-gold-400" />
                  <span>Risk Management</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <TrendingUp className="w-5 h-5 mr-2 text-gold-400" />
                  <span>24/7 Operation</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <Settings className="w-5 h-5 mr-2 text-gold-400" />
                  <span>Customizable</span>
                </div>
              </div>

              {/* Price and CTA */}
              <div className="flex items-center space-x-4">
                <div className="text-3xl font-bold gold-gradient-text">
                  ${product.price}
                </div>
                {hasAccess ? (
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="gold-button flex items-center"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    {isDownloading ? "Downloading..." : "Download Bot"}
                  </button>
                ) : (
                  <button onClick={handlePurchase} className="gold-button flex items-center">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Purchase Bot
                  </button>
                )}
              </div>
            </div>

            {/* Bot Image/Preview */}
            <div className="relative">
              <div className="aspect-video rounded-2xl overflow-hidden bg-dark-900">
                {product.thumbnail_url ? (
                  <img
                    src={product.thumbnail_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Bot className="w-32 h-32 text-gold-400" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-12">
              {/* Features */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="dark-card p-8"
              >
                <h2 className="text-2xl font-bold mb-6">Key Features</h2>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <Zap className="w-6 h-6 text-gold-400 mr-4 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold mb-2">Fully Automated</h3>
                      <p className="text-gray-400">
                        Let the bot trade for you 24/7 without manual intervention.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Shield className="w-6 h-6 text-gold-400 mr-4 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold mb-2">Built-in Risk Management</h3>
                      <p className="text-gray-400">
                        Protect your capital with automatic stop-loss and position sizing.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Settings className="w-6 h-6 text-gold-400 mr-4 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold mb-2">Highly Customizable</h3>
                      <p className="text-gray-400">
                        Adjust parameters to match your trading style and risk tolerance.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <TrendingUp className="w-6 h-6 text-gold-400 mr-4 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold mb-2">Proven Strategy</h3>
                      <p className="text-gray-400">
                        Based on tested trading algorithms with consistent performance.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* System Requirements */}
              {bot.requirements && bot.requirements.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="dark-card p-8"
                >
                  <h2 className="text-2xl font-bold mb-6">System Requirements</h2>
                  <ul className="space-y-3">
                    {bot.requirements.map((req, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="w-5 h-5 text-gold-400 mr-3 flex-shrink-0 mt-1" />
                        <span className="text-gray-300">{req}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Setup Instructions */}
              {bot.setup_instructions && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="dark-card p-8"
                >
                  <h2 className="text-2xl font-bold mb-6">Setup Instructions</h2>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-gray-300 whitespace-pre-line">
                      {bot.setup_instructions}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Changelog */}
              {bot.changelog && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="dark-card p-8"
                >
                  <h2 className="text-2xl font-bold mb-6">
                    Version {bot.version} - What's New
                  </h2>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-gray-300 whitespace-pre-line">{bot.changelog}</p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="dark-card p-6 sticky top-24 space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-4">Bot Details</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Version</p>
                      <p className="font-medium">{bot.version}</p>
                    </div>
                    {bot.file_size && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">File Size</p>
                        <p className="font-medium">{bot.file_size}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Platform</p>
                      <p className="font-medium">MT4/MT5</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">License</p>
                      <p className="font-medium">Single User</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-dark-800 pt-6">
                  {!hasAccess ? (
                    <>
                      <div className="text-3xl font-bold gold-gradient-text mb-4">
                        ${product.price}
                      </div>
                      <button onClick={handlePurchase} className="gold-button w-full mb-4">
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        Purchase Bot
                      </button>
                      <div className="space-y-2 text-sm text-gray-400">
                        <div className="flex items-center">
                          <Check className="w-4 h-4 mr-2 text-green-400" />
                          <span>Instant download</span>
                        </div>
                        <div className="flex items-center">
                          <Check className="w-4 h-4 mr-2 text-green-400" />
                          <span>Lifetime updates</span>
                        </div>
                        <div className="flex items-center">
                          <Check className="w-4 h-4 mr-2 text-green-400" />
                          <span>24/7 support</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center text-green-400 mb-2">
                          <Check className="w-5 h-5 mr-2" />
                          <span className="font-medium">You own this bot</span>
                        </div>
                        <p className="text-sm text-gray-400">Ready to download</p>
                      </div>
                      <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="gold-button w-full"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        {isDownloading ? "Downloading..." : "Download Now"}
                      </button>
                      {downloadToken && (
                        <div className="bg-dark-900 rounded-lg p-4">
                          <p className="text-xs text-gray-500 mb-2">Download Token:</p>
                          <p className="text-xs font-mono text-gold-400 break-all">
                            {downloadToken}
                          </p>
                          <p className="text-xs text-gray-600 mt-2">
                            Valid for 24 hours, 3 downloads max
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-dark-800 pt-6">
                  <h4 className="font-bold mb-3">Need Help?</h4>
                  <Link
                    href="/support"
                    className="flex items-center text-gray-400 hover:text-gold-400 transition-colors"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    View Documentation
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
