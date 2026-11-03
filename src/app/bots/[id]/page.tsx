"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Download,
  Check,
  ShoppingCart,
  FileText,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createBrowserClient } from "@/lib/supabase";
import { getSupportGmailUrl } from "@/lib/support";

interface BotLink {
  link_url: string;
  download_url: string | null;
  instructions: string | null;
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
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [bot, setBot] = useState<BotLink | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchBotData();
  }, [params.id, user, isAdmin]);

  const fetchBotData = async () => {
    const supabase = createBrowserClient();

    try {
      // Fetch product
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", params.id)
        .single();

      if (productError) throw productError;
      setProduct(productData ? {
        ...productData,
        type: productData.product_type ?? "bot",
        price: Number(productData.price ?? (Number(productData.price_cents ?? 0) / 100)),
      } : null);
      if (productData?.metadata?.delivery_method === 'manual_email' && user) {
        const { data: delivery, error: deliveryError } = await supabase
          .from('bot_delivery_requests')
          .select('status')
          .eq('user_id', user.id)
          .eq('product_id', params.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (deliveryError) throw deliveryError;
        setDeliveryStatus(delivery?.status ?? null);
      } else {
        setDeliveryStatus(null);
      }

      // Check if user has access
      let canViewBotLink = isAdmin;
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
            !accessData.expires_at ||
            new Date(accessData.expires_at) > new Date()
          ) {
            setHasAccess(true);
            canViewBotLink = true;
          }
        }
      }

      if (canViewBotLink) {
        const { data: botLink, error: botError } = await supabase
          .from("bot_links")
          .select("link_url, download_url, instructions")
          .eq("product_id", params.id)
          .limit(1)
          .maybeSingle();
        if (botError) throw botError;
        setBot(botLink);
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
    router.push(`/checkout/lmbtech?product=${params.id}`);
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
      if (!response.ok) throw new Error(data.error || "Unable to prepare the bot download.");

      if (data.success) {
        setDownloadToken(data.token);
        // Initiate download
        const downloadResponse = await fetch(`/api/downloads/${params.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: data.token }),
        });

        const downloadData = await downloadResponse.json();
        if (!downloadResponse.ok) throw new Error(downloadData.error || "Unable to start the bot download.");
        if (!downloadData.success || !downloadData.downloadUrl) throw new Error("The bot download link is not configured.");
        window.open(downloadData.downloadUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("Error downloading bot:", error);
      alert(error instanceof Error ? error.message : "Failed to download bot. Please try again.");
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

  if (!product) {
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

  const features = Array.isArray(product.metadata?.features)
    ? product.metadata.features.filter((feature: unknown): feature is string => typeof feature === "string")
    : [];
  const requirements = Array.isArray(product.metadata?.requirements)
    ? product.metadata.requirements.filter((requirement: unknown): requirement is string => typeof requirement === "string")
    : [];
  const deliveryMethod = product.metadata?.delivery_method === "manual_email"
    ? "Manual email delivery"
    : "Automatic download";

  return (
    <main className="min-h-screen bg-dark-950">
      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Link href="/bots" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-gold-400">
            <ArrowLeft className="h-4 w-4" /> Back to Trading Bots
          </Link>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
            <section className="dark-card overflow-hidden">
              <div className="relative aspect-video bg-dark-900">
                {product.thumbnail_url ? (
                  <img src={product.thumbnail_url} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gold-400/50">
                    <Bot className="h-16 w-16" />
                  </div>
                )}
                <span className="absolute left-3 top-3 border border-gold-500/30 bg-dark-950/85 px-3 py-1 text-xs font-semibold text-gold-200">
                  {product.metadata?.bot_type || "Trading Bot"}
                </span>
              </div>

              <div className="p-5 sm:p-6">
                <h1 className="text-xl font-bold text-white sm:text-2xl">{product.name}</h1>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-400">{product.description}</p>

                {product.metadata?.demo_video_url && (
                  <a href={product.metadata.demo_video_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm text-gold-300 underline">
                    Watch bot demonstration
                  </a>
                )}

                {Array.isArray(product.metadata?.features) && product.metadata.features.length > 0 && (
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {product.metadata.features.map((feature: unknown, index: number) => typeof feature === "string" && (
                      <div key={`${feature}-${index}`} className="flex items-start gap-2 text-sm text-gray-300">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-4">
              <section className="dark-card p-5 sm:p-6">
                <p className="text-sm text-gray-500">Price</p>
                <p className="mt-1 text-2xl font-bold gold-gradient-text">{product.currency === "RWF" ? `${new Intl.NumberFormat("en-US").format(product.price)} RWF` : `$${Number(product.price).toFixed(2)}`}</p>
                <p className="mt-4 border-t border-dark-800 pt-4 text-sm text-gray-400">Delivery: <span className="text-gray-200">{product.metadata?.delivery_method === "manual_email" ? "Manual email" : "Automatic download"}</span></p>
                {product.metadata?.delivery_method === "manual_email" && (deliveryStatus === "pending_delivery" || deliveryStatus === "delivered") ? (
                  <p className="mt-3 rounded border border-gold-500/30 bg-gold-500/5 p-3 text-sm text-gold-300">
                    Delivery status: {deliveryStatus.replace("_", " ")}
                  </p>
                ) : hasAccess ? (
                  <button onClick={handleDownload} disabled={isDownloading} className="gold-button mt-5 flex w-full items-center justify-center gap-2 disabled:opacity-50">
                    <Download className="h-4 w-4" /> {isDownloading ? "Preparing download..." : "Download bot"}
                  </button>
                ) : (
                  <button onClick={handlePurchase} className="gold-button mt-5 flex w-full items-center justify-center gap-2">
                    <ShoppingCart className="h-4 w-4" /> Get bot
                  </button>
                )}
                {product.metadata?.delivery_method === "manual_email" && !hasAccess && (
                  <p className="mt-3 text-xs leading-5 text-gray-500">After payment is verified, provide your delivery email and MT5 account number at checkout.</p>
                )}
                {hasAccess && <p className="mt-3 text-center text-xs text-green-300">Purchase verified</p>}
              </section>

              <section className="border-t border-dark-800 px-1 pt-4 text-xs leading-5 text-gray-500">
                Trading bots carry market risk. No strategy or bot guarantees profit.
                <a href={getSupportGmailUrl(`Support for ${product.name}`, `Hello Logic Traders support,\n\nI need help with ${product.name}.\n\n`)} target="_blank" rel="noopener noreferrer" className="ml-1 text-gold-300 underline">Contact support</a>
              </section>
            </aside>
          </div>

          {Array.isArray(product.metadata?.requirements) && product.metadata.requirements.length > 0 && (
            <section className="mt-6 border-t border-dark-800 pt-5">
              <h2 className="text-base font-semibold text-white">Requirements</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {product.metadata.requirements.map((requirement: unknown, index: number) => typeof requirement === "string" && (
                  <li key={`${requirement}-${index}`} className="border border-dark-700 px-3 py-2 text-sm text-gray-300">{requirement}</li>
                ))}
              </ul>
            </section>
          )}

          {bot?.instructions && hasAccess && (
            <section className="mt-6 border-t border-dark-800 pt-5">
              <h2 className="text-base font-semibold text-white">Setup instructions</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-300">{bot.instructions}</p>
            </section>
          )}

          {bot?.link_url && hasAccess && (
            <section className="mt-5 border-t border-dark-800 pt-5">
              <h2 className="text-base font-semibold text-white">Bot information link</h2>
              <a href={bot.link_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm text-gold-300 underline">
                <FileText className="h-4 w-4" /> Open bot information
              </a>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
