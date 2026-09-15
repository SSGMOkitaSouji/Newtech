import React, { StrictMode, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createOrder, isSupabaseConfigured } from './lib/supabase'
import './styles.css'

const categories = [
  { name: 'Tất cả', icon: '✦' },
  { name: 'Món Việt', icon: '🍜' },
  { name: 'Món Hàn', icon: '🍙' },
  { name: 'Đồ ăn nhanh', icon: '🍔' },
  { name: 'Đồ uống', icon: '🧋' },
]

const dishes = [
  {
    id: 1,
    name: 'Bún bò Huế đặc biệt',
    restaurant: 'Bếp Nhà Huế',
    price: 59000,
    oldPrice: 69000,
    rating: '4.9',
    reviews: 128,
    category: 'Món Việt',
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=900&q=85',
    tag: 'Bán chạy',
    time: '25 phút',
  },
  {
    id: 2,
    name: 'Gà sốt cay phô mai',
    restaurant: 'Seoul Kitchen',
    price: 89000,
    oldPrice: 105000,
    rating: '4.8',
    reviews: 96,
    category: 'Món Hàn',
    image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=900&q=85',
    tag: 'Giảm 15%',
    time: '30 phút',
  },
  {
    id: 3,
    name: 'Burger bò phô mai',
    restaurant: 'The Burger Club',
    price: 75000,
    oldPrice: null,
    rating: '4.7',
    reviews: 74,
    category: 'Đồ ăn nhanh',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=85',
    tag: 'Mới',
    time: '20 phút',
  },
  {
    id: 4,
    name: 'Cơm tấm sườn nướng',
    restaurant: 'Cơm Tấm Mộc',
    price: 65000,
    oldPrice: null,
    rating: '4.9',
    reviews: 213,
    category: 'Món Việt',
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=85',
    tag: 'Yêu thích',
    time: '25 phút',
  },
  {
    id: 5,
    name: 'Mì trộn thịt nướng',
    restaurant: 'Bếp Nhỏ',
    price: 52000,
    oldPrice: null,
    rating: '4.6',
    reviews: 65,
    category: 'Món Việt',
    image: 'https://images.unsplash.com/photo-1557872943-16a5ac26437e?auto=format&fit=crop&w=900&q=85',
    tag: '',
    time: '20 phút',
  },
  {
    id: 6,
    name: 'Trà sữa ô long kem trứng',
    restaurant: 'Mây Tea',
    price: 42000,
    oldPrice: 49000,
    rating: '4.8',
    reviews: 88,
    category: 'Đồ uống',
    image: 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=900&q=85',
    tag: 'Hot',
    time: '15 phút',
  },
]

const formatPrice = (price) => `${price.toLocaleString('vi-VN')}đ`

