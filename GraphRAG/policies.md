# Chính sách Lucky Repairment

## [policy:cancel] Hủy đơn và hoàn tiền

Khách hàng có thể hủy đơn dịch vụ trước khi đơn hoàn thành.

- Trước khi thợ đến nhận việc (các trạng thái `pending`, `payment_verified`, `confirmed`): hoàn 100% số tiền đã thanh toán.
- Sau khi thợ đã đến và đơn đang ở trạng thái `delivering`: giữ lại phí kiểm tra 60.000 VNĐ, hoàn phần còn lại.
- Đơn đã `completed` hoặc `cancelled` không thể hủy.

## [policy:payment] Phương thức thanh toán

Các phương thức đang hỗ trợ:

- Thanh toán khi nhận hàng hoặc sau khi nghiệm thu (COD).
- Ví điện tử MoMo: tạo phiên thanh toán và quét mã QR.
- Thẻ quốc tế qua Stripe Checkout.
- ZaloPay hiện chưa được tích hợp; giao diện chỉ hiển thị lựa chọn này nhưng phiên thanh toán thực tế dùng MoMo.

## [policy:booking] Đặt lịch và thời gian phục vụ

- Khách chọn dịch vụ, thêm vào giỏ dịch vụ hoặc bấm đặt lịch, sau đó điền tên, số điện thoại và địa chỉ.
- Kỹ thuật viên liên hệ xác nhận trong khoảng 15 phút.
- Thời gian có mặt tham khảo từ 15 đến 30 phút tùy dịch vụ và khu vực.
- Thợ khảo sát, giải thích nguyên nhân và báo giá trước khi sửa; khách đồng ý mới tiến hành.

## [policy:warranty] Bảo hành

- Thời gian bảo hành tùy dịch vụ, thường từ 3 đến 12 tháng.
- Bảo hành áp dụng cho phần sửa chữa hoặc thiết bị do Lucky Repairment thay thế.
- Không áp dụng cho hư hỏng do va đập, tự ý tháo lắp hoặc sử dụng sai cách.

## [policy:promotion] Khuyến mãi và điểm thưởng

- Mã giảm giá: `PROMO10` và `SAVE10` giảm 10%; `WELCOME5` giảm 50.000 VNĐ.
- Mỗi mã chỉ áp dụng theo điều kiện hiển thị khi đặt đơn; máy chủ tự tính lại mức giảm.
- Tích điểm: 1 điểm cho mỗi 10.000 VNĐ của đơn đã hoàn thành.
- Quy đổi: 1 điểm = 1.000 VNĐ, tối đa 30% giá trị đơn.
- Điểm đã dùng được hoàn lại nếu đơn bị hủy.

## [policy:contact] Liên hệ và phạm vi phục vụ

- Tổng đài: 1900 6868.
- Phục vụ sửa chữa điện và nước tại nhà, gồm xử lý chập điện, máy bơm nước, rò rỉ đường ống, thông tắc bồn cầu, thay aptomat/ổ cắm và bình nóng lạnh.
- Thời gian tiếp nhận: 24/7.
