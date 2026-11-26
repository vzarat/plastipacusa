-- Remove seeded / placeholder USA bespoke sheet rows (no real warehouse data).
delete from public.warehouse_inventory_items
where warehouse_code = 'USA'
  and item_name in (
    'Stretch film hand 18" 60ga (client hold)',
    'Stretch film machine 20" 51ga (client hold)',
    'Foam sheet / laminado',
    'Corner board / cantonera',
    'Misc. packaging supplies'
  );
