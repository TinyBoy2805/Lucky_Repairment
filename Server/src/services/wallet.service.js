import { db } from '../config/firebase.js'
import { badRequest, conflict } from '../utils/http-error.js'

export const TRANSACTION_TYPES = [
  'deposit',
  'withdraw',
  'payment',
  'refund',
  'commission',
]

const walletsRef = () => db.ref('wallets')
const walletRef = (uid) => walletsRef().child(uid)
const transactionsRef = () => db.ref('transactions')

const toAmount = (value) => {
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.round(amount) : NaN
}

const emptyWallet = (uid) => ({ uid, balance: 0, updatedAt: Date.now() })

const toList = (value) =>
  Object.entries(value ?? {})
    .filter(([id]) => id !== '_schema')
    .map(([id, data]) => ({ id, ...data }))

/** Ví của 1 user (tự tạo ví rỗng nếu chưa có). */
export async function getWallet(uid) {
  const snapshot = await walletRef(uid).once('value')
  if (!snapshot.exists()) return emptyWallet(uid)
  return { uid, ...snapshot.val() }
}

/** Danh sách ví (admin). */
export async function listWallets() {
  const snapshot = await walletsRef().once('value')
  if (!snapshot.exists()) return []

  return toList(snapshot.val()).sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0))
}

async function recordTransaction(entry) {
  const ref = await transactionsRef().push(entry)
  return { id: ref.key, ...entry }
}

async function saveWallet(wallet) {
  await walletRef(wallet.uid).set(wallet)
  return wallet
}

/** Nạp tiền vào ví. */
export async function deposit(uid, input = {}) {
  const amount = toAmount(input.amount)
  if (!Number.isInteger(amount) || amount <= 0) {
    throw badRequest('Số tiền nạp không hợp lệ.')
  }

  const wallet = await getWallet(uid)
  wallet.balance = (wallet.balance ?? 0) + amount
  wallet.updatedAt = Date.now()
  await saveWallet(wallet)

  const transaction = await recordTransaction({
    uid,
    type: 'deposit',
    amount,
    balanceAfter: wallet.balance,
    refId: null,
    status: 'success',
    createdAt: wallet.updatedAt,
  })

  return { wallet, transaction }
}

/** Rút tiền khỏi ví. */
export async function withdraw(uid, input = {}) {
  const amount = toAmount(input.amount)
  if (!Number.isInteger(amount) || amount <= 0) {
    throw badRequest('Số tiền rút không hợp lệ.')
  }

  const wallet = await getWallet(uid)
  if ((wallet.balance ?? 0) < amount) {
    throw conflict('Số dư ví không đủ để rút.')
  }

  wallet.balance -= amount
  wallet.updatedAt = Date.now()
  await saveWallet(wallet)

  const transaction = await recordTransaction({
    uid,
    type: 'withdraw',
    amount,
    balanceAfter: wallet.balance,
    refId: null,
    status: 'success',
    createdAt: wallet.updatedAt,
  })

  return { wallet, transaction }
}
