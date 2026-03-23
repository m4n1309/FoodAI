-- =====================================================
-- MIGRATION: Production-safe schema update for existing DB
-- Date: 2026-03-23
-- Target: Existing database already created from initial schema
-- =====================================================

-- Use the correct database before running:
-- USE your_database_name;

-- =====================================================
-- 1) PRECHECKS FOR DUPLICATE DATA (required for unique indexes)
-- =====================================================

-- Duplicate category slugs per restaurant
SELECT restaurant_id, slug, COUNT(*) AS duplicate_count
FROM categories
GROUP BY restaurant_id, slug
HAVING COUNT(*) > 1;

-- Duplicate menu item slugs per restaurant
SELECT restaurant_id, slug, COUNT(*) AS duplicate_count
FROM menu_items
GROUP BY restaurant_id, slug
HAVING COUNT(*) > 1;

-- Duplicate combo slugs per restaurant
SELECT restaurant_id, slug, COUNT(*) AS duplicate_count
FROM combos
GROUP BY restaurant_id, slug
HAVING COUNT(*) > 1;

-- Duplicate combo-item pairs
SELECT combo_id, menu_item_id, COUNT(*) AS duplicate_count
FROM combo_items
GROUP BY combo_id, menu_item_id
HAVING COUNT(*) > 1;

-- If any query above returns rows, resolve duplicates before continuing.

-- =====================================================
-- 2) SAFE INDEX UPDATES (only add if missing)
-- =====================================================

SET @schema_name = DATABASE();

-- unique_category_slug_per_restaurant
SET @idx_exists = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'categories'
      AND index_name = 'unique_category_slug_per_restaurant'
);
SET @sql_stmt = IF(
    @idx_exists = 0,
    'ALTER TABLE categories ADD UNIQUE KEY unique_category_slug_per_restaurant (restaurant_id, slug)',
    'SELECT ''Skip: unique_category_slug_per_restaurant already exists'' AS message'
);
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- unique_menu_item_slug_per_restaurant
SET @idx_exists = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'menu_items'
      AND index_name = 'unique_menu_item_slug_per_restaurant'
);
SET @sql_stmt = IF(
    @idx_exists = 0,
    'ALTER TABLE menu_items ADD UNIQUE KEY unique_menu_item_slug_per_restaurant (restaurant_id, slug)',
    'SELECT ''Skip: unique_menu_item_slug_per_restaurant already exists'' AS message'
);
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- unique_combo_slug_per_restaurant
SET @idx_exists = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'combos'
      AND index_name = 'unique_combo_slug_per_restaurant'
);
SET @sql_stmt = IF(
    @idx_exists = 0,
    'ALTER TABLE combos ADD UNIQUE KEY unique_combo_slug_per_restaurant (restaurant_id, slug)',
    'SELECT ''Skip: unique_combo_slug_per_restaurant already exists'' AS message'
);
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- unique_combo_item
SET @idx_exists = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'combo_items'
      AND index_name = 'unique_combo_item'
);
SET @sql_stmt = IF(
    @idx_exists = 0,
    'ALTER TABLE combo_items ADD UNIQUE KEY unique_combo_item (combo_id, menu_item_id)',
    'SELECT ''Skip: unique_combo_item already exists'' AS message'
);
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 3) REFRESH VIEWS
-- =====================================================

CREATE OR REPLACE VIEW v_order_overview AS
SELECT
    o.id,
    o.order_number,
    r.name AS restaurant_name,
    t.table_number,
    o.customer_name,
    o.customer_phone,
    o.total_amount,
    o.payment_method,
    o.payment_status,
    o.order_status,
    o.created_at,
    COUNT(oi.id) AS total_items,
    s.full_name AS staff_name
FROM orders o
JOIN restaurants r ON o.restaurant_id = r.id
LEFT JOIN tables t ON o.table_id = t.id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN staff s ON o.staff_id = s.id
GROUP BY o.id;

CREATE OR REPLACE VIEW v_popular_menu_items AS
SELECT
    mi.id,
    mi.restaurant_id,
    r.name AS restaurant_name,
    mi.name AS item_name,
    mi.price,
    COUNT(oi.id) AS order_count,
    SUM(oi.total_price) AS total_revenue,
    AVG(mir.rating) AS avg_rating
FROM menu_items mi
JOIN restaurants r ON mi.restaurant_id = r.id
LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
LEFT JOIN menu_item_reviews mir ON mi.id = mir.menu_item_id
GROUP BY mi.id;

CREATE OR REPLACE VIEW v_daily_revenue AS
SELECT
    restaurant_id,
    DATE(created_at) AS order_date,
    COUNT(*) AS total_orders,
    SUM(total_amount) AS total_revenue,
    AVG(total_amount) AS avg_order_value,
    SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END) AS cash_revenue,
    SUM(CASE WHEN payment_method = 'bank_transfer' THEN total_amount ELSE 0 END) AS bank_transfer_revenue
FROM orders
WHERE order_status = 'completed' AND payment_status = 'paid'
GROUP BY restaurant_id, DATE(created_at);

-- =====================================================
-- 4) REFRESH STORED PROCEDURES
-- =====================================================

DELIMITER //

DROP PROCEDURE IF EXISTS sp_generate_order_number //
CREATE PROCEDURE sp_generate_order_number(
    IN p_restaurant_id BIGINT,
    OUT p_order_number VARCHAR(50)
)
BEGIN
    DECLARE v_exists INT DEFAULT 1;

    -- Generate collision-resistant order code for concurrent requests
    WHILE v_exists > 0 DO
        SET p_order_number = CONCAT('ORD', DATE_FORMAT(NOW(), '%Y%m%d'), '-', UUID_SHORT());

        SELECT COUNT(*) INTO v_exists
        FROM orders
        WHERE order_number = p_order_number;
    END WHILE;
