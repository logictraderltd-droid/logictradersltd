# Fix for "Invalid API Key provided: sk_test_****_key"

**The Issue:**
The error `Invalid API Key provided: sk_test_****_key` means your Next.js server is trying to use a placeholder API key (likely generated or copied previously) instead of the real key in your `.env.local` file.

**Why?**
Next.js loads environment variables (`.env.local`) when you first start the server (`npm run dev`). If you change the file while the server is running, the changes **do not always take effect immediately**. The server is still holding onto the old (invalid) value.

## 🚀 Solution: Restart the Server

1.  Go to the terminal running `npm run dev`.
2.  Press `Ctrl + C` to stop the server.
3.  Run `npm run dev` again.

This will force Next.js to reload the `.env.local` file and pick up your real `sk_live_...` key.

---

## ⚠️ Important Warning: Live Mode vs Test Mode

I noticed you are using **Live Mode** keys (`sk_live_...`) in your `.env.local`:

```
STRIPE_SECRET_KEY=sk_live_...
```

However, you are running `stripe listen` in the default **Test Mode**:

```powershell
.\stripe listen --forward-to http://localhost:3000/api/webhooks
```

**This mismatch will cause problems:**
1.  When you make a payment with your Live key, Stripe creates a **Live** transaction (real money).
2.  The Stripe CLI (listening for **Test** events) will **NOT** see this transaction.
3.  Your local webhook (`http://localhost:3000/api/webhooks`) will **never be called**.
4.  Your database will **not update** the order status to "paid".

### Recommended Fix (for Development)
1.  Go to your [Stripe Dashboard](https://dashboard.stripe.com).
2.  Toggle **Test Mode** (top right).
3.  Get your **Test API Keys** (`pk_test_...`, `sk_test_...`).
4.  Update `.env.local` with these test keys.
5.  **Restart the server**.

Now your app (using Test keys) and the CLI (listening for Test events) will match, and the full flow will work without spending real money.
