# Lucky Repairment — Báo cáo chức năng & kiểm thử

Nền tảng B2C đặt thợ sửa chữa điện–nước kèm bán thiết bị (Client: React + Vite, Server: Express + Firebase, nhánh `Phat`).

## 1. Tính năng bắt buộc

| Tính năng | Trạng thái | Ghi chú |
| --- | --- | --- |
| Đăng ký có gửi email xác nhận | ✅ | `register()` gọi `sendEmailVerification`; có màn hình "Xác nhận email", gửi lại email và kiểm tra trạng thái. (kiểm tra qua mã nguồn + build) |
| Quản lý giỏ hàng | ✅ | Giỏ nhiều sản phẩm, lưu `localStorage` khóa `lucky_cart_v1`, badge ở Navbar, tuyến `/cart`, đặt đơn nhiều sản phẩm + mã khuyến mãi. (kiểm tra qua mã nguồn + build) |
| Thanh toán trực tuyến | ✅ | COD + MoMo/ZaloPay (QR) + Stripe (checkout, có chế độ mô phỏng khi chưa cấu hình key) |
| Hủy đơn hàng (quy tắc A) | ✅ | Trước khi thợ đến: hoàn 100%. Sau khi thợ đến (`delivering`): giữ phí kiểm tra 60.000đ, hoàn phần còn lại. Đơn `completed`/`cancelled` bị chặn (409). |
| Biểu đồ cột theo khoảng thời gian | ✅ | `GET /api/admin/stats?type=column&range=today\|7d\|30d\|90d\|all` |
| Biểu đồ tròn | ✅ | `GET /api/admin/stats?type=pie&by=category\|brand` |
| Quản lý cơ bản (admin) | ✅ | Người dùng, đơn hàng, danh mục, báo cáo, thanh toán, ví, lịch thợ, giá, đánh giá |
| Admin quản lý sản phẩm | ✅ | Tạo/sửa/xóa sản phẩm đầy đủ trường; `PATCH` một phần chỉ cập nhật trường gửi lên và giữ nguyên phần còn lại (lỗi mất trường đã sửa và được kiểm chứng). |
| Người bán (thợ) quản lý sản phẩm/doanh thu/đơn hàng | ✅ | Thợ chỉ quản lý sản phẩm của mình (`ownerUid`, `?ownerUid=mine`); nhận việc `pending→delivering→completed`; xem đơn của mình (kèm đơn chưa ai nhận) và doanh thu của mình. |

> Ghi chú: Ngoài ra thợ có thể **bật/tắt sẵn sàng nhận việc** qua `GET/PUT /api/repairman/availability` (mặc định `false`), và xem **thống kê hoạt động** của mình qua `GET /api/repairman/stats` (đơn hoàn thành/đang giao, tổng đơn, doanh thu, số yêu cầu hoàn thành/đang xử lý).

## 2. Tính năng tự chọn (10)

1. Đăng nhập Facebook
2. Cập nhật thông tin cá nhân
3. Hủy đơn hàng + hoàn tiền
4. Đánh giá sản phẩm đã mua
5. Báo cáo gian hàng / khách hàng
6. Lọc sản phẩm theo danh mục / thương hiệu
7. Sắp xếp theo giá (tăng/giảm) cho sản phẩm & dịch vụ
8. Tìm kiếm sản phẩm / dịch vụ
9. Áp dụng mã khuyến mãi (PROMO10, SAVE10, WELCOME5)
10. Hiển thị sản phẩm bán chạy trên trang chủ

## 3. Kiểm thử đã chạy

- `Client`: `npm run lint` (oxlint) → sạch (không có cảnh báo). `npm run build` (vite) → thành công, 678 module; chỉ có cảnh báo chunk > 500 kB của Vite (không ảnh hưởng, được phép).
- `Server`: khởi động OK, `GET /api/health` → `{"status":"ok","project":"lucky-repairment"}`.
- **Smoke test end-to-end** (`npm run smoke-test`, `Server/scripts/smoke-test.js`, user `smoke*` trên RTDB thật, tự dọn): **93/93 PASS**.
  - Bộ smoke-test hiện có 93 kiểm tra.
  - Trước đó 3 kiểm tra không đạt do **kịch bản test** tạo "đơn pending thứ 2" thiếu `phone` (server yêu cầu số điện thoại) → 400, kéo theo 2 kiểm tra phụ thuộc id đơn này. Đã bổ sung `phone` vào kịch bản test; sau đó **93/93 đạt**. Đây là lệch giữa kịch bản test và ràng buộc dữ liệu sẵn có, **không phải lỗi mới của các tính năng vừa thêm**.
