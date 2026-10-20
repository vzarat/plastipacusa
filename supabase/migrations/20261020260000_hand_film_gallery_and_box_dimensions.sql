-- Live products.images is text[] (ARRAY NOT NULL DEFAULT '{}'::text[]).
-- Variants do not store images. products.image_url is not in the live schema.
--
-- Hand stretch film gallery, exactly three images:
--   1. The stored roll photo
--   2. CAJA_MANUAL_PLASTIPAC.png
--   3. FICHA TECNICA.png
-- Carton: 11" W x 11" L x 19.5" H (Skydropx 0.28 m x 0.28 m x 0.50 m).
-- Machine film is not changed.
-- Run the whole file in one go, from DO $$ through the final SELECT.
-- Do not run a highlighted fragment.

DO $$
DECLARE
  box_url text := 'https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PRODUCTOS/CAJA_MANUAL_PLASTIPAC.png';
  sheet_url text := 'https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PRODUCTOS/FICHA%20TECNICA.png';
  roll_fallback text := 'https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png';
BEGIN
  ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS box_length_in numeric(6, 2),
    ADD COLUMN IF NOT EXISTS box_width_in numeric(6, 2),
    ADD COLUMN IF NOT EXISTS box_height_in numeric(6, 2);

  ALTER TABLE public.product_variants
    ADD COLUMN IF NOT EXISTS dimensions text,
    ADD COLUMN IF NOT EXISTS package_dimensions text;

  UPDATE public.products AS p
  SET
    box_length_in = 11,
    box_width_in = 11,
    box_height_in = 19.5,
    images = ARRAY[
      COALESCE(
        (
          SELECT shot.img
          FROM unnest(COALESCE(p.images, ARRAY[]::text[])) WITH ORDINALITY AS shot(img, ord)
          WHERE COALESCE(shot.img, '') <> ''
            AND shot.img NOT ILIKE '%CAJA_MANUAL_PLASTIPAC%'
            AND shot.img NOT ILIKE '%FICHA%TECNICA%'
          ORDER BY shot.ord
          LIMIT 1
        ),
        roll_fallback
      ),
      box_url,
      sheet_url
    ]::text[]
  WHERE ROUND(COALESCE(p.width_inches, 0)::numeric) IN (12, 15, 18)
    AND lower(COALESCE(p.type::text, '')) NOT LIKE '%machine%'
    AND lower(COALESCE(p.type::text, '')) NOT LIKE '%automatic%'
    AND COALESCE(p.slug, '') NOT ILIKE '%machine%'
    AND COALESCE(p.slug, '') NOT ILIKE '%genesis%'
    AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-20%';

  UPDATE public.product_variants AS v
  SET
    dimensions = '11" W x 11" L x 19.5" H',
    package_dimensions = '11" W x 11" L x 19.5" H'
  FROM public.products AS p
  WHERE v.product_id = p.id
    AND COALESCE(v.boxes_count, 0) = 1
    AND ROUND(COALESCE(p.width_inches, 0)::numeric) IN (12, 15, 18)
    AND lower(COALESCE(p.type::text, '')) NOT LIKE '%machine%'
    AND lower(COALESCE(p.type::text, '')) NOT LIKE '%automatic%'
    AND COALESCE(p.slug, '') NOT ILIKE '%machine%'
    AND COALESCE(p.slug, '') NOT ILIKE '%genesis%'
    AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-20%';
END $$;

SELECT
  p.slug,
  p.box_width_in,
  p.box_length_in,
  p.box_height_in,
  p.images
FROM public.products AS p
WHERE ROUND(COALESCE(p.width_inches, 0)::numeric) IN (12, 15, 18)
  AND lower(COALESCE(p.type::text, '')) NOT LIKE '%machine%'
  AND lower(COALESCE(p.type::text, '')) NOT LIKE '%automatic%'
  AND COALESCE(p.slug, '') NOT ILIKE '%machine%'
  AND COALESCE(p.slug, '') NOT ILIKE '%genesis%'
  AND COALESCE(p.slug, '') NOT ILIKE 'stretch-film-20%'
ORDER BY p.slug;
