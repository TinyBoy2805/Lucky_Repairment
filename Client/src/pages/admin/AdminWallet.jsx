import { useState } from 'react'
import AdminPager from '../../components/AdminPager.jsx'
import { adminApi } from '../../lib/admin.js'
import { buildQuery, useDebounced } from '../../lib/query.js'
import { useAdminList } from '../../lib/useAdminList.js'
import { fmtDateTime, fmtMoney } from '../../lib/format.js'

const TYPE_LABEL = {
  deposit: 'Nạp tiền',
  withdraw: 'Rút tiền',
  payment: 'Thanh toán',
  refund: 'Hoàn tiền',
  commission: 'Hoa hồng',
}

const TYPE_OPTIONS = [
  { value: '', label: 'Mọi loại giao dịch' },
  { value: 'deposit', label: 'Nạp tiền' },
  { value: 'withdraw', label: 'Rút tiền' },
  { value: 'payment', label: 'Thanh toán' },
  { value: 'refund', label: 'Hoàn tiền' },
  { value: 'commission', label: 'Hoa hồng' },
]

const PAGE_SIZE = 8

export default function AdminWallet() {
  const [keyword, setKeyword] = useState('')
  const search = useDebounced(keyword)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [type, setType] = useState('')
  const [txPage, setTxPage] = useState(1)

  const walletParams = { search, page, pageSize: PAGE_SIZE }
  const walletKey = buildQuery(walletParams)
  const { data, loading, error } = useAdminList(
    () => adminApi.wallet.list(walletParams),
    walletKey,
  )

  const txParams = { uid: selected?.uid, type, page: txPage, pageSize: PAGE_SIZE }
  const txKey = selected ? buildQuery(txParams) : ''
  const {
    data: txData,
    loading: txLoading,
    error: txError,
  } = useAdminList(
    () =>
      selected
        ? adminApi.transactions(txParams)
        : Promise.resolve({ transactions: [], total: 0 }),
    txKey,
  )

  const wallets = data?.wallets ?? []
  const transactions = txData?.transactions ?? []

  const selectWallet = (wallet) => {
    setSelected(wallet)
    setType('')
    setTxPage(1)
  }

  return (
    <div className="page">
      <header className="page__header">
        <h1>Ví &amp; giao dịch</h1>
        <p>Xem số dư ví của người dùng và lịch sử giao dịch tương ứng.</p>
      </header>

      {error && (
        <div className="alert alert--error" role="alert">
          <span>{error}</span>
        </div>
      )}

      <div className="admin-cols">
        <section className="card">
          <div className="toolbar">
            <h2 className="card__title">Ví ({data?.total ?? 0})</h2>
          </div>

          <input
            className="admin-input"
            type="search"
            placeholder="Tìm theo tên, email hoặc mã người dùng…"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value)
              setPage(1)
            }}
          />

          {loading ? (
            <p className="card__empty">Đang tải danh sách…</p>
          ) : wallets.length === 0 ? (
            <p className="card__empty">Không có ví nào khớp bộ lọc.</p>
          ) : (
            <ul className="req-list wallet-list">
              {wallets.map((wallet) => (
                <li
                  key={wallet.uid}
                  className={
                    selected?.uid === wallet.uid
                      ? 'req-item wallet-item is-active'
                      : 'req-item wallet-item'
                  }
                >
                  <button
                    className="wallet-item__button"
                    type="button"
                    onClick={() => selectWallet(wallet)}
                  >
                    <span className="wallet-item__name">
                      {wallet.name || wallet.uid}
                    </span>
                    <span className="wallet-item__balance">
                      {fmtMoney(wallet.balance)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <AdminPager
            page={data?.page ?? 1}
            totalPages={data?.totalPages ?? 1}
            total={data?.total ?? 0}
            onChange={setPage}
          />
        </section>

        <section className="card">
          <div className="toolbar">
            <h2 className="card__title">
              Giao dịch{selected ? ` · ${selected.name || selected.uid}` : ''}
            </h2>
            <span className="toolbar__spacer" />
            {selected && (
              <select
                className="admin-select"
                value={type}
                onChange={(event) => {
                  setType(event.target.value)
                  setTxPage(1)
                }}
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {!selected ? (
            <p className="card__empty">Chọn một ví bên trái để xem giao dịch.</p>
          ) : txError ? (
            <div className="alert alert--error" role="alert">
              <span>{txError}</span>
            </div>
          ) : txLoading ? (
            <p className="card__empty">Đang tải giao dịch…</p>
          ) : transactions.length === 0 ? (
            <p className="card__empty">Ví này chưa có giao dịch nào.</p>
          ) : (
            <ul className="req-list">
              {transactions.map((transaction) => (
                <li key={transaction.id} className="req-item">
                  <div className="req-item__top">
                    <strong>
                      {TYPE_LABEL[transaction.type] ?? transaction.type}
                    </strong>
                    <span
                      className={
                        transaction.type === 'withdraw'
                          ? 'req-item__amount is-minus'
                          : 'req-item__amount'
                      }
                    >
                      {fmtMoney(transaction.amount)}
                    </span>
                  </div>
                  <div className="req-item__foot">
                    <span className="req-item__date">
                      {fmtDateTime(transaction.createdAt)}
                    </span>
                    <span className="req-item__date">
                      Số dư sau: {fmtMoney(transaction.balanceAfter)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {selected && (
            <AdminPager
              page={txData?.page ?? 1}
              totalPages={txData?.totalPages ?? 1}
              total={txData?.total ?? 0}
              onChange={setTxPage}
            />
          )}
        </section>
      </div>
    </div>
  )
}
