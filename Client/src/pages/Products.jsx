import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import OrderModal from '../components/OrderModal.jsx'
import { productsApi } from '../lib/products.js'

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [category, setCategory] = useState('all') // 'all' | 'electric' | 'water'
  const [search, setSearch] = useState('')

  // Quick Order modal
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const loadProducts = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await productsApi.list({ category, search })
      setProducts(data.products || [])
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách sản phẩm.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    loadProducts()
  }

  const handleQuickOrder = (prod) => {
    setSelectedProduct(prod)
    setIsModalOpen(true)
  }

  return (
    <div className="products-catalog-page">

      {/* Hero Banner cho trang sản phẩm */}
      <div className="products-hero-banner">
        <div className="home-container">
          <div className="products-hero-banner__content">
            <span className="home-badge">Chính hãng 100% • Bảo hành dài hạn</span>
            <h1>Thiết Bị & Vật Tư Sửa Chữa Điện Nước</h1>
            <p>
              Cung cấp linh kiện, thiết bị điện và phụ kiện ngành nước chính hãng từ các thương hiệu uy tín: Panasonic, Schneider, Rạng Đông, Inox SUS... Hỗ trợ thợ tới lắp đặt tận nơi.
            </p>
          </div>
        </div>
      </div>

      <div className="home-container products-page-body">
        {/* Thanh lọc & tìm kiếm */}
        <div className="products-toolbar">
          <div className="products-categories-tabs">
            <button
              type="button"
              className={`products-cat-btn ${category === 'all' ? 'products-cat-btn--active' : ''}`}
              onClick={() => setCategory('all')}
            >
              Tất cả sản phẩm
            </button>
            <button
              type="button"
              className={`products-cat-btn ${category === 'electric' ? 'products-cat-btn--active' : ''}`}
              onClick={() => setCategory('electric')}
            >
              ⚡ Thiết bị điện ({products.filter((p) => p.category === 'electric').length || '…'})
            </button>
            <button
              type="button"
              className={`products-cat-btn ${category === 'water' ? 'products-cat-btn--active' : ''}`}
              onClick={() => setCategory('water')}
            >
              💧 Thiết bị nước ({products.filter((p) => p.category === 'water').length || '…'})
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="products-search-form">
            <input
              type="text"
              placeholder="Tìm theo tên thiết bị, thương hiệu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn--primary btn--sm">
              Tìm kiếm
            </button>
          </form>
        </div>

        {error && (
          <div className="alert alert--error" style={{ marginBottom: 24 }}>
            <span>{error}</span>
          </div>
        )}

        {/* Danh sách lưới sản phẩm */}
        {loading ? (
          <div className="page-loading" style={{ minHeight: '300px' }}>
            <div className="page-loading__spinner" />
            <p>Đang tải danh sách thiết bị…</p>
          </div>
        ) : products.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: 18, color: '#64748b', marginBottom: 16 }}>
              Không tìm thấy sản phẩm nào phù hợp với tìm kiếm của bạn.
            </p>
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => {
                setCategory('all')
                setSearch('')
                loadProducts()
              }}
            >
              Xem tất cả sản phẩm
            </button>
          </div>
        ) : (
          <div className="products-grid">
            {products.map((item) => {
              const discount = item.originalPrice && item.originalPrice > item.price
                ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
                : 0

              return (
                <div key={item.id} className="product-card">
                  <div className="product-card__thumb">
                    {discount > 0 && (
                      <span className="product-badge-discount">-{discount}%</span>
                    )}
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
                    <p className="product-card__desc">{item.shortDesc}</p>
                    <div className="product-card__price">
                      <strong>{item.price.toLocaleString('vi-VN')} đ</strong>
                      {item.originalPrice && (
                        <span>{item.originalPrice.toLocaleString('vi-VN')} đ</span>
                      )}
                    </div>
                  </div>

                  <div className="product-card__foot">
                    <Link
                      to={`/products/${item.id}`}
                      className="btn btn--outline btn--sm"
                    >
                      Chi tiết
                    </Link>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => handleQuickOrder(item)}
                    >
                      Đặt hàng
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Order Modal */}
      {selectedProduct && (
        <OrderModal
          product={selectedProduct}
          quantity={1}
          includeInstallation={true}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  )
}
