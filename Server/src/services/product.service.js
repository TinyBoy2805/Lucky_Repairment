import { db } from '../config/firebase.js'
import { badRequest, forbidden, notFound } from '../utils/http-error.js'

const productsRef = () => db.ref('products')
const productRef = (id) => productsRef().child(id)
const reviewsRef = () => db.ref('reviews')
const reviewRef = (id) => reviewsRef().child(id)

const norm = (value) => String(value ?? '').trim()

// Dữ liệu sản phẩm mặc định ban đầu cho ngành Điện - Nước dân dụng
export const DEFAULT_PRODUCTS = [
  {
    id: 'prod-aptomat-rcbo-panasonic',
    name: 'Aptomat chống giật Panasonic RCBO 32A 30mA (BBDE23231CNV)',
    category: 'electric',
    categoryName: 'Thiết bị điện',
    brand: 'Panasonic',
    price: 385000,
    originalPrice: 450000,
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'Aptomat chống rò giật và quá tải tự động ngắt điện cực nhạy trong 0.1 giây, an toàn tuyệt đối cho gia đình.',
    description: `Aptomat RCBO Panasonic là thiết bị bảo vệ tối ưu cho hệ thống điện dân dụng. Khi phát hiện dòng rò đạt ngưỡng 30mA hoặc sự cố quá tải, ngắn mạch, thiết bị tự động ngắt toàn bộ nguồn điện trong 0.1 giây, ngăn ngừa tối đa nguy cơ điện giật và cháy nổ. Sản phẩm sản xuất theo tiêu chuẩn khắt khe của Nhật Bản, độ bền cơ học cao, vỏ nhựa chống cháy chuyên dụng.`,
    installationFee: 100000,
    inStock: true,
    warranty: '24 tháng chính hãng',
    specifications: [
      { key: 'Thương hiệu', value: 'Panasonic (Nhật Bản)' },
      { key: 'Dòng điện định mức', value: '32A' },
      { key: 'Dòng rò định mức', value: '30mA' },
      { key: 'Điện áp định mức', value: '240V AC' },
      { key: 'Dòng cắt ngắn mạch', value: '6kA' },
      { key: 'Thời gian tác động', value: '< 0.1s' },
      { key: 'Xuất xứ', value: 'Việt Nam / Thái Lan' },
    ],
    features: [
      'Bảo vệ kép: Chống quá tải và chống rò điện giật',
      'Độ nhạy cực cao ngắt mạch an toàn trong 0.1 giây',
      'Nhựa cao cấp chống bắt lửa và chịu nhiệt độ cao',
      'Thích hợp lắp đặt tổng cho căn hộ hoặc khu vực ẩm ướt (nhà tắm, máy giặt)',
    ],
  },
  {
    id: 'prod-may-bom-panasonic-a130jack',
    name: 'Máy bơm nước tăng áp tự động Panasonic A-130JACK (125W)',
    category: 'water',
    categoryName: 'Thiết bị nước',
    brand: 'Panasonic',
    price: 1650000,
    originalPrice: 1890000,
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'Tăng áp lực nước mạnh mẽ cho vòi sen, máy giặt, bình nóng lạnh. Tự động đóng ngắt khi mở/khóa vòi nước.',
    description: `Máy bơm tăng áp tự động Panasonic A-130JACK chuyên dụng cho gia đình có nguồn nước yếu, hỗ trợ tăng áp lực cho các thiết bị như máy giặt, vòi tắm hoa sen, bình nước nóng lạnh. Thân máy đúc bằng nhôm tản nhiệt tốt, buồng bơm bằng đồng thau chống gỉ sét và chịu ma sát cao. Máy vận hành êm ái, rơ-le nhiệt tự ngắt khi nhiệt độ động cơ quá cao, gia tăng tuổi thọ sử dụng.`,
    installationFee: 200000,
    inStock: true,
    warranty: '12 tháng chính hãng',
    specifications: [
      { key: 'Thương hiệu', value: 'Panasonic' },
      { key: 'Công suất', value: '125W' },
      { key: 'Lưu lượng nước tối đa', value: '30 lít/phút' },
      { key: 'Độ cao đẩy tối đa', value: '27 mét' },
      { key: 'Độ sâu hút tối đa', value: '9 mét' },
      { key: 'Đường kính ống hút/xả', value: '1 inch (25mm)' },
      { key: 'Điện áp', value: '220V / 50Hz' },
    ],
    features: [
      'Bầu tăng áp phủ lớp cách ly chống rỉ sét, màng cao su Butyl đàn hồi',
      'Cánh bơm và buồng bơm bằng đồng thau chịu nhiệt cao',
      'Tự động tăng áp lực nước khi mở vòi và tự ngắt khi khóa vòi',
      'Rơ-le nhiệt tự ngắt khi quá nhiệt, bảo vệ an toàn chống cháy máy',
    ],
  },
  {
    id: 'prod-sen-cay-nong-lanh-inox-304',
    name: 'Bộ sen cây tắm đứng nóng lạnh Inox 304 mạ mờ cao cấp',
    category: 'water',
    categoryName: 'Thiết bị nước',
    brand: 'SUS Japan Standard',
    price: 1250000,
    originalPrice: 1600000,
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'Chất liệu chuẩn Inox SUS 304 không chì, không gỉ sét. Bát sen lớn phun mưa êm ái kèm vòi xả phụ tiện lợi.',
    description: `Bộ sen cây tắm đứng cao cấp được gia công từ Inox SUS 304 nguyên khối mạ xước mờ sang trọng, không chứa chì, an toàn tuyệt đối cho sức khỏe người dùng. Bát sen trần thiết kế tăng áp công nghệ khí hòa trộn nước mang lại cảm giác massage thư giãn tuyệt vời. Thân sen có thể điều chỉnh độ cao linh hoạt từ 85cm đến 125cm phù hợp mọi chiều cao thành viên trong gia đình.`,
    installationFee: 150000,
    inStock: true,
    warranty: '36 tháng chống rò rỉ',
    specifications: [
      { key: 'Chất liệu', value: 'Inox SUS 304 không gỉ đúc nguyên khối' },
      { key: 'Bát sen chính', value: 'Kích thước 20x20cm, xoay 360 độ' },
      { key: 'Tay sen phụ', value: 'Inox 304 có 3 chế độ phun nước' },
      { key: 'Áp lực nước', value: '0.05 - 0.75 MPa' },
      { key: 'Dây dẫn sen', value: 'Chống xoắn, chịu áp lực nước cao' },
      { key: 'Chế độ nước', value: 'Nóng & Lạnh' },
    ],
    features: [
      'Chống bám cặn vôi, dễ dàng lau chùi vệ sinh',
      'Van lõi gốm Ceramic đóng mở bền bỉ trên 500.000 lần',
      'Đầy đủ phụ kiện chân Z Inox và gioăng cao su chịu nhiệt',
      'Thiết kế phong cách tối giản chuẩn phong cách châu Âu',
    ],
  },
  {
    id: 'prod-o-cam-schneider-avataron',
    name: 'Ổ cắm đôi 3 chấu âm tường Schneider AvatarOn cao cấp',
    category: 'electric',
    categoryName: 'Thiết bị điện',
    brand: 'Schneider Electric',
    price: 115000,
    originalPrice: 145000,
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'Thiết kế phẳng tràn viền độc đáo, có màng che an toàn trẻ em và chân tiếp xúc đồng nguyên chất đàn hồi cao.',
    description: `Ổ cắm đôi 3 chấu có chân nối đất Schneider AvatarOn sở hữu thiết kế phẳng tràn viền không khung viền vi diệu, tạo điểm nhấn hiện đại cho mọi không gian nội thất. Ổ cắm tích hợp màng che an toàn chống chọc que nhọn, bảo vệ an toàn tối đa cho gia đình có trẻ nhỏ. Tiếp điểm bằng hợp kim đồng dẻo dai giúp phích cắm bám chặt, chống đánh tia lửa điện và chống lỏng lẻo sau thời gian dài sử dụng.`,
    installationFee: 50000,
    inStock: true,
    warranty: '12 tháng chính hãng',
    specifications: [
      { key: 'Thương hiệu', value: 'Schneider Electric (Pháp)' },
      { key: 'Dòng sản phẩm', value: 'AvatarOn' },
      { key: 'Dòng điện định mức', value: '16A' },
      { key: 'Điện áp định mức', value: '250V AC' },
      { key: 'Màu sắc', value: 'Trắng tinh tế' },
      { key: 'Tính năng an toàn', value: 'Màng che Shutter chống giật' },
    ],
    features: [
      'Thiết kế mặt phẳng phẳng tràn viền cao cấp, sang trọng',
      'Cấu tạo nhíp đồng nguyên chất đàn hồi tốt, cắm rút êm ái',
      'Vật liệu nhoplastic Polycarbonate chống cháy và chống ố vàng',
      'Lắp đặt chuẩn đế âm vuông / chữ nhật tiêu chuẩn',
    ],
  },
  {
    id: 'prod-den-led-am-tran-rang-dong-9w',
    name: 'Đèn Led âm trần Downlight Rạng Đông 9W đổi 3 màu (D AT04L 90/9W)',
    category: 'electric',
    categoryName: 'Thiết bị điện',
    brand: 'Rạng Đông',
    price: 89000,
    originalPrice: 110000,
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'Đổi 3 màu ánh sáng (Trắng/Vàng/Trung tính) chỉ với thao tác bật tắt công tắc. Tiết kiệm 80% điện năng.',
    description: `Đèn Led âm trần Rạng Đông 9W sử dụng Chip LED Samsung chất lượng cao, độ tin cậy vượt trội và tuổi thọ lên tới 30.000 giờ chiếu sáng. Tích hợp tính năng đổi 3 màu ánh sáng thuận tiện (6500K trắng sáng, 3000K vàng ấm cúng, 4000K trung tính tự nhiên) bằng thao tác bật tắt công tắc tường. Vỏ nhôm đúc nguyên khối tản nhiệt cực nhanh giúp bóng đèn hoạt động ổn định và bền bỉ.`,
    installationFee: 50000,
    inStock: true,
    warranty: '24 tháng đổi mới',
    specifications: [
      { key: 'Thương hiệu', value: 'Rạng Đông (Việt Nam)' },
      { key: 'Công suất', value: '9W' },
      { key: 'Quang thông', value: '720 lm' },
      { key: 'Đường kính khoét lỗ', value: 'Ø90 mm' },
      { key: 'Nhiệt độ màu', value: 'Đổi màu: 6500K / 4000K / 3000K' },
      { key: 'Chỉ số hoàn màu (CRI)', value: '> 80 (cho màu sắc trung thực)' },
    ],
    features: [
      'Sử dụng Chip LED Samsung thế hệ mới hiệu suất cao',
      'Đổi màu ánh sáng linh hoạt phù hợp từng không gian sinh hoạt',
      'Thân đèn nhôm đúc tản nhiệt tối ưu, mặt nhựa tán quang êm dịu không chói mắt',
      'Dải điệnáp rộng 150V - 250V hoạt động tốt kể cả khi điện yếu',
    ],
  },
  {
    id: 'prod-phao-dien-tu-dong-radar-st70ab',
    name: 'Pao điện chống cạn & chống tràn bồn nước tự động Radar ST-70AB',
    category: 'water',
    categoryName: 'Thiết bị nước',
    brand: 'Radar',
    price: 95000,
    originalPrice: 120000,
    image: 'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?auto=format&fit=crop&w=800&q=80',
    shortDesc: 'Phao điện điều khiển bơm nước tự động bật khi cạn và ngắt khi đầy, chống tràn nước và chống cháy máy bơm.',
    description: `Phao điện Radar ST-70AB chính hãng là giải pháp số 1 cho hệ thống bồn chứa nước sinh hoạt gia đình. Thiết bị điều khiển máy bơm nước đóng ngắt hoàn toàn tự động theo mức nước cài đặt trong bể. Thiết kế 2 quả phao cân bằng chuẩn xác, tiếp điểm đóng mở dứt khoát mạ bạc dẫn điện tốt, chịu tải cao. Hộp phao đậy kín chống côn trùng và nước mưa xâm nhập.`,
    installationFee: 100000,
    inStock: true,
    warranty: '12 tháng',
    specifications: [
      { key: 'Thương hiệu', value: 'Radar (Đài Loan)' },
      { key: 'Điện áp định mức', value: '110V / 220V' },
      { key: 'Dòng chịu tải tối đa', value: '15A / 7.5A' },
      { key: 'Phạm vi điều khiển', value: '0.2m - 5.0m' },
      { key: 'Chế độ hoạt động', value: 'Chống cạn & Chống tràn (2 cặp tiếp điểm A & B)' },
    ],
    features: [
      'Tự động hóa hoàn toàn việc cấp nước lên bồn, không lo tràn hay hết nước',
      'Tiếp điểm bằng hợp kim bạc siêu bền, đóng mở nhạy bén',
      'Chống nước, chống bụi và ngăn cản côn trùng xâm nhập',
      'Dễ dàng tùy chỉnh mức nước mong muốn bằng việc điều chỉnh khoảng cách 2 quả phao',
    ],
  },
]

