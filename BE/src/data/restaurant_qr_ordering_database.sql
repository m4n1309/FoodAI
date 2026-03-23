-- =====================================================
-- DATABASE SCHEMA FOR QR CODE RESTAURANT ORDERING SYSTEM
-- Hệ thống đặt món qua QR Code cho Nhà hàng
-- =====================================================

-- Bảng Nhà hàng (Restaurants)
CREATE TABLE restaurants (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    description TEXT,
    logo_url VARCHAR(500),
    opening_hours JSON, -- {"monday": "8:00-22:00", "tuesday": "8:00-22:00", ...}
    is_active BOOLEAN DEFAULT TRUE,
    tax_rate DECIMAL(5,2) DEFAULT 0.00, -- % thuế VAT
    service_charge_rate DECIMAL(5,2) DEFAULT 0.00, -- % phí phục vụ
    bank_info JSON, -- Thông tin chuyển khoản
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_active (is_active)
);

-- Bảng Bàn ăn (Tables)
CREATE TABLE tables (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id BIGINT NOT NULL,
    table_number VARCHAR(50) NOT NULL,
    qr_code VARCHAR(500) UNIQUE NOT NULL, -- Mã QR duy nhất
    capacity INT DEFAULT 4, -- Số người tối đa
    location VARCHAR(100), -- Vị trí: "Tầng 1", "Khu vườn", etc.
    status ENUM('available', 'occupied', 'reserved', 'maintenance') DEFAULT 'available',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    UNIQUE KEY unique_table (restaurant_id, table_number),
    INDEX idx_restaurant (restaurant_id),
    INDEX idx_qr_code (qr_code),
    INDEX idx_status (status)
);

-- Bảng Danh mục món ăn (Categories)
CREATE TABLE categories (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    UNIQUE KEY unique_category_slug_per_restaurant (restaurant_id, slug),
    INDEX idx_restaurant (restaurant_id),
    INDEX idx_active (is_active),
    INDEX idx_order (display_order)
);

-- Bảng Món ăn (Menu Items)
CREATE TABLE menu_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id BIGINT NOT NULL,
    category_id BIGINT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    discount_price DECIMAL(10,2), -- Giá khuyến mãi
    image_url VARCHAR(500),
    images JSON, -- Nhiều ảnh ["url1", "url2", ...]
    preparation_time INT, -- Thời gian chuẩn bị (phút)
    calories INT,
    is_vegetarian BOOLEAN DEFAULT FALSE,
    is_spicy BOOLEAN DEFAULT FALSE,
    ingredients TEXT, -- Nguyên liệu
    allergens VARCHAR(500), -- Chất gây dị ứng
    is_available BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE, -- Món nổi bật
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    UNIQUE KEY unique_menu_item_slug_per_restaurant (restaurant_id, slug),
    INDEX idx_restaurant (restaurant_id),
    INDEX idx_category (category_id),
    INDEX idx_available (is_available),
    INDEX idx_featured (is_featured),
    FULLTEXT idx_search (name, description)
);

-- Bảng Combo
CREATE TABLE combos (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    discount_price DECIMAL(10,2),
    image_url VARCHAR(500),
    is_available BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP NULL,
    valid_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    UNIQUE KEY unique_combo_slug_per_restaurant (restaurant_id, slug),
    INDEX idx_restaurant (restaurant_id),
    INDEX idx_available (is_available)
);

-- Bảng Món ăn trong Combo
CREATE TABLE combo_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    combo_id BIGINT NOT NULL,
    menu_item_id BIGINT NOT NULL,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    UNIQUE KEY unique_combo_item (combo_id, menu_item_id),
    INDEX idx_combo (combo_id),
    INDEX idx_menu_item (menu_item_id)
);

-- Bảng Khách hàng (Customers)
CREATE TABLE customers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(255),
    full_name VARCHAR(255),
    avatar_url VARCHAR(500),
    loyalty_points INT DEFAULT 0, -- Điểm tích lũy
    total_orders INT DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_email (email)
);

-- Bảng Nhân viên (Staff)
CREATE TABLE staff (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id BIGINT NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    role ENUM('admin', 'manager', 'waiter', 'kitchen', 'cashier') NOT NULL,
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    INDEX idx_restaurant (restaurant_id),
    INDEX idx_username (username),
    INDEX idx_role (role)
);

-- =====================================================
-- BẢNG SESSIONS - Quản lý phiên đăng nhập của Staff (Minimal Version)
-- Tạo sau bảng staff để tránh lỗi foreign key khi deploy mới
-- =====================================================

CREATE TABLE sessions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    staff_id BIGINT NOT NULL,
    refresh_token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,

    INDEX idx_staff_id (staff_id),
    INDEX idx_refresh_token (refresh_token),
    INDEX idx_expires_at (expires_at)
);

