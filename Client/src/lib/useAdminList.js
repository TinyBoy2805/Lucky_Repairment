import { useEffect, useRef, useState } from 'react'

export function useAdminList(load, key) {
  const loadRef = useRef(load)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    loadRef.current = load
  }, [load])

  useEffect(() => {
    let active = true

    loadRef
      .current()
      .then((result) => {
        if (!active) return
        setData(result)
        setError('')
      })
      .catch((loadError) => {
        if (active) setError(loadError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [key, version])

  return {
    data,
    loading,
    error,
    reload: () => setVersion((value) => value + 1),
    setError,
  }
}
