UPDATE free_download_items AS item
SET description_html = split_part(item.description_html, '<h2>What you can do</h2>', 1),
    updated_at = NOW()
FROM free_download_categories AS category
WHERE item.category_id = category.id
  AND category.slug = 'free-creator-tools'
  AND item.description_html LIKE '%<h2>What you can do</h2>%';
