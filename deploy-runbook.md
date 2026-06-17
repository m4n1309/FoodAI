# Hướng dẫn Triển khai Hệ thống FoodAI lên EC2/VPS

Tài liệu này hướng dẫn chi tiết từng bước thiết lập hạ tầng máy chủ, chuẩn bị dữ liệu và triển khai dự án FoodAI lên môi trường VPS/EC2 bằng Docker Compose.

---

## 1. Chuẩn bị Hạ tầng trên VPS/EC2 (Ubuntu 22.04 LTS)

### Bước 1.1: Cấu hình Nhóm Bảo mật (AWS Security Groups / Firewall)
Mở các cổng mạng sau trên VPS/EC2 để cho phép lưu lượng truy cập:
* **Cổng 22 (SSH)**: Chỉ cho phép IP của bạn để quản trị.
* **Cổng 80 (HTTP)**: Cho phép truy cập công khai (`0.0.0.0/0`).
* **Cổng 443 (HTTPS)**: Cho phép truy cập bảo mật công khai (`0.0.0.0/0`).

### Bước 1.2: Cài đặt Docker & Docker Compose
Đăng nhập SSH vào server và thực thi các lệnh sau:
```bash
# Cập nhật danh sách gói hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt các gói hỗ trợ
sudo apt install -y curl git apt-transport-https ca-certificates gnupg lsb-release

# Thêm khóa GPG của Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Đăng ký Repository Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Cài đặt Docker và Docker Compose CLI
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Phân quyền chạy Docker không cần sudo (Tùy chọn)
sudo usermod -aG docker $USER
newgrp docker # Áp dụng quyền lập tức
```

---

## 2. Đồng bộ mã nguồn và cấu hình `.env`

### Bước 2.1: Clone dự án trên Server
```bash
# Clone source code
git clone https://github.com/m4n1309/FoodAI.git /home/ubuntu/foodai
cd /home/ubuntu/foodai
```

### Bước 2.2: Đồng bộ File cấu hình `.env`
Từ máy cá nhân (Local), bạn copy cấu hình từ `.env.docker.example` thành `.env`, điền đầy đủ các thông số kết nối (đặc biệt là tài khoản Email OAuth2, khóa Gemini API, SePay Token) và dùng script sau để đồng bộ lên VPS:
```bash
# Thực hiện trên máy Local (ví dụ Git Bash hoặc Terminal macOS)
export EC2_HOST="13.250.xx.xx" # IP VPS của bạn
export EC2_USER="ubuntu"
export EC2_SSH_KEY="~/.ssh/your-key.pem" # Đường dẫn khóa ssh
export EC2_APP_PATH="/home/ubuntu/foodai"

bash scripts/sync-env-to-ec2.sh
```

---

## 3. Khởi tạo Cơ sở dữ liệu và Cập nhật cấu hình dịch vụ

### Bước 3.1: Chạy docker-compose của môi trường DB
Để chuẩn bị cơ sở dữ liệu ban đầu, trước hết hãy khởi động container `db`:
```bash
cd /home/ubuntu/foodai
docker compose -f docker-compose.ec2.yml up -d db
```

### Bước 3.2: Import Dữ liệu mẫu vào cơ sở dữ liệu MySQL
Sử dụng file SQL có sẵn trong hệ thống để import schema và dữ liệu ban đầu:
```bash
# Đợi 5-10 giây để MySQL sẵn sàng, sau đó chạy lệnh:
docker compose -f docker-compose.ec2.yml exec -T db mysql -u foodai -pfoodaipassword foodai < BE/src/data/restaurant_qr_ordering_database.sql
```
*(Lưu ý: Thay đổi `foodai`, `foodaipassword` thành thông số thực tế bạn cấu hình trong file `.env`)*

---

## 4. Chạy toàn bộ ứng dụng bằng Docker Compose

Kích hoạt build và chạy toàn bộ 4 service (`db`, `python-rag`, `backend`, `frontend`):
```bash
# Chạy script tự động hóa triển khai
bash scripts/ec2-deploy.sh
```

Hệ thống sẽ chạy ngầm. Frontend sẽ lắng nghe ở cổng máy chủ `8080`.

---

## 5. Thiết lập Nginx Host làm Reverse Proxy và SSL HTTPS

Để người dùng có thể truy cập qua domain chính thức và bảo mật HTTPS (Let's Encrypt), ta cần cấu hình Nginx trên host EC2:

### Bước 5.1: Cài đặt Nginx và Certbot trên Host
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Bước 5.2: Copy cấu hình Nginx dự án
```bash
# Sao chép file cấu hình mẫu vào sites-available
sudo cp deploy/nginx-host-certbot.conf /etc/nginx/sites-available/foodai

# Tạo liên kết tượng trưng sang sites-enabled
sudo ln -sf /etc/nginx/sites-available/foodai /etc/nginx/sites-enabled/

# Hủy bỏ trang default cũ
sudo rm -f /etc/nginx/sites-enabled/default

# Kiểm tra cú pháp Nginx
sudo nginx -t
```
Nếu Nginx kiểm tra báo `syntax is ok`, tiến hành khởi động lại Nginx:
```bash
sudo systemctl restart nginx
```

### Bước 5.3: Cài đặt Chứng chỉ SSL HTTPS miễn phí
Chạy lệnh sau để Certbot tự động cấu hình chứng chỉ SSL cho tên miền của bạn:
```bash
# Thay thế yourdomain.com thành tên miền thật
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Certbot sẽ tự động chỉnh sửa file cấu hình `/etc/nginx/sites-available/foodai` để thêm các dòng khóa SSL và tự cấu hình reload Nginx khi gia hạn chứng chỉ tự động (cronjob).

---

## 6. Kiểm tra Trạng thái và Vận hành

### Xem logs của hệ thống:
```bash
# Xem logs toàn bộ dịch vụ
docker compose -f docker-compose.ec2.yml logs -f

# Xem logs của riêng Backend
docker compose -f docker-compose.ec2.yml logs -f backend
```

### Khởi động lại hệ thống:
```bash
docker compose -f docker-compose.ec2.yml restart
```

### Dừng hệ thống:
```bash
docker compose -f docker-compose.ec2.yml down
```
 Dữ liệu cơ sở dữ liệu sẽ luôn được bảo toàn nhờ Docker volume `db_data_prod` lưu trữ độc lập trên ổ đĩa của VPS.