function App() {
  const [activeCategory, setActiveCategory] = useState('Tất cả')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [showCart, setShowCart] = useState(false)
  const [liked, setLiked] = useState([])
  const [showCheckout, setShowCheckout] = useState(false)
  const [orderStatus, setOrderStatus] = useState('idle')
  const [orderError, setOrderError] = useState('')
  const [orderId, setOrderId] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', address: '', note: '' })
  const [formErrors, setFormErrors] = useState({})

  const filteredDishes = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return dishes.filter((dish) => {
      const inCategory = activeCategory === 'Tất cả' || dish.category === activeCategory
      const matchesSearch = !keyword || `${dish.name} ${dish.restaurant}`.toLowerCase().includes(keyword)
      return inCategory && matchesSearch
    })
  }, [activeCategory, search])

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0)
  const deliveryFee = subtotal > 0 ? 15000 : 0

  const addToCart = (dish) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === dish.id)
      if (existing) {
        return current.map((item) => item.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...current, { ...dish, quantity: 1 }]
    })
    setShowCart(true)
  }

  const updateQuantity = (id, amount) => {
    setCart((current) => current
      .map((item) => item.id === id ? { ...item, quantity: item.quantity + amount } : item)
      .filter((item) => item.quantity > 0))
  }

  const toggleLike = (id) => {
    setLiked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const updateForm = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFormErrors((current) => ({ ...current, [name]: '' }))
  }

  const validateForm = () => {
    const errors = {}
    if (!form.name.trim()) errors.name = 'Vui lòng nhập họ tên.'
    if (!/^0\d{9}$/.test(form.phone.trim())) errors.phone = 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.'
    if (!form.address.trim()) errors.address = 'Vui lòng nhập địa chỉ giao hàng.'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const submitOrder = async (event) => {
    event.preventDefault()
    if (!validateForm()) return
    setOrderStatus('loading')
    setOrderError('')
    try {
      const order = await createOrder({
        customer: form,
        items: cart.map(({ id, name, price, quantity }) => ({ id, name, price, quantity })),
        subtotal,
        deliveryFee,
      })
      setOrderId(order.id)
      setOrderStatus('success')
      setCart([])
    } catch (error) {
      setOrderStatus('error')
      setOrderError(error.message || 'Không thể lưu đơn hàng. Vui lòng thử lại.')
    }
  }

  const openCheckout = () => {
    setShowCheckout(true)
    setOrderStatus('idle')
    setOrderError('')
  }

  return (
    <div className="app-shell">
      <header className="navbar">
        <a className="brand" href="#" aria-label="Bếp Nhà">
          <span className="brand-mark">b<span>n</span></span>
          <span>Bếp Nhà</span>
        </a>
        <nav className="main-nav">
          <a className="active" href="#menu">Thực đơn</a>
          <a href="#offers">Ưu đãi</a>
          <a href="#restaurants">Nhà hàng</a>
          <a href="#about">Về chúng tôi</a>
        </nav>
        <div className="nav-actions">
          <button className="location-button" type="button"><span>⌖</span> Giao đến <strong>Quận 1, TP.HCM</strong> <small>⌄</small></button>
          <button className="icon-button" type="button" aria-label="Thông báo">♧<i /></button>
          <button className="avatar" type="button" aria-label="Tài khoản">A</button>
        </div>
      </header>

      <main>
        <section className="hero" id="about">
          <div className="hero-copy">
            <div className="eyebrow"><span>✳</span> NGON TỪ BẾP, ẤM TỪ TÂM</div>
            <h1>Món ngon <em>trao tay,</em><br />niềm vui <strong>đong đầy.</strong></h1>
            <p>Khám phá hàng nghìn món ăn ngon từ những căn bếp yêu thương gần bạn.</p>
            <div className="search-box">
              <span>⌕</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Bạn đang thèm món gì hôm nay?" />
              {search && <button type="button" onClick={() => setSearch('')} aria-label="Xóa tìm kiếm">×</button>}
              <button className="search-button" type="button">Tìm món</button>
            </div>
            <div className="hero-trust">
              <div className="avatar-stack"><span>H</span><span>M</span><span>L</span><span>+</span></div>
              <span><strong>10k+</strong> khách hàng hài lòng mỗi ngày</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="blob" />
            <div className="hero-dish-card">
              <img src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=85" alt="Tô mì ngon" />
              <div className="dish-sticker">Món<br /><b>ngon!</b> <span>✦</span></div>
            </div>
            <div className="floating-note">✦ <b>Free ship</b><small>Đơn từ 99k</small></div>
            <div className="sparkle sparkle-one">✦</div><div className="sparkle sparkle-two">✦</div>
          </div>
        </section>

        <section className="category-section" id="menu">
          <div className="section-heading"><div><span className="eyebrow">KHÁM PHÁ</span><h2>Hôm nay ăn gì?</h2></div><a href="#menu">Xem tất cả <span>→</span></a></div>
          <div className="category-list">
            {categories.map((category) => (
              <button key={category.name} className={`category-card ${activeCategory === category.name ? 'selected' : ''}`} onClick={() => setActiveCategory(category.name)} type="button">
                <span className="category-icon">{category.icon}</span><span>{category.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="menu-section" id="restaurants">
          <div className="section-heading menu-heading"><div><span className="eyebrow">GỢI Ý CHO BẠN</span><h2>Món ngon gần đây</h2></div><div className="slider-buttons"><button type="button">←</button><button type="button">→</button></div></div>
          <div className="dish-grid">
            {filteredDishes.map((dish) => (
              <article className="dish-card" key={dish.id}>
                <div className="dish-image">
                  <img src={dish.image} alt={dish.name} loading="lazy" />
                  {dish.tag && <span className="dish-tag">{dish.tag}</span>}
                  <button className={`heart ${liked.includes(dish.id) ? 'liked' : ''}`} onClick={() => toggleLike(dish.id)} type="button" aria-label="Yêu thích">{liked.includes(dish.id) ? '♥' : '♡'}</button>
                </div>
                <div className="dish-info"><div className="dish-title-row"><h3>{dish.name}</h3><span className="rating">★ {dish.rating}</span></div><p>{dish.restaurant} <span>·</span> {dish.time}</p><div className="dish-bottom"><div><strong>{formatPrice(dish.price)}</strong>{dish.oldPrice && <del>{formatPrice(dish.oldPrice)}</del>}</div><button className="add-button" onClick={() => addToCart(dish)} type="button">+</button></div></div>
              </article>
            ))}
          </div>
          {filteredDishes.length === 0 && <div className="empty-state">Không tìm thấy món phù hợp. Thử tìm món khác nhé!</div>}
        </section>
      </main>

      <button className="floating-cart" onClick={() => setShowCart(true)} type="button"><span>🛍</span><b>{cartCount || 0}</b><strong>Giỏ hàng</strong><em>{formatPrice(subtotal)}</em></button>
      {showCart && <div className="cart-overlay" onClick={() => setShowCart(false)} />}
      <aside className={`cart-drawer ${showCart ? 'open' : ''}`}>
        <div className="cart-header"><div><span className="eyebrow">ĐƠN HÀNG CỦA BẠN</span><h2>Giỏ hàng <small>({cartCount} món)</small></h2></div><button onClick={() => setShowCart(false)} type="button">×</button></div>
        {cart.length === 0 && orderStatus !== 'success' ? <div className="cart-empty"><div>🛍</div><h3>Giỏ hàng đang trống</h3><p>Thêm món ngon để bắt đầu đơn hàng của bạn nhé!</p><button onClick={() => setShowCart(false)} type="button">Khám phá món ngon</button></div> : orderStatus === 'success' ? <div className="cart-empty order-success"><div>✓</div><h3>Đặt hàng thành công!</h3><p>Mã đơn hàng <strong>#{orderId}</strong> đã được lưu vào Supabase.</p><button onClick={() => { setShowCheckout(false); setShowCart(false) }} type="button">Tiếp tục chọn món</button></div> : showCheckout ? <form className="checkout-form" onSubmit={submitOrder} noValidate><button className="back-to-cart" onClick={() => setShowCheckout(false)} type="button">← Quay lại giỏ hàng</button><h3>Thông tin giao hàng</h3>{!isSupabaseConfigured && <div className="state-message warning">Supabase chưa cấu hình. Tạo `.env.local` từ `.env.example` để lưu đơn hàng.</div>}<label>Họ và tên<input name="name" value={form.name} onChange={updateForm} placeholder="Nguyễn Văn A" />{formErrors.name && <small>{formErrors.name}</small>}</label><label>Số điện thoại<input name="phone" value={form.phone} onChange={updateForm} placeholder="0901234567" inputMode="numeric" />{formErrors.phone && <small>{formErrors.phone}</small>}</label><label>Địa chỉ giao hàng<textarea name="address" value={form.address} onChange={updateForm} placeholder="Số nhà, đường, phường..." rows="2" />{formErrors.address && <small>{formErrors.address}</small>}</label><label>Ghi chú <em>(không bắt buộc)</em><textarea name="note" value={form.note} onChange={updateForm} placeholder="Ít cay, gọi trước khi giao..." rows="2" /></label>{orderStatus === 'error' && <div className="state-message error">{orderError}</div>}<button className="checkout" disabled={orderStatus === 'loading'} type="submit">{orderStatus === 'loading' ? 'Đang lưu đơn hàng...' : `Xác nhận đặt hàng · ${formatPrice(subtotal + deliveryFee)}`}<span>→</span></button></form> : <><div className="cart-items">{cart.map((item) => <div className="cart-item" key={item.id}><img src={item.image} alt="" /><div className="cart-item-info"><h3>{item.name}</h3><p>{formatPrice(item.price)}</p><div className="quantity"><button onClick={() => updateQuantity(item.id, -1)} type="button">−</button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)} type="button">+</button></div></div></div>)}</div><div className="cart-summary"><div><span>Tạm tính</span><b>{formatPrice(subtotal)}</b></div><div><span>Phí giao hàng</span><b>{formatPrice(deliveryFee)}</b></div><hr /><div className="total"><span>Tổng cộng</span><b>{formatPrice(subtotal + deliveryFee)}</b></div><button className="checkout" onClick={openCheckout} type="button">Tiến hành đặt hàng <span>→</span></button></div></>}
      </aside>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