- **Lỗi hồi quy đã sửa (Server)** — `Server/src/services/admin.service.js`: hàm `getSummary()` của bản viết lại đã **bỏ mất trường `openReports`** (client `AdminNav.jsx` dùng để hiện badge "Báo cáo") → đã **thêm lại** `openReports`.
- **Lỗi Server đã sửa** — `Server/src/services/order.service.js`: `POST /api/orders` trước đây chỉ áp mã khuyến mãi khi client gửi kèm `discountAmount`, còn gửi mỗi `promoCode` thì bị bỏ qua (giảm giá = 0). Đã bổ sung bảng mã phía server (`PROMO10`/`SAVE10` = 10%, `WELCOME5` = 50.000đ) để **máy chủ tự tính giảm giá từ mã hợp lệ** (không phụ thuộc số tiền client gửi).
- **Kiểm thử luồng mới** (script tạm `Server/scripts/_verify_new.mjs`, user cô lập `verify*`, đã chạy rồi xoá; chạy trên server `http://localhost:3001`): **40/40 PASS**.
  - a) Đơn nhiều sản phẩm + `PROMO10`: 2 item, `discountAmount` = 10% `totalAmount` (làm tròn), `finalAmount = totalAmount - discountAmount` ✅
  - b) Admin CRUD + `PATCH` một phần chỉ `{ inStock:false }`: giữ nguyên `image`, `description`, `specifications`, `features`, `warranty`; xoá xong `GET` lại → 404 ✅
  - c) Quyền sở hữu: thợ tạo sản phẩm → `ownerUid` = uid của thợ; `?ownerUid=mine` chứa sản phẩm; thợ khác `PATCH`/`DELETE` → 403; admin `PATCH` → 200 ✅
  - d) `GET/PUT /api/repairman/availability`: mặc định `false`; bật `true`; đọc lại `true`; tắt `false`; khách → 403; không token → 401 ✅
  - e) `GET /api/repairman/stats`: trả đủ 6 khóa `completedOrders, inProgressOrders, totalOrders, revenue, completedRequests, inProgressRequests`, đều là số ✅
  - f) Khách tạo đơn (chưa có thợ) → thợ `PATCH delivering` (gán `repairmanUid`) → `PATCH completed`; `completedOrders` tăng đúng 1 ✅
  - g) Hủy đơn: đơn trước `delivering` hoàn 100%; đơn đã `delivering` giữ 60.000đ phí kiểm tra (hoàn `finalAmount - 60000`); đơn `completed` → 409 ✅
  - h) `POST /api/payments/momo/create` → có `momoUrl`; `POST /api/payments/stripe/create` → có `sessionUrl` (mô phỏng khi chưa có key); thiếu tham số → 400 ✅
- **Kiểm tra qua mã nguồn + build** (không có trình duyệt/hộp thư thật trong môi trường này nên không test gửi email/UI trực tiếp):
  - `register()` trong `Client/src/context/AuthContext.jsx` có `await sendEmailVerification(...)` (bọc `try/catch`, không chặn luồng) và expose `resendVerificationEmail`/`refreshEmailVerification`. ✅
  - `Client/src/pages/Register.jsx` render màn hình "Xác nhận email" với nút "Gửi lại email xác nhận" và "Tôi đã xác nhận email". ✅
  - `Client/src/pages/Profile.jsx` hiển thị trạng thái email (Đã/Chưa xác nhận) + nút gửi lại/kiểm tra. ✅
  - Giỏ hàng lưu `localStorage` khóa `lucky_cart_v1` (`CartContext.jsx`); tuyến `/cart` có trong `App.jsx`; `Navbar.jsx` hiển thị badge số lượng. ✅
  - Lưu ý: các mục này chỉ **kiểm tra qua mã nguồn + build**, chưa kiểm thử trên trình duyệt/gửi email thật.
- **Dọn dẹp**: đã xoá toàn bộ đơn/sản phẩm/availability/payment/user (`verify*`) tạo ra khi kiểm thử và quét lại RTDB + Firebase Auth → **0 bản ghi còn sót**; script tạm đã xoá.

## 4. Chạy dự án

```
# Server (cần Server/serviceAccountKey.json)
cd Server
$env:NODE_ENV='development'; node src/server.js   # http://localhost:3001

# Client
cd Client
npm install
npm run dev                                        # http://localhost:5173
```
