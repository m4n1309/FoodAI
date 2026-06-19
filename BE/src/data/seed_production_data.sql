-- =====================================================
-- SEED DATA: Bổ sung món ăn Việt Nam vào Database Production
-- Cho nhà hàng m4nfood (restaurant_id = 1)
-- Sử dụng SET NAMES utf8mb4 để khắc phục lỗi font chữ
-- Tự động dọn dẹp các bản ghi cũ bị lỗi font trước khi chèn mới
-- =====================================================

SET NAMES utf8mb4;

-- 1. Xóa các món ăn cũ đã chèn để tránh trùng lặp hoặc lỗi font
DELETE FROM menu_items WHERE slug IN (
    'banh-khot-vung-tau', 'goi-du-du-tai-heo', 'banh-xeo-mien-tay', 
    'com-ca-loc-kho-to', 'lau-cua-dong-bap-bo', 'ngheu-hap-sa-ot', 
    'so-long-nuong-mo-hanh', 'sua-chua-nep-cam', 'banh-da-lon-la-dua', 
    'nuoc-sau-da-ha-noi', 'tra-sen-vang-cu-nang', 'dau-hu-sot-ca-chua', 
    'cai-thia-xao-nam-dong-co', 'bia-sai-gon-special', 'bia-333-premium', 
    'pho-ga-ta-long-me', 'bun-rieu-cua-suon-sun'
);

-- 2. Chèn dữ liệu món ăn sạch có đính kèm ảnh chất lượng cao từ Unsplash
-- Khai vị (category_id = 1)
INSERT INTO menu_items (
    restaurant_id, category_id, name, slug, description, price, 
    image_url, preparation_time, calories, is_vegetarian, is_spicy, ingredients, allergens, is_available, is_featured
) VALUES 
(
    1, 1, 'Bánh khọt Vũng Tàu', 'banh-khot-vung-tau', 
    'Bánh khọt truyền thống giòn rụm với nhân tôm tươi, quét mỡ hành thơm phức, ăn kèm rau sống và nước mắm chua ngọt.', 
    60000.00, 'https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=600&auto=format&fit=crop&q=60', 10, 250, 0, 0, 'Bột gạo, tôm tươi, hành lá, nước cốt dừa, đu đủ bào', 'Hải sản, Gluten bột mì', 1, 1
),
(
    1, 1, 'Gỏi đu đủ tai heo', 'goi-du-du-tai-heo', 
    'Gỏi đu đủ xanh bào sợi giòn sần sật, tai heo luộc giòn, đậu phộng rang giòn thơm ngon, hành phi và rau thơm hòa quyện với nước mắm chua ngọt.', 
    65000.00, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60', 10, 180, 0, 0, 'Đu đủ xanh, tai heo, cà rốt, rau thơm, đậu phộng, nước mắm', 'Đậu phộng', 1, 0
);

-- Món chính (category_id = 2)
INSERT INTO menu_items (
    restaurant_id, category_id, name, slug, description, price, 
    image_url, preparation_time, calories, is_vegetarian, is_spicy, ingredients, allergens, is_available, is_featured
) VALUES 
(
    1, 2, 'Bánh xèo miền Tây', 'banh-xeo-mien-tay', 
    'Bánh xèo vỏ vàng giòn rụm từ bột gạo và nước cốt dừa, nhân tôm, thịt ba chỉ và giá đỗ ngọt thanh, cuốn rau rừng chấm nước mắm chua ngọt.', 
    80000.00, 'https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=600&auto=format&fit=crop&q=60', 15, 350, 0, 0, 'Bột bánh xèo, tôm, thịt ba chỉ, giá đỗ, nước cốt dừa, rau sống', 'Hải sản, Gluten bột mì', 1, 1
),
(
    1, 2, 'Cơm cá lóc kho tộ', 'com-ca-loc-kho-to', 
    'Cá lóc kho tộ đậm đà hương vị truyền thống miền Nam với nước màu dừa, tiêu đen và hành lá. Ăn kèm cơm trắng nóng hổi.', 
    90000.00, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=60', 20, 420, 0, 0, 'Cá lóc tươi, cơm trắng, nước mắm, nước màu dừa, tiêu, hành lá', 'Cá', 1, 0
);

