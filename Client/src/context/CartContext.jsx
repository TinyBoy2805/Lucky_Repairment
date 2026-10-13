import { useCallback, useEffect, useMemo, useState } from 'react'
import { CartContext } from './cart-context.js'

const STORAGE_KEY = 'lucky_cart_v1'

const itemKey = (product, includeInstallation) =>
  `${product.id}::${includeInstallation ? 1 : 0}`

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function toItem(product, quantity, includeInstallation) {
  return {
    key: itemKey(product, includeInstallation),
    productId: product.id,
    productName: product.name,
    productImage: product.image,
    category: product.category,
    brand: product.brand,
    price: Number(product.price) || 0,
    installationFee: Number(product.installationFee) || 0,
    quantity: Math.max(1, Number(quantity) || 1),
    includeInstallation: Boolean(includeInstallation),
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadInitial)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Bỏ qua khi localStorage không khả dụng
    }
  }, [items])

  const addItem = useCallback((product, { quantity = 1, includeInstallation = true } = {}) => {
    setItems((prev) => {
      const key = itemKey(product, includeInstallation)
      const existing = prev.find((item) => item.key === key)
      if (existing) {
        return prev.map((item) =>
          item.key === key
            ? { ...item, quantity: item.quantity + Math.max(1, Number(quantity) || 1) }
            : item,
        )
      }
      return [...prev, toItem(product, quantity, includeInstallation)]
    })
  }, [])

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((item) => item.key !== key))
  }, [])

  const updateQuantity = useCallback((key, quantity) => {
    setItems((prev) =>
      prev.map((item) =>
        item.key === key
          ? { ...item, quantity: Math.max(1, Number(quantity) || 1) }
          : item,
      ),
    )
  }, [])

  const setInstallation = useCallback((key, enabled) => {
    setItems((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, includeInstallation: Boolean(enabled) } : item,
      ),
    )
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const value = useMemo(() => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
    const totalAmount = items.reduce((sum, item) => {
      const install = item.includeInstallation ? item.installationFee : 0
      return sum + (item.price + install) * item.quantity
    }, 0)

    return {
      items,
      totalItems,
      totalAmount,
      count: items.length,
      addItem,
      removeItem,
      updateQuantity,
      setInstallation,
      clearCart,
    }
  }, [items, addItem, removeItem, updateQuantity, setInstallation, clearCart])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}