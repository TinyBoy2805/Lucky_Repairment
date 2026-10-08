# Lucky Repairment 🛠️

Nền tảng quản lý yêu cầu sửa chữa thiết bị điện tử – gia dụng. **Khách hàng** gửi yêu cầu sửa chữa, **thợ sửa chữa** nhận việc và cập nhật tiến độ, **admin** quản lý hệ thống.

## Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Client | React 19 · Vite 8 · Sass · firebase-js-sdk (Auth) · React Router 7 |
| Server | Node.js ≥ 20 · Express 5 · firebase-admin (Auth + Realtime Database) |
| Xác thực | Firebase Authentication (email/mật khẩu + Google). Server xác minh ID token do Firebase cấp |
| Phân quyền | Vai trò lưu trong Realtime Database — `users/{uid}/role`: `customer`, `repairman`, `admin` |

## Cấu trúc thư mục

```
Lucky_Repairment/
├── Client/            # React + Vite (chạy ở http://localhost:5173)
├── Server/            # Express API (chạy ở http://localhost:3001)
└── start.bat          # Chạy nhanh cả 2 server trên Windows
```

## Yêu cầu

- **Node.js ≥ 20** và npm (Node 24 khuyến nghị)
- Một **Firebase project** (bản miễn phí Spark là đủ)

## 1. Cài đặt

```bash
# Client
cd Client
npm install

# Server
cd ../Server
npm install
```

## 2. Cấu hình Firebase

> Cả 2 phía dùng **cùng một** Firebase project.

### 2.1 Bật xác thực + tạo Realtime Database

1. Vào [Firebase Console](https://console.firebase.google.com) → tạo project.
2. **Build → Authentication → Sign-in method**: bật **Email/Password** và **Google**.
3. **Build → Realtime Database → Create database** (bắt đầu ở chế độ test hoặc locked đều được — server dùng Admin SDK nên client rules không ảnh hưởng tới quyền).

### 2.2 Cấu hình Server (quyền admin phụ thuộc file này)

1. Copy `Server/.env.example` → `Server/.env`:

   ```bash
   cd Server
   copy .env.example .env
   ```

2. Tạo **service account** trong Firebase Console:
   **Project settings → Service accounts → Generate new private key** → lưu file thành `Server/serviceAccountKey.json`.
3. Mở `Server/.env` và điền:

   ```env
   PORT=3001
   CLIENT_URL=http://localhost:5173

   # Email đăng ký Firebase sẽ tự được gán vai trò admin (phân tách bằng dấu phẩy)
   ADMIN_EMAILS=email-admin-cua-ban@gmail.com

   FIREBASE_PROJECT_ID=ten-project-cua-ban
   FIREBASE_DATABASE_URL=https://ten-project-cua-ban-default-rtdb.firebaseio.com
   SERVICE_ACCOUNT_FILE=./serviceAccountKey.json
   ```

   > ⚠️ Người có email trong `ADMIN_EMAILS` sẽ **luôn** có vai trò admin khi đăng nhập (không cần tạo tài khoản trước).

### 2.3 Cấu hình Client (web SDK của Firebase)

Mở `Client/src/lib/firebase.js` và thay bằng config của project bạn (lấy ở **Project settings → General → Your apps → Web app**):

```js
const firebaseConfig = {
  apiKey: '...',
  authDomain: '...',
  databaseURL: 'https://...-default-rtdb.firebaseio.com',
  projectId: '...',
  storageBucket: '...',
  messagingSenderId: '...',
  appId: '...',
}
```

## 3. Chạy

Cách 1 — **Windows**: bấm đúp `start.bat` (chạy luôn cả 2 server).

Cách 2 — mở **2 terminal**:

```bash
# Terminal 1 — Server (port 3001)
cd Server
npm run dev

# Terminal 2 — Client (port 5173)
cd Client
npm run dev
```

- Mở web: **http://localhost:5173**
- Kiểm tra API: http://localhost:3001/api/health

## Vai trò & luồng nghiệp vụ

| Vai trò | Trang | Quyền |
| --- | --- | --- |
| `customer` | `/customer` | Gửi yêu cầu sửa chữa, theo dõi trạng thái đơn |
| `repairman` | `/repairman` | Xem việc mới, nhận việc, cập nhật tiến độ (Đã nhận → Đang sửa → Hoàn thành) |
| `admin` | `/admin` | Đang xây dựng (mặc định chỉ người trong `ADMIN_EMAILS`) |

- Tài khoản **mới tự đăng ký** được chọn vai trò `customer` hoặc `repairman`.
- Đăng nhập bằng **Google**: mặc định là `customer`, trừ khi email nằm trong `ADMIN_EMAILS`.

## API chính (`http://localhost:3001`)

| Method | Đường dẫn | Quyền | Mô tả |
| --- | --- | --- | --- |
| `GET` | `/api/health` | — | Kiểm tra server sống |
| `POST` | `/api/auth/login` | đăng nhập | Gửi ID token → trả về profile (gồm `role`) |
| `POST` | `/api/auth/register` | đăng nhập | Tạo profile, có thể chọn `role` |
| `GET` | `/api/auth/me` | đăng nhập | Lấy profile hiện tại |
| `GET` | `/api/requests` | đăng nhập | Khách: đơn của mình · Thợ/admin: tất cả |
| `POST` | `/api/requests` | đăng nhập | Tạo yêu cầu sửa chữa mới |
| `PATCH` | `/api/requests/:id` | đăng nhập | Thợ nhận việc / đổi trạng thái |
| `GET` | `/api/users` | admin | Danh sách người dùng |
| `PATCH` | `/api/users/:uid/role` | admin | Đổi vai trò người dùng |

## Bảo mật — đọc kỹ trước khi push

- **Không bao giờ commit** `Server/.env` và `Server/serviceAccountKey.json` → đã bỏ qua trong `.gitignore`.
- Cập nhật **Realtime Database rules** về deny-all cho client (server dùng Admin SDK nên vẫn hoạt động bình thường). Ví dụ:

  ```json
  {
    "rules": {
      ".read": false,
      ".write": false
    }
  }
  ```

- `Client/src/lib/firebase.js` chứa config (apiKey) của web app — đây là **khóa công khai** của Firebase web SDK, không phải secret, nhưng hãy dùng project của riêng bạn.

## Troubleshooting

- **"Không thể kết nối máy chủ"** → chưa chạy `Server`. Bật lên trước rồi thử lại.
- **Đổi `ADMIN_EMAILS` / `.env` không có tác dụng** → `npm run dev` dùng `node --watch`, cần restart server sau khi sửa `.env`.
- **Đăng nhập Google không hoạt động** → kiểm tra đã bật provider Google trong Firebase Authentication và domain `localhost` được phép (Authorized domains mặc định đã có localhost).