/** Khởi tạo dữ liệu sản phẩm mặc định vào Realtime DB nếu chưa có */
async function ensureProductsSeeded() {
  const snapshot = await productsRef().once('value')
  if (!snapshot.exists() || Object.keys(snapshot.val() ?? {}).length === 0) {
    const seedObject = {}
    for (const p of DEFAULT_PRODUCTS) {
      seedObject[p.id] = {
        ...p,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    }
    await productsRef().set(seedObject)
  }
}

/** Lấy danh sách sản phẩm (có lọc theo danh mục, thương hiệu, tìm kiếm, sort, chủ sở hữu) */
export async function listProducts({ category, search, brand, sort, ownerUid } = {}) {
  await ensureProductsSeeded()

  const snapshot = await productsRef().once('value')
  let list = []

  if (snapshot.exists()) {
    list = Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }))
  } else {
    list = [...DEFAULT_PRODUCTS]
  }

  if (category && category !== 'all') {
    list = list.filter((p) => p.category === category)
  }

  if (brand && brand !== 'all') {
    list = list.filter((p) => p.brand === brand)
  }

  // Lọc theo chủ sở hữu (thợ xem sản phẩm của riêng mình)
  if (ownerUid && ownerUid !== 'all') {
    list = list.filter((p) => p.ownerUid === ownerUid)
  }

  if (search) {
    const term = norm(search).toLowerCase()
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        (p.shortDesc && p.shortDesc.toLowerCase().includes(term)) ||
        // Search trong specifications
        (p.specifications &&
          p.specifications.some(
            (spec) => String(spec.key).toLowerCase().includes(term) || String(spec.value).toLowerCase().includes(term),
          )) ||
        // Search trong features
        (p.features && p.features.some((feat) => feat.toLowerCase().includes(term))),
    )
  }

  // Sắp xếp: giá tăng/giảm, hoặc mới nhất
  if (sort === 'price_asc') {
    list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))
  } else if (sort === 'price_desc') {
    list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0))
  } else if (sort === 'newest' || !sort) {
    list.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
  }

  return list
}

