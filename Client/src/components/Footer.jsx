import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'

const CURRENT_YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer id="contact" className="home-footer">
      <div className="home-container home-footer__inner">
        <div className="home-footer__col">
          <div className="home-footer__logo">
            <Logo light />
          </div>
          <p className="home-footer__about">
            Lucky Repairment — Nền tảng kết nối thợ sửa chữa điện nước chuyên nghiệp, uy tín hàng đầu tại nhà bạn. Phục vụ 24/7 tất cả các ngày trong tuần kể cả ngày Lễ, Tết.
          </p>
        </div>

        <div className="home-footer__col">
          <h4 className="home-footer__title">Dịch Vụ Sửa Chữa</h4>
          <ul className="home-footer__links">
            <li><Link to="/services/sua-chap-dien">Sửa chữa chập điện & mất điện</Link></li>
            <li><Link to="/services/sua-may-bom-nuoc">Sửa chữa máy bơm nước</Link></li>
            <li><Link to="/services/ro-ri-ong-nuoc">Dò tìm rò rỉ bục vỡ ống nước</Link></li>
            <li><Link to="/services/thong-tac-cong-bon-cau">Thông tắc cống, bồn cầu, chậu rửa</Link></li>
            <li><Link to="/services/thay-aptomat-o-cam">Thay aptomat, ổ cắm, công tắc</Link></li>
            <li><Link to="/services/lap-binh-nong-lanh">Lắp & bảo dưỡng bình nóng lạnh</Link></li>
          </ul>
        </div>

        <div className="home-footer__col">
          <h4 className="home-footer__title">Liên Hệ & Hỗ Trợ</h4>
          <ul className="home-footer__contact">
            <li>
              <strong>Hotline:</strong> <a href="tel:19006868">1900 6868</a> (24/7)
            </li>
            <li>
              <strong>Email:</strong> <a href="mailto:hotro@luckyrepair.vn">hotro@luckyrepair.vn</a>
            </li>
            <li>
              <strong>Địa chỉ:</strong> Phủ sóng các quận huyện trên toàn quốc
            </li>
            <li>
              <strong>Thời gian làm việc:</strong> 24/7 kể cả ngày Lễ, Tết
            </li>
          </ul>
        </div>
      </div>

      <div className="home-footer__bottom">
        <div className="home-container">
          <p>© {CURRENT_YEAR} Lucky Repairment. Bản quyền thuộc về Lucky Repairment.</p>
        </div>
      </div>
    </footer>
  )
}
