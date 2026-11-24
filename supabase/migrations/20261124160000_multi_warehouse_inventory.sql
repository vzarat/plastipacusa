-- Multi-warehouse inventory for USA / Mexico operations.
-- USA warehouse_inventory.stock_boxes mirrors products.stock_boxes for ecommerce.

create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  country text not null default 'US',
  timezone text not null default 'America/Chicago',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint warehouses_code_format check (code ~ '^[a-z0-9_-]+$')
);

create table if not exists public.warehouse_inventory (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  -- Units match products.stock_boxes: boxes (hand) or rolls (machine).
  stock_boxes integer not null default 0
    check (stock_boxes >= 0),
  stock_pallets numeric(12, 4) not null default 0
    check (stock_pallets >= 0),
  reorder_point integer not null default 0
    check (reorder_point >= 0),
  updated_at timestamptz not null default now(),
  unique (warehouse_id, product_id)
);

create index if not exists warehouse_inventory_warehouse_idx
  on public.warehouse_inventory (warehouse_id);

create index if not exists warehouse_inventory_product_idx
  on public.warehouse_inventory (product_id);

create table if not exists public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  warehouse_id uuid not null references public.warehouses (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity_changed integer not null,
  reason text not null
    check (reason in ('received', 'dispatched', 'damaged', 'recount', 'transfer', 'other')),
  notes text not null default '',
  order_id text,
  balance_after integer,
  created_at timestamptz not null default now()
);

create index if not exists inventory_adjustments_warehouse_created_idx
  on public.inventory_adjustments (warehouse_id, created_at desc);

create index if not exists inventory_adjustments_product_created_idx
  on public.inventory_adjustments (product_id, created_at desc);

create index if not exists inventory_adjustments_order_idx
  on public.inventory_adjustments (order_id)
  where order_id is not null;

insert into public.warehouses (code, name, country, timezone)
values
  ('usa', 'USA Warehouse', 'US', 'America/Chicago'),
  ('mexico', 'Mexico Plant', 'MX', 'America/Mexico_City')
on conflict (code) do update
  set name = excluded.name,
      country = excluded.country,
      timezone = excluded.timezone,
      updated_at = now();

-- Seed USA rows from current catalog stock (NULL stock_boxes → untracked, skip).
insert into public.warehouse_inventory (
  warehouse_id,
  product_id,
  stock_boxes,
  stock_pallets,
  reorder_point,
  updated_at
)
select
  w.id,
  p.id,
  greatest(0, coalesce(p.stock_boxes, 0)),
  case
    when coalesce(p.boxes_per_pallet, 0) > 0
      then round(
        (greatest(0, coalesce(p.stock_boxes, 0))::numeric / p.boxes_per_pallet::numeric),
        4
      )
    else 0
  end,
  case
    when coalesce(p.boxes_per_pallet, 0) > 0 then greatest(p.boxes_per_pallet, 8)
    else 8
  end,
  now()
from public.products p
cross join public.warehouses w
where w.code = 'usa'
  and p.stock_boxes is not null
on conflict (warehouse_id, product_id) do nothing;

-- Seed empty Mexico rows for active products (ops start at 0).
insert into public.warehouse_inventory (
  warehouse_id,
  product_id,
  stock_boxes,
  stock_pallets,
  reorder_point,
  updated_at
)
select
  w.id,
  p.id,
  0,
  0,
  case
    when coalesce(p.boxes_per_pallet, 0) > 0 then greatest(p.boxes_per_pallet, 8)
    else 8
  end,
  now()
from public.products p
cross join public.warehouses w
where w.code = 'mexico'
  and coalesce(p.is_active, true) = true
on conflict (warehouse_id, product_id) do nothing;

-- Keep USA warehouse_inventory in sync when ecommerce stock changes (checkout RPCs).
create or replace function public.sync_usa_warehouse_from_products()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_warehouse_id uuid;
  v_bpp integer;
begin
  if new.stock_boxes is null then
    return new;
  end if;

  select id into v_warehouse_id from public.warehouses where code = 'usa' limit 1;
  if v_warehouse_id is null then
    return new;
  end if;

  v_bpp := coalesce(new.boxes_per_pallet, 0);

  insert into public.warehouse_inventory (
    warehouse_id, product_id, stock_boxes, stock_pallets, reorder_point, updated_at
  )
  values (
    v_warehouse_id,
    new.id,
    greatest(0, new.stock_boxes),
    case when v_bpp > 0
      then round((greatest(0, new.stock_boxes)::numeric / v_bpp::numeric), 4)
      else 0
    end,
    case when v_bpp > 0 then greatest(v_bpp, 8) else 8 end,
    now()
  )
  on conflict (warehouse_id, product_id) do update
    set stock_boxes = excluded.stock_boxes,
        stock_pallets = excluded.stock_pallets,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_sync_usa_warehouse_from_products on public.products;
create trigger trg_sync_usa_warehouse_from_products
after insert or update of stock_boxes, boxes_per_pallet
on public.products
for each row
execute function public.sync_usa_warehouse_from_products();