/** Lấy chi tiết 1 sản phẩm */
export async function getProduct(id) {
  if (!id) throw badRequest('Thiếu mã sản phẩm.')

  const snapshot = await productRef(id).once('value')
  if (!snapshot.exists()) {
    // Thử tìm trong DEFAULT_PRODUCTS
    const found = DEFAULT_PRODUCTS.find((p) => p.id === id)
    if (found) return found
    throw notFound('Không tìm thấy sản phẩm.')
  }

  return { id, ...snapshot.val() }
}

// ===== Quản lý sản phẩm (admin / người bán - thợ) =====

const CATEGORY_LABEL = { electric: 'Thiết bị điện', water: 'Thiết bị nước' }
export const PRODUCT_CATEGORIES = ['electric', 'water']

const sanitizeProductInput = (input = {}) => {
  const category = norm(input.category) || 'other'
  const name = norm(input.name)
  const price = Number(input.price) || 0

  if (!name) throw badRequest('Vui lòng nhập tên sản phẩm.')
  if (price <= 0) throw badRequest('Giá sản phẩm phải lớn hơn 0.')

  const brand = norm(input.brand) || 'Khác'
  const originalPrice = Number(input.originalPrice) || 0

  // Đảm bảo specs/features là mảng chuỗi
  const asStrs = (value, keyName) => {
    if (!value) return []
    if (Array.isArray(value)) {
      return value
        .map((spec) =>
          spec && typeof spec === 'object'
            ? { key: norm(spec.key), value: norm(spec.value) }
            : norm(spec),
        )
        .filter((item) => (typeof item === 'object' ? item.key || item.value : item))
    }
    if (typeof value === 'string') {
      return value
        .split('\n')
        .map((line) => norm(line))
        .filter(Boolean)
    }
    throw badRequest(`${keyName} không hợp lệ.`)
  }

  return {
    name,
    category,
    categoryName: CATEGORY_LABEL[category] || 'Khác',
    brand,
    price,
    originalPrice: originalPrice > price ? originalPrice : 0,
    image: norm(input.image),
    shortDesc: norm(input.shortDesc),
    description: norm(input.description),
    installationFee: Math.max(0, Number(input.installationFee) || 0),
    inStock: input.inStock !== undefined ? Boolean(input.inStock) : true,
    warranty: norm(input.warranty) || 'Không bảo hành',
    specifications: asStrs(input.specifications, 'specifications'),
    features: asStrs(input.features, 'features'),
  }
}

