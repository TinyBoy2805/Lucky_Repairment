import { useCallback, useEffect, useMemo, useState } from 'react'
import { CartContext } from './cart-context.js'

const STORAGE_KEY = 'lucky_cart_v1'

const loadInitial = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

/**
 * Giỏ dịch vụ sửa chữa.
 * Mỗi dòng lưu id/tên/ảnh dịch vụ + giá tham khảo (startingPrice).
 * Trường productId/productName/productImage được giữ để tương thích API đơn hàng.
 */
const toItem = (service) => ({
  key: service.id,
  productId: service.id,
  productName: service.title || service.name || 'Dịch vụ sửa chữa',
  productImage: service.image || '',
  category: service.category || 'other',
  price: Number(service.startingPrice ?? service.price) || 0,
  quantity: 1,
})

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadInitial)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // localStorage không khả dụng — bỏ qua
    }
  }, [items])

  const addItem = useCallback((service) => {
    if (!service?.id) return
    setItems((prev) =>
      prev.some((item) => item.productId === service.id)
        ? prev
        : [...prev, toItem(service)],
    )
  }, [])

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((item) => item.key !== key))
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const value = useMemo(() => {
    const totalItems = items.length
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    return { items, totalItems, totalAmount, count: items.length, addItem, removeItem, clearCart }
  }, [items, addItem, removeItem, clearCart])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
