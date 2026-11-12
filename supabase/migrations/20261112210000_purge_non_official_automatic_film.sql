-- Hard purge Automatic stretch film that is NOT one of the 4 authorized master specs.
-- Keep only:
--   20" x 51 GA x 7000 FT  (HLP 20 rolls + FLP 40 rolls)
--   20" x 51 GA x 9000 FT  (HLP 20 rolls + FLP 40 rolls)
--   20" x 70 GA x 5000 FT  (HLP 20 rolls + FLP 40 rolls)
--   20" x 80 GA x 5000 FT  (HLP 20 rolls + FLP 40 rolls)
-- Manual 15"/18" hand film is never touched. Safe to re-run.

-- 1) Delete non-20/40 variants on the authorized Automatic products.
delete from public.product_variants v
using public.products p
where v.product_id = p.id
  and (
    p.slug in (
      'stretch-film-20-x-51-ga-x-7000ft',
      'stretch-film-20-x-51-ga-x-9000ft',
      'stretch-film-20-x-70-ga-x-5000ft',
      'stretch-film-20-x-80-ga-x-5000ft'
    )
    or p.part_number in (
      'HPF-SF205170', 'HPF-SF205190', 'HPF-SF207050', 'HPF-SF208050',
      'HPFSF205170', 'HPFSF205190', 'HPFSF207050', 'HPFSF208050'
    )
    or (
      round(coalesce(p.width_inches, 0)::numeric) = 20
      and (
        (
          round(coalesce(p.gauge, 0)::numeric) = 51
          and round(coalesce(p.length_feet, 0)::numeric) in (7000, 9000)
        )
        or (
          round(coalesce(p.gauge, 0)::numeric) in (70, 80)
          and round(coalesce(p.length_feet, 0)::numeric) = 5000
        )
      )
    )
  )
  and not (
    coalesce(v.rolls_count, 0) in (20, 40)
    or v.sku ilike '%-HLP'
    or v.sku ilike '%-FLP'
    or v.sku ilike '%-20R'
    or v.sku ilike '%-40R'
  );

-- 2) Delete ALL variants belonging to unauthorized Automatic / 20" machine products.
delete from public.product_variants v
using public.products p
where v.product_id = p.id
  and (
    round(coalesce(p.width_inches, 0)::numeric) = 20
    or coalesce(p.slug, '') ilike 'stretch-film-20%'
    or coalesce(p.slug, '') ilike '%genesis-machine%'
    or coalesce(p.slug, '') ilike '%-20-x-%'
    or coalesce(p.part_number, '') ilike 'HPF-SF%'
    or coalesce(p.part_number, '') ilike 'HPFSF%'
    or coalesce(p.title, '') ilike '%machine%'
    or coalesce(p.title, '') ilike '%automatic%'
    or coalesce(p.title, '') ilike '%genesis%'
  )
  and round(coalesce(p.width_inches, 0)::numeric) not in (12, 15, 18)
  and coalesce(p.slug, '') not ilike 'stretch-film-15%'
  and coalesce(p.slug, '') not ilike 'stretch-film-18%'
  and not (
    p.slug in (
      'stretch-film-20-x-51-ga-x-7000ft',
      'stretch-film-20-x-51-ga-x-9000ft',
      'stretch-film-20-x-70-ga-x-5000ft',
      'stretch-film-20-x-80-ga-x-5000ft'
    )
    or p.part_number in (
      'HPF-SF205170', 'HPF-SF205190', 'HPF-SF207050', 'HPF-SF208050',
      'HPFSF205170', 'HPFSF205190', 'HPFSF207050', 'HPFSF208050'
    )
    or (
      round(coalesce(p.width_inches, 0)::numeric) = 20
      and round(coalesce(p.gauge, 0)::numeric) = 51
      and round(coalesce(p.length_feet, 0)::numeric) in (7000, 9000)
    )
    or (
      round(coalesce(p.width_inches, 0)::numeric) = 20
      and round(coalesce(p.gauge, 0)::numeric) in (70, 80)
      and round(coalesce(p.length_feet, 0)::numeric) = 5000
    )
  );

-- 3) Delete unauthorized Automatic product rows themselves.
delete from public.products p
where (
    round(coalesce(p.width_inches, 0)::numeric) = 20
    or coalesce(p.slug, '') ilike 'stretch-film-20%'
    or coalesce(p.slug, '') ilike '%genesis-machine%'
    or coalesce(p.slug, '') ilike '%-20-x-%'
    or coalesce(p.part_number, '') ilike 'HPF-SF%'
    or coalesce(p.part_number, '') ilike 'HPFSF%'
    or coalesce(p.title, '') ilike '%machine%'
    or coalesce(p.title, '') ilike '%automatic%'
    or coalesce(p.title, '') ilike '%genesis%'
  )
  and round(coalesce(p.width_inches, 0)::numeric) not in (12, 15, 18)
  and coalesce(p.slug, '') not ilike 'stretch-film-15%'
  and coalesce(p.slug, '') not ilike 'stretch-film-18%'
  and not (
    p.slug in (
      'stretch-film-20-x-51-ga-x-7000ft',
      'stretch-film-20-x-51-ga-x-9000ft',
      'stretch-film-20-x-70-ga-x-5000ft',
      'stretch-film-20-x-80-ga-x-5000ft'
    )
    or p.part_number in (
      'HPF-SF205170', 'HPF-SF205190', 'HPF-SF207050', 'HPF-SF208050',
      'HPFSF205170', 'HPFSF205190', 'HPFSF207050', 'HPFSF208050'
    )
    or (
      round(coalesce(p.width_inches, 0)::numeric) = 20
      and round(coalesce(p.gauge, 0)::numeric) = 51
      and round(coalesce(p.length_feet, 0)::numeric) in (7000, 9000)
    )
    or (
      round(coalesce(p.width_inches, 0)::numeric) = 20
      and round(coalesce(p.gauge, 0)::numeric) in (70, 80)
      and round(coalesce(p.length_feet, 0)::numeric) = 5000
    )
  );

-- 4) Re-activate the four authorized specs (in case a prior soft-hide left them off).
update public.products p
set is_active = true
where p.slug in (
    'stretch-film-20-x-51-ga-x-7000ft',
    'stretch-film-20-x-51-ga-x-9000ft',
    'stretch-film-20-x-70-ga-x-5000ft',
    'stretch-film-20-x-80-ga-x-5000ft'
  )
  or p.part_number in (
    'HPF-SF205170', 'HPF-SF205190', 'HPF-SF207050', 'HPF-SF208050',
    'HPFSF205170', 'HPFSF205190', 'HPFSF207050', 'HPFSF208050'
  )
  or (
    round(coalesce(p.width_inches, 0)::numeric) = 20
    and round(coalesce(p.gauge, 0)::numeric) = 51
    and round(coalesce(p.length_feet, 0)::numeric) in (7000, 9000)
  )
  or (
    round(coalesce(p.width_inches, 0)::numeric) = 20
    and round(coalesce(p.gauge, 0)::numeric) in (70, 80)
    and round(coalesce(p.length_feet, 0)::numeric) = 5000
  );