/** Kiểm tra quyền quản lý sản phẩm: admin quản lý được tất cả, thợ chỉ quản lý sản phẩm của mình */
function assertCanManageProduct(product, actor) {
  if (!actor) throw forbidden('Cần đăng nhập để quản lý sản phẩm.')
  if (actor.role === 'admin') return
  if (actor.role === 'repairman' && product.ownerUid === actor.uid) return
  throw forbidden('Bạn không có quyền quản lý sản phẩm này.')
}

/** Tạo sản phẩm mới (admin hoặc người bán - thợ) */
export async function createProduct(input = {}, owner) {
  const data = sanitizeProductInput(input)
  const now = Date.now()

  const ref = await productsRef().push({
    ...data,
    ownerUid: owner?.uid || null,
    ownerName: owner?.displayName || owner?.email || '',
    createdAt: now,
    updatedAt: now,
  })

  return { id: ref.key, ...data, ownerUid: owner?.uid || null, createdAt: now }
}

/** Cập nhật sản phẩm (chủ sở hữu hoặc admin) */
export async function updateProduct(id, input = {}, actor) {
  if (!id) throw badRequest('Thiếu mã sản phẩm.')

  const existing = await getProduct(id)
  assertCanManageProduct(existing, actor)

  // PATCH: chỉ ghi đè các trường thực sự được gửi lên, giữ nguyên phần còn lại
  const provided = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  )
  const data = sanitizeProductInput({ ...existing, ...provided })
  const patch = {
    ...data,
    updatedAt: Date.now(),
  }

  await productRef(id).update(patch)
  return { ...existing, ...patch }
}