-- Lẩu (category_id = 3)
INSERT INTO menu_items (
    restaurant_id, category_id, name, slug, description, price, 
    image_url, preparation_time, calories, is_vegetarian, is_spicy, ingredients, allergens, is_available, is_featured
) VALUES 
(
    1, 3, 'Lẩu cua đồng bắp bò', 'lau-cua-dong-bap-bo', 
    'Lẩu cua đồng thanh mát ngọt lịm với riêu cua chưng gạch béo ngậy, ăn kèm bắp bò tươi thái mỏng, sườn sụn giòn sần sật và rau nhúng lẩu.', 
    390000.00, 'https://images.unsplash.com/photo-1555124818-7255d41f5778?w=600&auto=format&fit=crop&q=60', 15, 850, 0, 0, 'Cua đồng, bắp bò, sườn sụn, đậu hũ chiên, cà chua, hành tím, các loại rau nhúng lẩu', 'Hải sản (cua)', 1, 1
);

-- Hải sản (category_id = 4)
INSERT INTO menu_items (
    restaurant_id, category_id, name, slug, description, price, 
    image_url, preparation_time, calories, is_vegetarian, is_spicy, ingredients, allergens, is_available, is_featured
) VALUES 
(
    1, 4, 'Nghêu hấp sả ớt', 'ngheu-hap-sa-ot', 
    'Nghêu hấp sả và ớt tươi ngọt lịm, ấm nồng thơm mùi sả, nước dùng húp nóng cực kỳ hấp dẫn.', 
    95000.00, 'https://images.unsplash.com/photo-1534080391025-09795d197a5b?w=600&auto=format&fit=crop&q=60', 10, 150, 0, 1, 'Nghêu tươi, sả, ớt, lá chanh, nước mắm', 'Hải sản (nghêu)', 1, 0
),
(
    1, 4, 'Sò lông nướng mỡ hành', 'so-long-nuong-mo-hanh', 
    'Sò lông tươi nướng mỡ hành thơm nức trên than hồng, rắc thêm đậu phộng giòn béo ngậy chấm cùng muối tiêu chanh.', 
    120000.00, 'https://images.unsplash.com/photo-1534080391025-09795d197a5b?w=600&auto=format&fit=crop&q=60', 15, 210, 0, 0, 'Sò lông, mỡ hành, đậu phộng rang, gia vị', 'Hải sản, Đậu phộng', 1, 1
);

-- Tráng miệng (category_id = 5)
INSERT INTO menu_items (
    restaurant_id, category_id, name, slug, description, price, 
    image_url, preparation_time, calories, is_vegetarian, is_spicy, ingredients, allergens, is_available, is_featured
) VALUES 
(
    1, 5, 'Sữa chua nếp cẩm', 'sua-chua-nep-cam', 
    'Sữa chua mát lạnh kết hợp nếp cẩm Tây Bắc dẻo ngọt, thơm bùi béo ngậy hòa quyện cùng nước cốt dừa.', 
    30000.00, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=60', 5, 120, 1, 0, 'Sữa chua, nếp cẩm ngâm đường, nước cốt dừa', 'Sữa', 1, 1
),
(
    1, 5, 'Bánh da lợn lá dứa', 'banh-da-lon-la-dua', 
    'Bánh da lợn lá dứa truyền thống dẻo dai thơm lừng hương lá dứa tự nhiên, xen lẫn lớp nhân đậu xanh ngọt bùi.', 
    20000.00, 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&auto=format&fit=crop&q=60', 5, 90, 1, 0, 'Bột năng, bột gạo, lá dứa, đậu xanh, nước cốt dừa', NULL, 1, 0
);

-- Đồ uống (category_id = 6)
INSERT INTO menu_items (
    restaurant_id, category_id, name, slug, description, price, 
    image_url, preparation_time, calories, is_vegetarian, is_spicy, ingredients, allergens, is_available, is_featured
) VALUES 
(
    1, 6, 'Nước sấu đá Hà Nội', 'nuoc-sau-da-ha-noi', 
    'Thức uống giải nhiệt mùa hè đặc trưng Hà Nội với quả sấu ngâm đường chua ngọt thanh mát, giòn sần sật thơm mùi gừng giã.', 
    25000.00, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=60', 5, 80, 1, 0, 'Quả sấu ngâm, nước đường sấu, gừng, đá viên', NULL, 1, 0
),
(
    1, 6, 'Trà sen vàng củ năng', 'tra-sen-vang-cu-nang', 
    'Trà ô long thanh nhẹ kết hợp hạt sen chín mềm bùi ngọt, củ năng cắt nhỏ giòn giòn cùng lớp kem sữa béo ngậy trên bề mặt.', 
    45000.00, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=60', 5, 150, 1, 0, 'Trà ô long, hạt sen, củ năng, kem sữa béo', 'Sữa', 1, 1
);