-- =====================================================
-- EVENT: Tự động xóa sessions hết hạn
-- Lưu ý: cần bật event_scheduler ở cấp server bởi DBA khi vận hành
-- =====================================================

DELIMITER //

CREATE EVENT IF NOT EXISTS evt_cleanup_expired_sessions
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW();
END //

DELIMITER ;

-- Bảng Đơn hàng (Orders)
CREATE TABLE orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(50) UNIQUE NOT NULL, -- Mã đơn hàng
    restaurant_id BIGINT NOT NULL,
    table_id BIGINT,
    customer_id BIGINT,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_note TEXT, -- Ghi chú của khách
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Tổng tiền món ăn
    tax_amount DECIMAL(10,2) DEFAULT 0.00, -- Tiền thuế
    service_charge DECIMAL(10,2) DEFAULT 0.00, -- Phí phục vụ
    discount_amount DECIMAL(10,2) DEFAULT 0.00, -- Giảm giá
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Tổng cộng
    payment_method ENUM('cash', 'bank_transfer', 'card', 'e_wallet') NULL,
    payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
    payment_proof_url VARCHAR(500), -- Ảnh chứng từ chuyển khoản
    order_status ENUM('cart', 'pending', 'confirmed', 'preparing', 'ready', 'serving', 'completed', 'cancelled') DEFAULT 'cart',
    cancelled_reason TEXT,
    staff_id BIGINT, -- Nhân viên xử lý
    session_id VARCHAR(255), -- Session cho khách chưa đăng nhập
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL,
    INDEX idx_order_number (order_number),
    INDEX idx_restaurant (restaurant_id),
    INDEX idx_table (table_id),
    INDEX idx_customer (customer_id),
    INDEX idx_status (order_status),
    INDEX idx_payment_status (payment_status),
    INDEX idx_created_at (created_at)
);

-- Bảng Chi tiết đơn hàng (Order Items)
CREATE TABLE order_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    menu_item_id BIGINT,
    combo_id BIGINT,
    item_type ENUM('menu_item', 'combo') NOT NULL,
    item_name VARCHAR(255) NOT NULL, -- Lưu tên để tránh mất data khi xóa món
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    special_instructions TEXT, -- Yêu cầu đặc biệt
    item_status ENUM('pending', 'preparing', 'ready', 'served', 'cancelled') DEFAULT 'pending',
    prepared_by BIGINT, -- Nhân viên bếp chuẩn bị
    prepared_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL,
    FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE SET NULL,
    FOREIGN KEY (prepared_by) REFERENCES staff(id) ON DELETE SET NULL,
    INDEX idx_order (order_id),
    INDEX idx_menu_item (menu_item_id),
    INDEX idx_combo (combo_id),
    INDEX idx_status (item_status)
);

-- Bảng Đánh giá (Reviews)
CREATE TABLE reviews (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id BIGINT NOT NULL,
    order_id BIGINT,
    customer_id BIGINT,
    customer_name VARCHAR(255),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    images JSON, -- Ảnh đính kèm
    response TEXT, -- Phản hồi từ nhà hàng
    responded_by BIGINT, -- Nhân viên phản hồi
    responded_at TIMESTAMP NULL,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (responded_by) REFERENCES staff(id) ON DELETE SET NULL,
    INDEX idx_restaurant (restaurant_id),
    INDEX idx_order (order_id),
    INDEX idx_customer (customer_id),
    INDEX idx_rating (rating),
    INDEX idx_created_at (created_at)
);

-- Bảng Đánh giá món ăn
CREATE TABLE menu_item_reviews (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    menu_item_id BIGINT NOT NULL,
    order_item_id BIGINT,
    customer_id BIGINT,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    INDEX idx_menu_item (menu_item_id),
    INDEX idx_customer (customer_id)
);

-- Bảng Lịch sử chat với AI Chatbot
CREATE TABLE chatbot_conversations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id BIGINT NOT NULL,
    customer_id BIGINT,
    session_id VARCHAR(255) NOT NULL, -- Session cho khách chưa đăng nhập
    table_id BIGINT,
    order_id BIGINT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    INDEX idx_restaurant (restaurant_id),
    INDEX idx_customer (customer_id),
    INDEX idx_session (session_id)
);

-- Bảng Tin nhắn chat
CREATE TABLE chatbot_messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    conversation_id BIGINT NOT NULL,
    sender_type ENUM('customer', 'bot', 'staff') NOT NULL,
    sender_id BIGINT, -- ID của staff nếu là nhân viên
    message TEXT NOT NULL,
    message_type ENUM('text', 'image', 'menu_recommendation', 'order_status') DEFAULT 'text',
    metadata JSON, -- Thông tin bổ sung
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES staff(id) ON DELETE SET NULL,
    INDEX idx_conversation (conversation_id),
    INDEX idx_created_at (created_at)
);

