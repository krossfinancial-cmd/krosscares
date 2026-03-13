# stripe-webhook

Supabase Edge Function for verified Stripe webhooks tied to Bluevine-paid invoices.

## Deploy

Deploy from `/Users/jeanpierre-louis/Desktop/kc/web`:

```bash
supabase functions deploy stripe-webhook --project-ref <project-ref> --no-verify-jwt
```

Register this Stripe webhook URL:

```text
https://<project-ref>.supabase.co/functions/v1/stripe-webhook
```

## Secrets

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided by Supabase in the Edge Function runtime. Set only the Stripe secrets:

```bash
supabase secrets set --project-ref <project-ref> \
  STRIPE_SECRET_KEY=sk_live_xxx \
  STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## Local testing

Serve the function locally without JWT verification:

```bash
supabase functions serve --workdir ./supabase --env-file .env.local --no-verify-jwt
```

Forward Stripe events to the local Edge Function:

```bash
stripe listen \
  --events invoice.paid,payment_intent.succeeded,charge.succeeded \
  --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
```

Trigger example sandbox events:

```bash
stripe trigger payment_intent.succeeded
stripe trigger charge.succeeded
```

For invoice testing, either trigger the invoice flow from your app or create a sandbox invoice in Stripe so Stripe emits `invoice.paid`.

## Data exposure

Do not expose `invoice_payments` or `stripe_events` to browser clients through the Data API or Realtime. These tables contain payment metadata and should remain server-only. If the product needs payment status in the UI, add a server endpoint or a sanitized server-owned view instead of subscribing to the raw tables from the browser.