-- Atomic adjust helper used by app (service role / authenticated via RLS).
create or replace function public.adjust_warehouse_stock(
  p_warehouse_id uuid,
  p_product_id uuid,
  p_delta integer,
  p_reason text,
  p_user_id uuid default null,
  p_notes text default '',
  p_order_id text default null,
  p_sync_catalog boolean default true
)
returns table (
  stock_boxes integer,
  stock_pallets numeric,
  quantity_changed integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.warehouse_inventory%rowtype;
  v_bpp integer;
  v_next integer;
  v_pallets numeric(12, 4);
  v_code text;
begin
  if p_delta = 0 then
    raise exception 'quantity delta cannot be zero';
  end if;
  if p_reason not in ('received', 'dispatched', 'damaged', 'recount', 'transfer', 'other') then
    raise exception 'invalid reason';
  end if;

  select * into v_row
  from public.warehouse_inventory
  where warehouse_id = p_warehouse_id and product_id = p_product_id
  for update;

  if not found then
    insert into public.warehouse_inventory (
      warehouse_id, product_id, stock_boxes, stock_pallets, reorder_point
    ) values (
      p_warehouse_id, p_product_id, 0, 0, 8
    )
    returning * into v_row;
  end if;

  v_next := v_row.stock_boxes + p_delta;
  if v_next < 0 then
    raise exception 'insufficient stock: have %, need %', v_row.stock_boxes, abs(p_delta);
  end if;

  select coalesce(boxes_per_pallet, 0) into v_bpp
  from public.products where id = p_product_id;

  v_pallets := case
    when coalesce(v_bpp, 0) > 0 then round((v_next::numeric / v_bpp::numeric), 4)
    else 0
  end;

  update public.warehouse_inventory
  set stock_boxes = v_next,
      stock_pallets = v_pallets,
      updated_at = now()
  where id = v_row.id;

  insert into public.inventory_adjustments (
    user_id, warehouse_id, product_id, quantity_changed, reason, notes, order_id, balance_after
  ) values (
    p_user_id, p_warehouse_id, p_product_id, p_delta, p_reason,
    coalesce(p_notes, ''), p_order_id, v_next
  );

  select code into v_code from public.warehouses where id = p_warehouse_id;
  if p_sync_catalog and v_code = 'usa' then
    -- Disable bounce via session flag is unnecessary: product trigger upserts same values.
    update public.products
    set stock_boxes = v_next,
        is_sold_out = (v_next = 0)
    where id = p_product_id;
  end if;

  stock_boxes := v_next;
  stock_pallets := v_pallets;
  quantity_changed := p_delta;
  return next;
end;
$$;

grant execute on function public.adjust_warehouse_stock(
  uuid, uuid, integer, text, uuid, text, text, boolean
) to authenticated, service_role;

alter table public.warehouses enable row level security;
alter table public.warehouse_inventory enable row level security;
alter table public.inventory_adjustments enable row level security;

drop policy if exists "Public read active warehouses" on public.warehouses;
create policy "Public read active warehouses"
  on public.warehouses for select to anon, authenticated
  using (is_active = true);

drop policy if exists "Staff read warehouses" on public.warehouses;
create policy "Staff read warehouses"
  on public.warehouses for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'warehouse_supervisor', 'specialist')
    )
  );

drop policy if exists "Admins manage warehouses" on public.warehouses;
create policy "Admins manage warehouses"
  on public.warehouses for all to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "Staff read warehouse inventory" on public.warehouse_inventory;
create policy "Staff read warehouse inventory"
  on public.warehouse_inventory for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'warehouse_supervisor', 'specialist')
    )
  );

drop policy if exists "Staff write warehouse inventory" on public.warehouse_inventory;
create policy "Staff write warehouse inventory"
  on public.warehouse_inventory for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'warehouse_supervisor')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'warehouse_supervisor')
    )
  );

drop policy if exists "Staff read inventory adjustments" on public.inventory_adjustments;
create policy "Staff read inventory adjustments"
  on public.inventory_adjustments for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'warehouse_supervisor', 'specialist')
    )
  );

drop policy if exists "Staff insert inventory adjustments" on public.inventory_adjustments;
create policy "Staff insert inventory adjustments"
  on public.inventory_adjustments for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'warehouse_supervisor')
    )
  );

-- Public catalog may read USA stock levels for availability badges (optional anon).
drop policy if exists "Public read USA warehouse stock" on public.warehouse_inventory;
create policy "Public read USA warehouse stock"
  on public.warehouse_inventory for select to anon, authenticated
  using (
    warehouse_id in (select id from public.warehouses where code = 'usa' and is_active = true)
  );

comment on table public.warehouses is 'Physical stock locations (USA Warehouse, Mexico Plant).';
comment on table public.warehouse_inventory is 'Per-warehouse on-hand units (boxes/rolls) and pallet display.';
comment on table public.inventory_adjustments is 'Audit log for received / dispatched / damaged / recount.';
