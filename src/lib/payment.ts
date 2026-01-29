import Stripe from 'stripe';
import { Order, Payment, Product, ProductType } from '@/types';

// Payment Provider Interface
interface PaymentProvider {
  name: string;
  createPaymentIntent: (amount: number, currency: string, metadata?: Record<string, any>) => Promise<PaymentIntentResult>;
  verifyPayment: (paymentId: string) => Promise<PaymentVerificationResult>;
  handleWebhook?: (payload: any, signature: string) => Promise<WebhookResult>;
}

interface PaymentIntentResult {
  success: boolean;
  clientSecret?: string;
  paymentId?: string;
  error?: string;
}

interface PaymentVerificationResult {
  success: boolean;
  status: 'pending' | 'completed' | 'failed';
  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
  error?: string;
}

interface WebhookResult {
  success: boolean;
  event?: string;
  data?: any;
  error?: string;
}

// Stripe Provider Implementation
class StripeProvider implements PaymentProvider {
  name = 'stripe';
  private stripe: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('Stripe secret key not configured');
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2024-06-20',
    });
  }

  async createPaymentIntent(amount: number, currency: string, metadata?: Record<string, any>): Promise<PaymentIntentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret || undefined,
        paymentId: paymentIntent.id,
      };
    } catch (error: any) {
      console.error('Stripe payment intent error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create payment intent',
      };
    }
  }

  async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);
      
      let status: 'pending' | 'completed' | 'failed' = 'pending';
      if (paymentIntent.status === 'succeeded') {
        status = 'completed';
      } else if (['canceled', 'requires_payment_method'].includes(paymentIntent.status)) {
        status = 'failed';
      }

      return {
        success: status === 'completed',
        status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
      };
    } catch (error: any) {
      console.error('Stripe verify payment error:', error);
      return {
        success: false,
        status: 'failed',
        error: error.message || 'Failed to verify payment',
      };
    }
  }

  async handleWebhook(payload: any, signature: string): Promise<WebhookResult> {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error('Stripe webhook secret not configured');
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );

      return {
        success: true,
        event: event.type,
        data: event.data.object,
      };
    } catch (error: any) {
      console.error('Stripe webhook error:', error);
      return {
        success: false,
        error: error.message || 'Failed to handle webhook',
      };
    }
  }
}

// MTN Mobile Money Provider (Placeholder for future implementation)
class MTNMobileMoneyProvider implements PaymentProvider {
  name = 'mtn_momo';

  async createPaymentIntent(amount: number, currency: string, metadata?: Record<string, any>): Promise<PaymentIntentResult> {
    // TODO: Implement MTN Mobile Money API integration
    // This is a placeholder for future implementation
    console.log('MTN Mobile Money payment intent:', { amount, currency, metadata });
    
    return {
      success: false,
      error: 'MTN Mobile Money integration coming soon',
    };
  }

  async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
    // TODO: Implement MTN Mobile Money payment verification
    console.log('MTN Mobile Money verify payment:', paymentId);
    
    return {
      success: false,
      status: 'failed',
      error: 'MTN Mobile Money integration coming soon',
    };
  }
}

// Payment Manager
class PaymentManager {
  private providers: Map<string, PaymentProvider> = new Map();

  constructor() {
    // Register providers
    this.registerProvider(new StripeProvider());
    this.registerProvider(new MTNMobileMoneyProvider());
  }

  registerProvider(provider: PaymentProvider): void {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: string): PaymentProvider | undefined {
    return this.providers.get(name);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async createPayment(
    providerName: string,
    order: Order,
    product: Product
  ): Promise<PaymentIntentResult> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      return {
        success: false,
        error: `Payment provider '${providerName}' not found`,
      };
    }

    const metadata = {
      order_id: order.id,
      user_id: order.user_id,
      product_id: product.id,
      product_type: product.type,
    };

    return provider.createPaymentIntent(order.amount, order.currency, metadata);
  }

  async verifyPayment(providerName: string, paymentId: string): Promise<PaymentVerificationResult> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      return {
        success: false,
        status: 'failed',
        error: `Payment provider '${providerName}' not found`,
      };
    }

    return provider.verifyPayment(paymentId);
  }

  async handleWebhook(providerName: string, payload: any, signature: string): Promise<WebhookResult> {
    const provider = this.getProvider(providerName);
    if (!provider || !provider.handleWebhook) {
      return {
        success: false,
        error: `Webhook handler not available for provider '${providerName}'`,
      };
    }

    return provider.handleWebhook(payload, signature);
  }
}

// Export singleton instance
export const paymentManager = new PaymentManager();

// Helper functions for payment operations
export async function createStripePaymentIntent(
  amount: number,
  currency: string,
  metadata?: Record<string, any>
): Promise<PaymentIntentResult> {
  const stripe = paymentManager.getProvider('stripe') as StripeProvider;
  if (!stripe) {
    return {
      success: false,
      error: 'Stripe provider not available',
    };
  }
  return stripe.createPaymentIntent(amount, currency, metadata);
}

export async function verifyStripePayment(paymentId: string): Promise<PaymentVerificationResult> {
  const stripe = paymentManager.getProvider('stripe') as StripeProvider;
  if (!stripe) {
    return {
      success: false,
      status: 'failed',
      error: 'Stripe provider not available',
    };
  }
  return stripe.verifyPayment(paymentId);
}

export async function handleStripeWebhook(payload: any, signature: string): Promise<WebhookResult> {
  const stripe = paymentManager.getProvider('stripe') as StripeProvider;
  if (!stripe) {
    return {
      success: false,
      error: 'Stripe provider not available',
    };
  }
  return stripe.handleWebhook(payload, signature);
}

// Export types
export type { PaymentProvider, PaymentIntentResult, PaymentVerificationResult, WebhookResult };
