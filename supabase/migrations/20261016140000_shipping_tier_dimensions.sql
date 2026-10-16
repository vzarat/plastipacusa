-- Per-tier shipping inches. Do not copy one pallet size onto every tier.
-- Full pallet uses pallet_length_in, pallet_width_in, pallet_height_in
-- (or products.pallet_dimensions as LENGTH x WIDTH x HEIGHT).
-- Leave a column null until that tier is measured.

alter table public.products
  add column if not exists box_length_in numeric(6, 2),
  add column if not exists box_width_in numeric(6, 2),
  add column if not exists box_height_in numeric(6, 2),
  add column if not exists layer_length_in numeric(6, 2),
  add column if not exists layer_width_in numeric(6, 2),
  add column if not exists layer_height_in numeric(6, 2),
  add column if not exists half_pallet_length_in numeric(6, 2),
  add column if not exists half_pallet_width_in numeric(6, 2),
  add column if not exists half_pallet_height_in numeric(6, 2);

comment on column public.products.box_length_in is 'One hand-film box length in inches, including packaging.';
comment on column public.products.box_width_in is 'One hand-film box width in inches, including packaging.';
comment on column public.products.box_height_in is 'One hand-film box height in inches, including packaging.';
comment on column public.products.layer_length_in is '16-box layer length in inches, including the pallet.';
comment on column public.products.layer_width_in is '16-box layer width in inches, including the pallet.';
comment on column public.products.layer_height_in is '16-box layer height in inches, including the pallet.';
comment on column public.products.half_pallet_length_in is 'Half pallet length in inches, including the pallet. Hand: 32 boxes. Machine: 20 rolls.';
comment on column public.products.half_pallet_width_in is 'Half pallet width in inches, including the pallet.';
comment on column public.products.half_pallet_height_in is 'Half pallet height in inches, including the pallet.';
