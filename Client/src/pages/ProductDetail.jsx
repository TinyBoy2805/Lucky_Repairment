import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import OrderModal from '../components/OrderModal.jsx'
import { productsApi } from '../lib/products.js'

export default function ProductDetail() {
  const { id } = useParams()

  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form options
  const [quantity, setQuantity] = useState(1)
  const [includeInstallation, setIncludeInstallation] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('specs') // 'specs' | 'desc' | 'warranty'

  useEffect(() => {
    let isMounted = true
    window.scrollTo({ top: 0, behavior: 'smooth' })

    const loadData = async () => {
      try {
        const { product: prod } = await productsApi.get(id)
        if (!isMounted) return
        setProduct(prod)
        setError('')

        // Tải sản phẩm liên quan
        const { products: all } = await productsApi.list({ category: prod.category })
        if (!isMounted) return
        setRelatedProducts(all.filter((item) => item.id !== prod.id).slice(0, 4))
      } catch (err) {
        if (!isMounted) return
        setError(err.message || 'Không thể tải thông tin sản phẩm.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()
    return () => {
      isMounted = false
    }
  }, [id])

  const handleDecreaseQty = () => {
    setQuantity((prev) => Math.max(1, prev - 1))
  }

  const handleIncreaseQty = () => {
    setQuantity((prev) => prev + 1)
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-loading__spinner" />
        <p>Đang tải thông tin sản phẩm…</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="product-detail-page">
        <div className="home-container" style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div className="alert alert--error" style={{ maxWidth: 500, margin: '0 auto 24px' }}>
            {error || 'Sản phẩm không tồn tại.'}
          </div>
          <Link to="/products" className="btn btn--primary">
            ← Quay lại danh mục sản phẩm
          </Link>
        </div>
      </div>
    )
  }

  const discountPercent = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0

  return (
    <div className="product-detail-page">
      {/* ===== Main Product View ===== */}

      {/* ===== Main Product View ===== */}
      <main className="product-detail-content">
        <div className="home-container">
          {/* Breadcrumb */}
          <nav className="breadcrumb" aria-label="Đường dẫn trang">
            <Link to="/">Trang chủ</Link>
            <span>/</span>
            <Link to="/products">Sản phẩm & Vật tư</Link>
            <span>/</span>
            <span className="breadcrumb__current">{product.name}</span>
          </nav>

          <div className="product-main-grid">
            {/* Cột 1: Ảnh sản phẩm & cam kết */}
            <div className="product-gallery-col">
              <div className="product-image-box">
                {discountPercent > 0 && (
                  <span className="product-badge-discount">-{discountPercent}%</span>
                )}
                <img
                  src={product.image}
                  alt={product.name}
                  className="product-image-large"
                />
              </div>

              <div className="product-perks-box">
                <div className="product-perk">
                  <span className="product-perk__icon">🛡️</span>
                  <div>
                    <strong>100% Chính Hãng</strong>
                    <span>Cam kết nguồn gốc xuất xứ rõ ràng</span>
                  </div>
                </div>
                <div className="product-perk">
                  <span className="product-perk__icon">⚡</span>
                  <div>
                    <strong>Lắp Đặt Trong Ngày</strong>
                    <span>Thợ kỹ thuật tới hỗ trợ tận nơi nhanh chóng</span>
                  </div>
                </div>
                <div className="product-perk">
                  <span className="product-perk__icon">🔄</span>
                  <div>
                    <strong>1 Đổi 1 Trong 7 Ngày</strong>
                    <span>Nếu phát hiện lỗi kỹ thuật từ nhà sản xuất</span>
                  </div>
                </div>
                <div className="product-perk">
                  <span className="product-perk__icon">📜</span>
                  <div>
                    <strong>Bảo Hành {product.warranty}</strong>
                    <span>Có phiếu bảo hành và lưu trên hệ thống</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột 2: Thông tin & Đặt hàng */}
            <div className="product-info-col">
              <div className="product-category-tag">
                {product.category === 'electric' ? '⚡ Thiết bị điện' : '💧 Thiết bị nước'} • {product.brand}
              </div>

              <h1 className="product-title">{product.name}</h1>

              <div className="product-rating-bar">
                <div className="product-stars">★★★★★</div>
                <span className="product-rating-text">5.0 (đánh giá tốt từ khách hàng)</span>
                <span className="product-stock-tag">
                  {product.inStock ? '✓ Còn hàng' : 'Hết hàng'}
                </span>
              </div>

              {/* Khối giá */}
              <div className="product-price-box">
                <div className="product-price-current">
                  {product.price.toLocaleString('vi-VN')} đ
                </div>
                {product.originalPrice && (
                  <div className="product-price-original">
                    {product.originalPrice.toLocaleString('vi-VN')} đ
                  </div>
                )}
                {discountPercent > 0 && (
                  <div className="product-price-save">
                    Tiết kiệm {(product.originalPrice - product.price).toLocaleString('vi-VN')} đ
                  </div>
                )}
              </div>

              {/* Mô tả ngắn */}
              <p className="product-short-desc">{product.shortDesc}</p>

              {/* Chọn số lượng */}
              <div className="product-option-section">
                <label className="product-option-label">Số lượng:</label>
                <div className="product-qty-control">
                  <button
                    type="button"
                    className="product-qty-btn"
                    onClick={handleDecreaseQty}
                    disabled={quantity <= 1}
                  >
                    −
                  </button>
                  <span className="product-qty-val">{quantity}</span>
                  <button
                    type="button"
                    className="product-qty-btn"
                    onClick={handleIncreaseQty}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Tùy chọn kèm công thợ lắp đặt */}
              {product.installationFee !== undefined && (
                <div className="product-install-option">
                  <label className="product-install-checkbox">
                    <input
                      type="checkbox"
                      checked={includeInstallation}
                      onChange={(e) => setIncludeInstallation(e.target.checked)}
                    />
                    <div className="product-install-text">
                      <strong>
                        Yêu cầu thợ tới lắp đặt tại nhà (+{product.installationFee.toLocaleString('vi-VN')} đ/chiếc)
                      </strong>
                      <p>
                        Kỹ thuật viên chuyên nghiệp mang thiết bị đến tận nơi, thi công lắp đặt và kiểm tra an toàn trước khi bàn giao.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Nút Đặt Hàng */}
              <div className="product-actions">
                <button
                  type="button"
                  className="btn btn--primary btn--block product-btn-order"
                  onClick={() => setIsModalOpen(true)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                  Đặt mua & Giao lắp tận nơi
                </button>

                <a href="tel:19006868" className="btn btn--outline btn--block product-btn-consult">
                  📞 Gọi tư vấn miễn phí: 1900 6868
                </a>
              </div>
            </div>
          </div>

          {/* ===== Tabs thông tin chi tiết ===== */}
          <div className="product-details-tabs-card">
            <div className="product-tabs-header">
              <button
                type="button"
                className={`product-tab-btn ${activeTab === 'specs' ? 'product-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('specs')}
              >
                Thông số kỹ thuật
              </button>
              <button
                type="button"
                className={`product-tab-btn ${activeTab === 'desc' ? 'product-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('desc')}
              >
                Mô tả chi tiết & Tính năng
              </button>
              <button
                type="button"
                className={`product-tab-btn ${activeTab === 'warranty' ? 'product-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('warranty')}
              >
                Chính sách bảo hành & Lắp đặt
              </button>
            </div>

            <div className="product-tab-pane">
              {activeTab === 'specs' && (
                <div className="specs-table-wrapper">
                  <table className="specs-table">
                    <tbody>
                      {product.specifications?.map((spec, idx) => (
                        <tr key={idx}>
                          <th className="specs-key">{spec.key}</th>
                          <td className="specs-val">{spec.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'desc' && (
                <div className="product-desc-content">
                  <p className="product-desc-paragraph">{product.description}</p>
                  {product.features && product.features.length > 0 && (
                    <div className="product-features-block">
                      <h4>Đặc điểm nổi bật:</h4>
                      <ul>
                        {product.features.map((feat, idx) => (
                          <li key={idx}>✓ {feat}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'warranty' && (
                <div className="product-warranty-content">
                  <h4>Thời gian bảo hành: {product.warranty}</h4>
                  <p>
                    Tất cả các sản phẩm thiết bị điện nước tại Lucky Repairment đều được bảo hành chính hãng theo tiêu chuẩn của nhà sản xuất.
                  </p>
                  <ul>
                    <li>Bảo hành 1 đổi 1 trong vòng 7 ngày đầu tiên nếu phát sinh lỗi kỹ thuật.</li>
                    <li>Thợ đến tận nhà kiểm tra và khắc phục sự cố miễn phí trong suốt thời gian bảo hành.</li>
                    <li>Lưu trữ lịch sử mua hàng và thông tin bảo hành điện tử trên hệ thống website qua số điện thoại.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* ===== Sản phẩm liên quan ===== */}
          {relatedProducts.length > 0 && (
            <div className="related-products-section">
              <h2 className="related-products-title">Sản Phẩm & Thiết Bị Cùng Danh Mục</h2>
              <div className="products-grid">
                {relatedProducts.map((item) => (
                  <div key={item.id} className="product-card">
                    <div className="product-card__thumb">
                      <img src={item.image} alt={item.name} />
                      <span className="product-card__badge">
                        {item.category === 'electric' ? 'Điện' : 'Nước'}
                      </span>
                    </div>
                    <div className="product-card__body">
                      <span className="product-card__brand">{item.brand}</span>
                      <h3 className="product-card__title">
                        <Link to={`/products/${item.id}`}>{item.name}</Link>
                      </h3>
                      <div className="product-card__price">
                        <strong>{item.price.toLocaleString('vi-VN')} đ</strong>
                        {item.originalPrice && (
                          <span>{item.originalPrice.toLocaleString('vi-VN')} đ</span>
                        )}
                      </div>
                    </div>
                    <div className="product-card__foot">
                      <Link to={`/products/${item.id}`} className="btn btn--outline btn--sm btn--block">
                        Xem chi tiết & Đặt mua
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Đặt Hàng */}
      <OrderModal
        product={product}
        quantity={quantity}
        includeInstallation={includeInstallation}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
