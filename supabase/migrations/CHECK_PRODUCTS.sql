-- Check what products exist in database
SELECT 
  id,
  name,
  sku,
  store_id,
  category_id,
  stock,
  selling_price
FROM public.products
ORDER BY created_at DESC
LIMIT 10;

-- Check which branch the products belong to
SELECT 
  p.name as product_name,
  p.sku,
  b.name as branch_name,
  p.store_id,
  CASE 
    WHEN p.store_id IS NULL THEN 'Global Product'
    WHEN b.id IS NOT NULL THEN 'Assigned to Branch'
    ELSE 'ERROR: Invalid branch ID'
  END as status
FROM public.products p
LEFT JOIN public.branches b ON p.store_id = b.id
ORDER BY p.created_at DESC
LIMIT 10;
