# Lucky Repairment — Đối chiếu rubric & các phần còn thiếu

Tài liệu này đối chiếu repo với **rubric chấm điểm** (bản mô hình thương mại điện tử) để
chỉ ra phần **đã có**, phần **vừa bổ sung** và phần **còn thiếu / không áp dụng (N/A)**.

> Bối cảnh: dự án đã chuyển từ mô hình "gian hàng thiết bị" sang **nền tảng đặt thợ sửa
> chữa điện–nước**. Mỗi **dịch vụ sửa chữa đóng vai trò "sản phẩm"**. Vì vậy một số mục
> liên quan tới gian hàng/thương hiệu không còn áp dụng.

## 1. Khối bắt buộc

| # | Tính năng | Trạng thái | Ghi chú |
| --- | --- | --- | --- |
| 1 | Đăng ký + gửi email xác nhận | ✅ | `AuthContext.register` gọi `sendEmailVerification`; `Register.jsx` có màn xác nhận. |
| 2 | Đăng nhập | ✅ | Email/mật khẩu + Google + Facebook. |
| 3 | Đăng xuất | ✅ | `logout()` trong `AuthContext.jsx`. |
| 4 | Lấy lại mật khẩu | ✅ | `ForgotPassword.jsx` + `sendPasswordResetEmail`. |
| 5 | Xem chi tiết sản phẩm (dịch vụ) | ✅ | `ServiceDetail.jsx`. |
| 6 | Quản lý giỏ hàng | ✅ | `Cart.jsx`, `CartContext`, `localStorage`. |
| 7 | Đặt hàng | ✅ | `CartCheckoutModal` → `POST /api/orders`. |
| 8 | Thanh toán trực tuyến | ✅ | MoMo / ZaloPay / Stripe (có chế độ mô phỏng). |
| 9 | Xem lịch sử mua hàng | ✅ | `Customer.jsx` + `OrderDetail.jsx`. |
| 10 | Biểu đồ cột theo khoảng thời gian (từ ngày → đến ngày) | ✅ (đã bổ sung) | Trước chỉ có preset; nay `StatsColumnChart.jsx` có picker ngày tuỳ chọn gọi `from`/`to` (`GET /api/admin/stats?from=&to=`). |
| 11 | Biểu đồ tròn | ✅ | `StatsPieChart.jsx` (theo danh mục / thương hiệu). |
| 12 | Admin quản lý cơ bản (người dùng, sản phẩm, đơn hàng) | ✅ | `/admin/accounts`, `/admin/services`, `/admin/orders` (+ nhiều trang khác). |
| 13 | Người bán quản lý cơ bản (sản phẩm, doanh thu, đơn hàng) | ✅ | `/repairman` tab Dịch vụ / Đơn hàng / Doanh thu. |

## 2. Khối tự chọn (rubric gốc)

### Đã có
- Đăng nhập Google, Đăng nhập Facebook.
- Cập nhật thông tin cá nhân (`/profile`).
- Cập nhật trạng thái đơn hàng (admin/thợ).
- Hủy đơn hàng (quy trình + thông báo + hoàn tiền) — `order.service.cancelOrder`.
- Đánh giá **yêu cầu sửa chữa đã hoàn thành** (`requests`).
- **Đánh giá đơn dịch vụ đã hoàn thành** (`orders`) — **đã bổ sung** (`rating.service.createRating` hỗ trợ `orderId`).
- Báo cáo gian hàng / khách hàng + xử lý báo cáo.
- Lọc theo danh mục (điện / nước).
- Sắp xếp theo giá tăng/giảm.
- Sắp xếp theo **số lượng đã bán** — **đã bổ sung** (`sort=sales`).
- Áp dụng mã khuyến mãi (`PROMO10`, `SAVE10`, `WELCOME5`).
- Trang chủ: **bán chạy nhất / mới nhất / xem nhiều nhất / gợi ý** — **đã bổ sung**
  (`GET /api/services/home`; lượt xem tăng qua `POST /api/services/:id/view`).

### Còn thiếu (khả thi, chưa làm)
| Tính năng | Ghi chú |
| --- | --- |
| **Bình luận sản phẩm (hỏi đáp)** | Chưa có. Hiện chỉ có chat khách ↔ thợ trên 1 yêu cầu (`chat.service.js`), không phải Q&A công khai trên trang dịch vụ. |
| **Trả lời bình luận** | Phụ thuộc tính năng bình luận ở trên. |
| **Tự động tích điểm khi mua hàng** | Chưa có hệ thống điểm loyalty. `wallet.service.js` chỉ là số dư tiền. |
| **Quy đổi điểm thưởng → khuyến mãi khi đặt hàng** | Chưa có. |

### Không áp dụng (N/A) do đổi mô hình
| Tính năng | Lý do |
| --- | --- |
| Lọc theo **thương hiệu** | Mô hình đã bỏ "thương hiệu" khỏi dịch vụ sửa chữa. |
| **Tìm kiếm gian hàng** | Không còn khái niệm gian hàng. |
| **Xem sản phẩm thuộc gian hàng** | Chỉ còn "dịch vụ của tôi" cho thợ (`?ownerUid=mine`), không có trang gian hàng công khai. |

## 3. Tóm tắt việc cần làm tiếp (nếu muốn phủ hết rubric)
1. Bình luận/Q&A trên trang chi tiết dịch vụ + chức năng trả lời.
2. Hệ thống điểm thưởng: tích điểm khi đơn `completed`, quy đổi điểm thành khuyến mãi khi đặt hàng.
