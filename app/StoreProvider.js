'use client'
import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Provider, useDispatch, useSelector } from 'react-redux'
import { setProduct } from '@/lib/features/product/productSlice'
import { setCart } from '@/lib/features/cart/cartSlice'
import { makeStore } from '../lib/store'
import { usePathname } from 'next/navigation'

const CART_STORAGE_KEY = 'wickedshop-cart'

function readStoredCart() {
  if (typeof window === 'undefined') return {}

  try {
    const value = window.localStorage.getItem(CART_STORAGE_KEY)
    return value ? JSON.parse(value) : {}
  } catch {
    return {}
  }
}

function writeStoredCart(cartItems) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems || {}))
  } catch {
  }
}

function ProductBootstrap({ children }) {
  const dispatch = useDispatch()
  const cartItems = useSelector((state) => state.cart.cartItems)
  const pathname = usePathname()
  const { status } = useSession()
  const [cartReady, setCartReady] = useState(false)

  useEffect(() => {
    const loadProducts = async () => {
      const response = await fetch('/api/products?activeOnly=true')
      if (!response.ok) return
      const data = await response.json()
      dispatch(setProduct(data.products || []))
    }

    loadProducts()
  }, [dispatch, pathname])

  useEffect(() => {
    let cancelled = false

    const loadCart = async () => {
      setCartReady(false)
      if (status === 'loading') return

      if (status !== 'authenticated') {
        dispatch(setCart({ cartItems: readStoredCart() }))
        if (!cancelled) setCartReady(true)
        return
      }

      try {
        const response = await fetch('/api/cart')
        if (!response.ok) throw new Error('Cart request failed')
        const data = await response.json()
        dispatch(setCart({ cartItems: data.cartItems || {} }))
      } catch {
        dispatch(setCart({ cartItems: readStoredCart() }))
      } finally {
        if (!cancelled) setCartReady(true)
      }
    }

    loadCart()

    return () => {
      cancelled = true
    }
  }, [dispatch, status])

  useEffect(() => {
    if (!cartReady || status === 'loading') return

    writeStoredCart(cartItems)
    if (status !== 'authenticated') return

    const timeout = window.setTimeout(() => {
      fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItems }),
      }).catch(() => {})
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [cartItems, cartReady, status])

  return children
}

export default function StoreProvider({ children }) {
  const storeRef = useRef(undefined)
  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore()
  }

  return (
    <Provider store={storeRef.current}>
      <ProductBootstrap>{children}</ProductBootstrap>
    </Provider>
  )
}
