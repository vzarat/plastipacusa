-- Carrier cost is Warp's price. shipping_cost on the order stays the customer price
-- after SHIPPING_MARKUP_PERCENT. expires_at is the selected quote's expiration.

alter table public.orders
  add column if not exists shipping_carrier_cost numeric,
  add column if not exists shipping_quote_expires_at timestamptz;

alter table public.shipping_quotes
  add column if not exists carrier_price_cents integer;

comment on column public.orders.shipping_carrier_cost is
  'Warp price before markup. shipping_cost is the customer price.';
comment on column public.orders.shipping_quote_expires_at is
  'Expiration of the Warp quote selected at checkout.';
comment on column public.shipping_quotes.carrier_price_cents is
  'Warp price in cents before SHIPPING_MARKUP_PERCENT. price_cents is the customer price.';
