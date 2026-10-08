import { db } from '../config/firebase.js'
import { badRequest, conflict, notFound } from '../utils/http-error.js'

const categoriesRef = () => db.ref('categories')
const categoryRef = (id) => categoriesRef().child(id)

const norm = (value) => String(value ?? '').trim()

// Bỏ qua node metadata `_schema` khi liệt kê.
const toList = (value) =>
  Object.entries(value ?? {})
    .filter(([id]) => id !== '_schema')
    .map(([id, data]) => ({ id, ...data }))

/** Danh sách danh mục (mọi user đã đăng nhập đều xem được). */
export async function listCategories() {
  const snapshot = await categoriesRef().once('value')
  if (!snapshot.exists()) return []

  return toList(snapshot.val()).sort((a, b) =>
    norm(a.name).localeCompare(norm(b.name), 'vi'),
  )
}

async function assertUniqueName(name, exceptId) {
  const all = await listCategories()
  const duplicate = all.find(
    (item) => item.id !== exceptId && norm(item.name).toLowerCase() === name.toLowerCase(),
  )
  if (duplicate) throw conflict('Danh mục này đã tồn tại.')
}

export async function getCategory(id) {
  const snapshot = await categoryRef(id).once('value')
  if (!snapshot.exists()) throw notFound('Không tìm thấy danh mục.')
  return { id, ...snapshot.val() }
}

/** Tạo danh mục (admin). */
export async function createCategory(input = {}) {
  const name = norm(input.name)
  const description = norm(input.description)

  if (!name) throw badRequest('Vui lòng nhập tên danh mục.')
  await assertUniqueName(name)

  const now = Date.now()
  const entry = { name, description, active: true, createdAt: now, updatedAt: now }
  const ref = await categoriesRef().push(entry)
  return { id: ref.key, ...entry }
}

/** Cập nhật danh mục (admin). */
export async function updateCategory(id, input = {}) {
  const existing = await getCategory(id)
  const patch = { updatedAt: Date.now() }

  if (input.name !== undefined) {
    const name = norm(input.name)
    if (!name) throw badRequest('Tên danh mục không được để trống.')
    await assertUniqueName(name, id)
    patch.name = name
  }
  if (input.description !== undefined) patch.description = norm(input.description)
  if (input.active !== undefined) patch.active = Boolean(input.active)

  await categoryRef(id).update(patch)
  return { ...existing, ...patch }
}

/** Xoá danh mục (admin). */
export async function deleteCategory(id) {
  await getCategory(id)
  await categoryRef(id).remove()
  return true
}