-- Món chay (category_id = 10)
INSERT INTO menu_items (
    restaurant_id, category_id, name, slug, description, price, 
    image_url, preparation_time, calories, is_vegetarian, is_spicy, ingredients, allergens, is_available, is_featured
) VALUES 
(
    1, 10, 'Đậu hũ sốt cà chua', 'dau-hu-sot-ca-chua', 
    'Đậu hũ chiên vàng giòn sốt cùng cà chua tươi chín mọng, nêm nếm gia vị chay thanh đạm đưa cơm.', 
    45000.00, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60', 10, 160, 1, 0, 'Đậu hũ, cà chua tươi, hành boa-rô, gia vị chay', NULL, 1, 0
),
(
    1, 10, 'Cải thìa xào nấm đông cô', 'cai-thia-xao-nam-dong-co', 
    'Cải thìa tươi xanh giòn ngọt xào cùng nấm đông cô thơm phức dưới sốt dầu hào chay đậm đà.', 
    55000.00, 'https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=600&auto=format&fit=crop&q=60', 10, 110, 1, 0, 'Cải thìa, nấm đông cô tươi, dầu hào chay, tỏi (tùy chọn)', NULL, 1, 0
);

-- Đồ Uống Có Cồn (category_id = 11)
INSERT INTO menu_items (
    restaurant_id, category_id, name, slug, description, price, 
    image_url, preparation_time, calories, is_vegetarian, is_spicy, ingredients, allergens, is_available, is_featured
) VALUES 
(
    1, 11, 'Bia Sài Gòn Special', 'bia-sai-gon-special', 
    'Bia tươi mát lạnh hương vị đậm đà được sản xuất từ 100% lúa mạch tuyển chọn.', 
    25000.00, 'https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=600&auto=format&fit=crop&q=60', 2, 140, 0, 0, 'Lúa mạch, hoa bia, nước', 'Gluten lúa mạch', 1, 0
),
(
    1, 11, 'Bia 333 Premium', 'bia-333-premium', 
    'Thương hiệu bia lon huyền thoại của Việt Nam, đậm đà khó quên.', 
    22000.00, 'https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=600&auto=format&fit=crop&q=60', 2, 135, 0, 0, 'Lúa mạch, hoa bia, ngũ cốc', 'Gluten ngũ cốc', 1, 0
);

-- Phở, Bún (category_id = 12)
INSERT INTO menu_items (
    restaurant_id, category_id, name, slug, description, price, 
    image_url, preparation_time, calories, is_vegetarian, is_spicy, ingredients, allergens, is_available, is_featured
) VALUES 
(
    1, 12, 'Phở gà ta lòng mề', 'pho-ga-ta-long-me', 
    'Phở gà ta truyền thống với bánh phở dẻo dai, thịt gà ta xé phay da vàng giòn, nước dùng gà thanh ngọt tự nhiên dậy mùi lá chanh, ăn kèm lòng mề hấp dẫn.', 
    70000.00, 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&auto=format&fit=crop&q=60', 10, 380, 0, 0, 'Thịt gà ta, lòng mề gà, bánh phở, nước dùng xương gà, lá chanh', NULL, 1, 0
),
(
    1, 12, 'Bún riêu cua sườn sụn', 'bun-rieu-cua-suon-sun', 
    'Bún riêu cua đồng đậm đà, gạch cua xịn giòn béo kết hợp sườn sụn non ninh mềm sần sật, cà chua và đậu hũ chiên.', 
    65000.00, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=60', 10, 410, 0, 0, 'Cua đồng, sườn sụn, bún tươi, đậu hũ, cà chua, hành lá, rau sống', 'Hải sản (cua)', 1, 1
);
