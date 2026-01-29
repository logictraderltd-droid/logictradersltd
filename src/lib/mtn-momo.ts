/**
 * MTN Mobile Money API Integration
 * Handles payment initialization, verification, and webhooks
 */

import axios, { AxiosInstance } from 'axios';

interface MTNConfig {
  subscriptionKey: string;
  apiUser: string;
  apiKey: string;
  environment: 'sandbox' | 'production';
  callbackUrl: string;
}

interface PaymentRequest {
  amount: string;
  currency: string;
  externalId: string;
  payer: {
    partyIdType: 'MSISDN';
    partyId: string;
  };
  payerMessage: string;
  payeeNote: string;
}

interface PaymentStatus {
  amount: string;
  currency: string;
  financialTransactionId: string;
  externalId: string;
  payer: {
    partyIdType: string;
    partyId: string;
  };
  status: 'SUCCESSFUL' | 'FAILED' | 'PENDING';
  reason?: string;
}

export class MTNMoMoClient {
  private client: AxiosInstance;
  private config: MTNConfig;
  private baseURL: string;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(config?: Partial<MTNConfig>) {
    this.config = {
      subscriptionKey: process.env.MTN_MOMO_SUBSCRIPTION_KEY || '',
      apiUser: process.env.MTN_MOMO_API_USER || '',
      apiKey: process.env.MTN_MOMO_API_KEY || '',
      environment: (process.env.MTN_MOMO_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      callbackUrl: process.env.MTN_MOMO_CALLBACK_URL || '',
      ...config,
    };

    // Set base URL based on environment
    this.baseURL =
      this.config.environment === 'production'
        ? 'https://proxy.momoapi.mtn.com'
        : 'https://sandbox.momodeveloper.mtn.com';

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
        'X-Target-Environment': this.config.environment,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.config.apiUser}:${this.config.apiKey}`).toString('base64');

      const response = await this.client.post(
        '/collection/token/',
        {},
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      this.accessToken = response.data.access_token;
      if (!this.accessToken) {
        throw new Error('Access token not found in response');
      }
      // Token typically expires in 3600 seconds (1 hour)
      this.tokenExpiry = Date.now() + 3500 * 1000; // Set expiry 100 seconds before actual expiry

      return this.accessToken;
    } catch (error: any) {
      console.error('MTN MoMo: Failed to get access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with MTN Mobile Money');
    }
  }

  /**
   * Request payment from customer
   */
  async requestPayment(params: {
    amount: number;
    phoneNumber: string;
    orderId: string;
    description: string;
  }): Promise<{ referenceId: string; success: boolean; error?: string }> {
    try {
      const token = await this.getAccessToken();
      const referenceId = `${params.orderId}-${Date.now()}`;

      // Remove leading zero and add country code if needed
      const phoneNumber = params.phoneNumber.startsWith('0')
        ? `256${params.phoneNumber.substring(1)}`
        : params.phoneNumber;

      const paymentRequest: PaymentRequest = {
        amount: params.amount.toFixed(2),
        currency: 'EUR', // Change to your currency (EUR for sandbox, local currency for production)
        externalId: params.orderId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: phoneNumber,
        },
        payerMessage: params.description,
        payeeNote: `Payment for order ${params.orderId}`,
      };

      await this.client.post('/collection/v1_0/requesttopay', paymentRequest, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Reference-Id': referenceId,
          'X-Callback-Url': this.config.callbackUrl,
        },
      });

      return {
        referenceId,
        success: true,
      };
    } catch (error: any) {
      console.error('MTN MoMo: Payment request failed:', error.response?.data || error.message);
      return {
        referenceId: '',
        success: false,
        error: error.response?.data?.message || error.message || 'Payment request failed',
      };
    }
  }

  /**
   * Check payment status
   */
  async getPaymentStatus(referenceId: string): Promise<PaymentStatus | null> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(`/collection/v1_0/requesttopay/${referenceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data as PaymentStatus;
    } catch (error: any) {
      console.error('MTN MoMo: Failed to get payment status:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Verify webhook signature (if MTN provides signature verification)
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // Implement signature verification based on MTN's webhook documentation
    // This is a placeholder - actual implementation depends on MTN's specification
    return true;
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<{ availableBalance: string; currency: string } | null> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get('/collection/v1_0/account/balance', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('MTN MoMo: Failed to get balance:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Check if account is active
   */
  async isAccountActive(phoneNumber: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();

      const response = await this.client.get(`/collection/v1_0/accountholder/msisdn/${phoneNumber}/active`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data.result === true;
    } catch (error: any) {
      console.error('MTN MoMo: Failed to check account status:', error.response?.data || error.message);
      return false;
    }
  }
}

// Singleton instance
let mtnMoMoClient: MTNMoMoClient | null = null;

export function getMTNMoMoClient(): MTNMoMoClient {
  if (!mtnMoMoClient) {
    mtnMoMoClient = new MTNMoMoClient();
  }
  return mtnMoMoClient;
}

export default MTNMoMoClient;