END //

DROP PROCEDURE IF EXISTS sp_update_order_item_status //
CREATE PROCEDURE sp_update_order_item_status(
    IN p_order_item_id BIGINT,
    IN p_new_status VARCHAR(20),
    IN p_staff_id BIGINT
)
BEGIN
    DECLARE v_order_id BIGINT;
    DECLARE v_restaurant_id BIGINT;
    DECLARE v_item_name VARCHAR(255);

    UPDATE order_items
    SET item_status = p_new_status,
        prepared_by = IF(p_new_status = 'ready', p_staff_id, prepared_by),
        prepared_at = IF(p_new_status = 'ready', NOW(), prepared_at)
    WHERE id = p_order_item_id;

    SELECT oi.order_id, o.restaurant_id, oi.item_name
    INTO v_order_id, v_restaurant_id, v_item_name
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE oi.id = p_order_item_id;

    IF p_new_status = 'ready' THEN
        INSERT INTO notifications (restaurant_id, recipient_type, order_id, notification_type, title, message)
        VALUES (
            v_restaurant_id,
            'staff',
            v_order_id,
            'item_ready',
            'Món ăn đã sẵn sàng',
            CONCAT('Món "', v_item_name, '" đã hoàn thành và sẵn sàng phục vụ')
        );
    END IF;
END //

DROP PROCEDURE IF EXISTS sp_calculate_order_total //
CREATE PROCEDURE sp_calculate_order_total(
    IN p_order_id BIGINT
)
BEGIN
    DECLARE v_subtotal DECIMAL(10,2);
    DECLARE v_tax_rate DECIMAL(5,2);
    DECLARE v_service_rate DECIMAL(5,2);
    DECLARE v_tax_amount DECIMAL(10,2);
    DECLARE v_service_charge DECIMAL(10,2);
    DECLARE v_total DECIMAL(10,2);

    SELECT COALESCE(SUM(total_price), 0) INTO v_subtotal
    FROM order_items
    WHERE order_id = p_order_id;

    SELECT r.tax_rate, r.service_charge_rate
    INTO v_tax_rate, v_service_rate
    FROM orders o
    JOIN restaurants r ON o.restaurant_id = r.id
    WHERE o.id = p_order_id;

    SET v_tax_amount = v_subtotal * v_tax_rate / 100;
    SET v_service_charge = v_subtotal * v_service_rate / 100;
    SET v_total = v_subtotal + v_tax_amount + v_service_charge;

    UPDATE orders
    SET subtotal = v_subtotal,
        tax_amount = v_tax_amount,
        service_charge = v_service_charge,
        total_amount = v_total
    WHERE id = p_order_id;
END //

DELIMITER ;

-- =====================================================
-- 5) REFRESH TRIGGERS
-- =====================================================

DELIMITER //

DROP TRIGGER IF EXISTS tr_order_items_after_insert //
CREATE TRIGGER tr_order_items_after_insert
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
    CALL sp_calculate_order_total(NEW.order_id);
END //

DROP TRIGGER IF EXISTS tr_order_items_after_update //
CREATE TRIGGER tr_order_items_after_update
AFTER UPDATE ON order_items
FOR EACH ROW
BEGIN
    CALL sp_calculate_order_total(NEW.order_id);
END //

DROP TRIGGER IF EXISTS tr_order_items_after_delete //
CREATE TRIGGER tr_order_items_after_delete
AFTER DELETE ON order_items
FOR EACH ROW
BEGIN
    CALL sp_calculate_order_total(OLD.order_id);
END //

DROP TRIGGER IF EXISTS tr_orders_status_update //
CREATE TRIGGER tr_orders_status_update
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    IF NEW.order_status = 'completed' OR NEW.order_status = 'cancelled' THEN
        IF NOT EXISTS (
            SELECT 1 FROM orders
            WHERE table_id = NEW.table_id
              AND id != NEW.id
              AND order_status NOT IN ('completed', 'cancelled', 'cart')
        ) THEN
            UPDATE tables SET status = 'available' WHERE id = NEW.table_id;
        END IF;
    ELSEIF OLD.order_status = 'cart' AND NEW.order_status = 'pending' THEN
        UPDATE tables SET status = 'occupied' WHERE id = NEW.table_id;
    END IF;
END //

DROP TRIGGER IF EXISTS tr_orders_completed //
CREATE TRIGGER tr_orders_completed
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    IF NEW.order_status = 'completed'
       AND OLD.order_status != 'completed'
       AND NEW.customer_id IS NOT NULL THEN
        UPDATE customers
        SET total_orders = total_orders + 1,
            total_spent = total_spent + NEW.total_amount
        WHERE id = NEW.customer_id;
    END IF;
END //

DELIMITER ;

-- =====================================================
-- 6) EVENT FOR SESSION CLEANUP
-- =====================================================

DELIMITER //

CREATE EVENT IF NOT EXISTS evt_cleanup_expired_sessions
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW();
END //

DELIMITER ;

-- IMPORTANT:
-- Do NOT run: SET GLOBAL event_scheduler = ON;
-- Enable event scheduler at server level (DBA/ops): event_scheduler=ON

-- =====================================================
-- END OF MIGRATION
-- =====================================================
