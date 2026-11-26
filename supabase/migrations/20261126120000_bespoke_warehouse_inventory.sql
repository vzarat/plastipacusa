-- Bespoke / client warehouse sheet (LISTA DE ARTICULOS INVENTARIO BESPOKE).
-- Separate from stretch-film SKU warehouse_inventory used by ecommerce.

create table if not exists public.warehouse_inventory_items (
  id uuid primary key default gen_random_uuid(),
  warehouse_code text not null default 'USA',
  item_name text not null,
  category text not null default 'other'
    check (category in ('stretch_film', 'foam', 'corner_board', 'other')),
  client_name text not null default '',
  client_part_number text not null default '',
  unit_of_measure text not null default 'PZA'
    check (unit_of_measure in ('RLL', 'CJA', 'PZA', 'PAQ')),
  units_per_pallet_or_pack numeric(12, 4) not null default 0
    check (units_per_pallet_or_pack >= 0),
  min_inventory numeric(12, 4) not null default 0
    check (min_inventory >= 0),
  physical_qty numeric(12, 4) not null default 0
    check (physical_qty >= 0),
  pallet_count numeric(12, 4) not null default 0
    check (pallet_count >= 0),
  is_obsolete boolean not null default false,
  count_notes text not null default '',
  counted_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists warehouse_inventory_items_wh_cat_idx
  on public.warehouse_inventory_items (warehouse_code, category, sort_order, item_name);

create index if not exists warehouse_inventory_items_client_idx
  on public.warehouse_inventory_items (warehouse_code, client_name);

create index if not exists warehouse_inventory_items_search_idx
  on public.warehouse_inventory_items (warehouse_code, item_name, client_part_number);

-- Snapshot of each physical count save (export / history).
create table if not exists public.inventory_counts (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null
    references public.warehouse_inventory_items (id) on delete cascade,
  warehouse_code text not null default 'USA',
  item_name text not null default '',
  category text not null default 'other',
  client_name text not null default '',
  client_part_number text not null default '',
  unit_of_measure text not null default 'PZA',
  physical_qty numeric(12, 4) not null default 0,
  pallet_count numeric(12, 4) not null default 0,
  count_notes text not null default '',
  counted_date date,
  counted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inventory_counts_item_created_idx
  on public.inventory_counts (item_id, created_at desc);

create index if not exists inventory_counts_wh_date_idx
  on public.inventory_counts (warehouse_code, counted_date desc, created_at desc);

-- Audit log whenever physical counts or quantities change.
create table if not exists public.inventory_logs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid
    references public.warehouse_inventory_items (id) on delete set null,
  warehouse_code text not null default 'USA',
  user_id uuid references auth.users (id) on delete set null,
  action text not null default 'count_update'
    check (action in ('created', 'updated', 'count_update', 'obsolete_toggle', 'deleted')),
  field_changed text not null default 'physical_qty',
  old_physical_qty numeric(12, 4),
  new_physical_qty numeric(12, 4),
  old_pallet_count numeric(12, 4),
  new_pallet_count numeric(12, 4),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists inventory_logs_item_created_idx
  on public.inventory_logs (item_id, created_at desc);

create index if not exists inventory_logs_wh_created_idx
  on public.inventory_logs (warehouse_code, created_at desc);

alter table public.warehouse_inventory_items enable row level security;
alter table public.inventory_counts enable row level security;
alter table public.inventory_logs enable row level security;

-- Read: admin, warehouse_supervisor, specialist
drop policy if exists warehouse_inventory_items_staff_read on public.warehouse_inventory_items;
create policy warehouse_inventory_items_staff_read
  on public.warehouse_inventory_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'warehouse_supervisor', 'specialist')
    )
  );

drop policy if exists warehouse_inventory_items_staff_write on public.warehouse_inventory_items;
create policy warehouse_inventory_items_staff_write
  on public.warehouse_inventory_items
  for all
  to authenticated
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

drop policy if exists inventory_counts_staff_read on public.inventory_counts;
create policy inventory_counts_staff_read
  on public.inventory_counts
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'warehouse_supervisor', 'specialist')
    )
  );

drop policy if exists inventory_counts_staff_write on public.inventory_counts;
create policy inventory_counts_staff_write
  on public.inventory_counts
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'warehouse_supervisor')
    )
  );

drop policy if exists inventory_logs_staff_read on public.inventory_logs;
create policy inventory_logs_staff_read
  on public.inventory_logs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'warehouse_supervisor', 'specialist')
    )
  );

drop policy if exists inventory_logs_staff_write on public.inventory_logs;
create policy inventory_logs_staff_write
  on public.inventory_logs
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'warehouse_supervisor')
    )
  );

grant select, insert, update, delete on public.warehouse_inventory_items to authenticated;
grant select, insert on public.inventory_counts to authenticated;
grant select, insert on public.inventory_logs to authenticated;