/** Xóa sản phẩm (chủ sở hữu hoặc admin) */
export async function deleteProduct(id, actor) {
  if (!id) throw badRequest('Thiếu mã sản phẩm.')

  const existing = await getProduct(id)
  assertCanManageProduct(existing, actor)

  await productRef(id).remove()
  return { success: true }
}

/** Tạo review cho sản phẩm */
export async function createReview(productId, customerUid, customerName, rating, comment) {
  if (!productId) throw badRequest('Thiếu mã sản phẩm.')
  if (!rating || rating < 1 || rating > 5) throw badRequest('Rating phải từ 1 đến 5.')

  const now = Date.now()
  const reviewData = {
    productId,
    customerUid,
    customerName,
    rating,
    comment: norm(comment),
    createdAt: now,
    updatedAt: now,
  }

  const ref = await reviewsRef().push(reviewData)
  return { id: ref.key, ...reviewData }
}

/** Lấy danh sách review cho sản phẩm */
export async function listReviews(productId) {
  if (!productId) throw badRequest('Thiếu mã sản phẩm.')

  const snapshot = await reviewsRef().orderByChild('productId').equalTo(productId).once('value')
  if (!snapshot.exists()) return []

  return Object.entries(snapshot.val())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
}

/** Tính điểm trung bình cho sản phẩm */
export async function getProductAverageRating(productId) {
  const reviews = await listReviews(productId)
  if (reviews.length === 0) return 0

  const total = reviews.reduce((sum, r) => sum + r.rating, 0)
  return Math.round((total / reviews.length) * 10) / 10
}

/** Lấy thống kê review cho sản phẩm */
export async function getProductRatingStats(productId) {
  const reviews = await listReviews(productId)
  const total = reviews.length
  const average = total > 0 ? await getProductAverageRating(productId) : 0

  // Phân phối rating
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const r of reviews) {
    const rating = r.rating
    if (distribution.hasOwnProperty(rating)) {
      distribution[rating]++
    }
  }

  return {
    total,
    average,
    distribution,
  }
}

/** Sản phẩm bán chạy nhất - tính từ lịch sử đơn hàng */
export async function getBestSellingProducts(limit = 5) {
  const ordersRef = db.ref('orders')
  const snapshot = await ordersRef.get()
  if (!snapshot.exists()) return []

  const allOrders = Object.entries(snapshot.val())
    .map(([id, data]) => ({ id, ...data }))
    .filter((o) => o.items && o.items.length > 0)

  // Đếm số lượng mỗi productId được bán
  const productSales = {}

  for (const order of allOrders) {
    for (const item of order.items) {
      const productId = item.productId
      if (!productSales[productId]) {
        productSales[productId] = { totalQuantity: 0, totalAmount: 0, product: null }
      }
      productSales[productId].totalQuantity += item.quantity || 1
      productSales[productId].totalAmount += item.subtotal || 0
    }
  }

  // Lấy thông tin sản phẩm
  const productIds = Object.keys(productSales)
  if (productIds.length === 0) return []

  const productSnapshot = await productsRef().get()

  let allProducts = []
  if (productSnapshot.exists()) {
    allProducts = Object.entries(productSnapshot.val())
      .map(([id, data]) => ({ id, ...data }))
      .filter(p => productIds.includes(p.id))
  }

  // Gắn thông tin product vào sales data
  const productMap = {}
  allProducts.forEach(p => { productMap[p.id] = p })

  const salesList = productIds
    .map(productId => ({
      productId,
      ...productSales[productId],
      product: productMap[productId] || null,
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, limit)

  return salesList
}