-- Bảng Thông báo (Notifications)
CREATE TABLE notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id BIGINT NOT NULL,
    recipient_type ENUM('customer', 'staff', 'kitchen') NOT NULL,
    recipient_id BIGINT, -- ID của customer hoặc staff
    order_id BIGINT,
    notification_type VARCHAR(50) NOT NULL, -- 'order_confirmed', 'item_ready', 'payment_received', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSON, -- Dữ liệu bổ sung
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_restaurant (restaurant_id),
    INDEX idx_recipient (recipient_type, recipient_id),
    INDEX idx_order (order_id),
    INDEX idx_read (is_read)
);

-- Bảng Khuyến mãi (Promotions)
CREATE TABLE promotions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id BIGINT NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type ENUM('percentage', 'fixed_amount') NOT NULL,
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2),
    max_discount_amount DECIMAL(10,2),
    usage_limit INT, -- Số lần sử dụng tối đa
    usage_count INT DEFAULT 0, -- Số lần đã sử dụng
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    INDEX idx_restaurant (restaurant_id),
    INDEX idx_code (code),
    INDEX idx_active (is_active)
);

-- Bảng Sử dụng mã khuyến mãi
CREATE TABLE promotion_usage (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    promotion_id BIGINT NOT NULL,
    order_id BIGINT NOT NULL,
    customer_id BIGINT,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    INDEX idx_promotion (promotion_id),
    INDEX idx_order (order_id),
    INDEX idx_customer (customer_id)
);

-- Bảng Lịch sử thanh toán (Payment History)
CREATE TABLE payment_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'bank_transfer', 'card', 'e_wallet') NOT NULL,
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    transaction_id VARCHAR(255), -- Mã giao dịch từ ngân hàng/ví điện tử
    payment_proof_url VARCHAR(500),
    notes TEXT,
    processed_by BIGINT, -- Nhân viên xử lý
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES staff(id) ON DELETE SET NULL,
    INDEX idx_order (order_id),
    INDEX idx_status (payment_status)
);

-- Bảng Báo cáo doanh thu (Revenue Reports)
CREATE TABLE revenue_reports (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id BIGINT NOT NULL,
    report_date DATE NOT NULL,
    total_orders INT DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    total_tax DECIMAL(12,2) DEFAULT 0.00,
    total_service_charge DECIMAL(12,2) DEFAULT 0.00,
    total_discount DECIMAL(12,2) DEFAULT 0.00,
    cash_revenue DECIMAL(12,2) DEFAULT 0.00,
    bank_transfer_revenue DECIMAL(12,2) DEFAULT 0.00,
    card_revenue DECIMAL(12,2) DEFAULT 0.00,
    e_wallet_revenue DECIMAL(12,2) DEFAULT 0.00,
    average_order_value DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    UNIQUE KEY unique_report (restaurant_id, report_date),
    INDEX idx_restaurant (restaurant_id),
    INDEX idx_date (report_date)
);

-- Bảng Hoạt động của nhân viên (Activity Logs)
CREATE TABLE activity_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    restaurant_id BIGINT NOT NULL,
    staff_id BIGINT,
    action_type VARCHAR(100) NOT NULL, -- 'order_created', 'item_completed', 'payment_processed', etc.
    entity_type VARCHAR(50), -- 'order', 'menu_item', etc.
    entity_id BIGINT,
    description TEXT,
    metadata JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL,
    INDEX idx_restaurant (restaurant_id),
    INDEX idx_staff (staff_id),
    INDEX idx_action (action_type),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- VIEWS - Các view hữu ích
-- =====================================================

-- View: Tổng quan đơn hàng
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

-- View: Món ăn phổ biến
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

-- View: Doanh thu theo ngày
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
-- STORED PROCEDURES - Các thủ tục hữu ích
-- =====================================================

DELIMITER //

-- Procedure: Tạo mã đơn hàng tự động
DROP PROCEDURE IF EXISTS sp_generate_order_number //
CREATE PROCEDURE sp_generate_order_number(
    IN p_restaurant_id BIGINT,
    OUT p_order_number VARCHAR(50)
)
BEGIN
    DECLARE v_exists INT DEFAULT 1;

    -- Tránh đụng mã đơn trong trường hợp tạo đồng thời nhiều đơn hàng
    WHILE v_exists > 0 DO
        SET p_order_number = CONCAT('ORD', DATE_FORMAT(NOW(), '%Y%m%d'), '-', UUID_SHORT());

        SELECT COUNT(*) INTO v_exists
        FROM orders
        WHERE order_number = p_order_number;
    END WHILE;
