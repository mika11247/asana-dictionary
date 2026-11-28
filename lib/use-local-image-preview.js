import { useEffect, useState } from 'react'

export function useLocalImagePreview(file) {
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview({ file, url })
    return () => URL.revokeObjectURL(url)
  }, [file])

  return preview?.file === file ? preview.url : ''
}
