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

## Realtime SQL

Enable `invoice_payments` for Realtime with:

```sql
ALTER TABLE "public"."invoice_payments" REPLICA IDENTITY FULL;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE "public"."invoice_payments";
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
```

## Frontend subscription example

```ts
type InvoicePaymentRealtimeRow = {
  id: string | number;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  customer_email: string | null;
  amount_paid: number | null;
  currency: string | null;
  status: string;
  paid_at: string | null;
};

const channel = supabase
  .channel("invoice-payments")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "invoice_payments",
    },
    (payload) => {
      const next = payload.new as InvoicePaymentRealtimeRow;
      const previous = (payload.old ?? null) as Partial<InvoicePaymentRealtimeRow> | null;

      if (!next || next.status !== "paid" || previous?.status === "paid") {
        return;
      }

      const label =
        next.customer_email ??
        next.stripe_invoice_id ??
        next.stripe_payment_intent_id ??
        next.stripe_charge_id ??
        "payment";

      console.log("Invoice paid", next);
      // Replace this with your toast or notification system.
      alert(`Invoice paid: ${label}`);
    },
  )
  .subscribe();
```

If RLS is enabled on `public.invoice_payments`, add an appropriate `SELECT` policy for the clients that need this subscription.