END //

-- Procedure: Cập nhật trạng thái món ăn và thông báo
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
    
    -- Cập nhật trạng thái món
    UPDATE order_items 
    SET item_status = p_new_status,
        prepared_by = IF(p_new_status = 'ready', p_staff_id, prepared_by),
        prepared_at = IF(p_new_status = 'ready', NOW(), prepared_at)
    WHERE id = p_order_item_id;
    
    -- Lấy thông tin để tạo thông báo
    SELECT oi.order_id, o.restaurant_id, oi.item_name
    INTO v_order_id, v_restaurant_id, v_item_name
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE oi.id = p_order_item_id;
    
    -- Tạo thông báo nếu món đã sẵn sàng
    IF p_new_status = 'ready' THEN
        INSERT INTO notifications (restaurant_id, recipient_type, order_id, notification_type, title, message)
        VALUES (v_restaurant_id, 'staff', v_order_id, 'item_ready', 'Món ăn đã sẵn sàng', 
                CONCAT('Món "', v_item_name, '" đã hoàn thành và sẵn sàng phục vụ'));
    END IF;
END //

-- Procedure: Tính toán tổng đơn hàng
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
    
    -- Tính tổng tiền món ăn
    SELECT COALESCE(SUM(total_price), 0) INTO v_subtotal
    FROM order_items
    WHERE order_id = p_order_id;
    
    -- Lấy tỷ lệ thuế và phí phục vụ
    SELECT r.tax_rate, r.service_charge_rate
    INTO v_tax_rate, v_service_rate
    FROM orders o
    JOIN restaurants r ON o.restaurant_id = r.id
    WHERE o.id = p_order_id;
    
    -- Tính thuế và phí
    SET v_tax_amount = v_subtotal * v_tax_rate / 100;
    SET v_service_charge = v_subtotal * v_service_rate / 100;
    SET v_total = v_subtotal + v_tax_amount + v_service_charge;
    
    -- Cập nhật đơn hàng
    UPDATE orders
    SET subtotal = v_subtotal,
        tax_amount = v_tax_amount,
        service_charge = v_service_charge,
        total_amount = v_total
    WHERE id = p_order_id;
END //

DELIMITER ;

-- =====================================================
-- TRIGGERS - Các trigger tự động
-- =====================================================

DELIMITER //

-- Trigger: Tự động cập nhật tổng đơn hàng khi thêm/sửa/xóa món
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

-- Trigger: Cập nhật trạng thái bàn khi đơn hàng thay đổi
DROP TRIGGER IF EXISTS tr_orders_status_update //
CREATE TRIGGER tr_orders_status_update
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    IF NEW.order_status = 'completed' OR NEW.order_status = 'cancelled' THEN
        -- Kiểm tra xem có đơn hàng nào khác đang sử dụng bàn không
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

-- Trigger: Cập nhật thông tin khách hàng sau khi hoàn thành đơn
DROP TRIGGER IF EXISTS tr_orders_completed //
CREATE TRIGGER tr_orders_completed
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    IF NEW.order_status = 'completed' AND OLD.order_status != 'completed' AND NEW.customer_id IS NOT NULL THEN
        UPDATE customers
        SET total_orders = total_orders + 1,
            total_spent = total_spent + NEW.total_amount
        WHERE id = NEW.customer_id;
    END IF;
END //

DELIMITER ;

-- =====================================================
-- INDEXES - Các index bổ sung để tối ưu hiệu suất
-- =====================================================

-- Index cho tìm kiếm và báo cáo
CREATE INDEX idx_orders_date_status ON orders(created_at, order_status, payment_status);
CREATE INDEX idx_order_items_status ON order_items(item_status, order_id);
CREATE INDEX idx_notifications_recipient_read ON notifications(recipient_type, recipient_id, is_read);

-- =====================================================
-- SAMPLE DATA - Dữ liệu mẫu (tùy chọn)
-- =====================================================

-- Thêm nhà hàng mẫu
INSERT INTO restaurants (name, slug, address, phone, email, description, tax_rate, service_charge_rate, bank_info) VALUES
('Nhà Hàng Hương Việt', 'huong-viet', '123 Nguyễn Huệ, Q1, TP.HCM', '0901234567', 'info@huongviet.com', 
 'Nhà hàng ẩm thực Việt Nam truyền thống', 10.00, 5.00, 
 '{"bank_name": "Vietcombank", "account_number": "1234567890", "account_name": "Nhà Hàng Hương Việt"}');

-- =====================================================
-- END OF SCHEMA
-- =====================================================