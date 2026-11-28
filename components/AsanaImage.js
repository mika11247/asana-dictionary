'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthProvider'
import { acquireAsanaImage } from '../lib/asana-images'

export default function AsanaImage({ asana, alt = '', force = false, ...props }) {
  const { user } = useAuth()
  const element = useRef(null)
  const [visible, setVisible] = useState(false)
  const [loaded, setLoaded] = useState(null)
  const [retry, setRetry] = useState(null)
  const path = asana.private_image_path
  const ownerPath = user && path?.split('/')[0] === user.id ? path : null
  const attempt = retry?.path === ownerPath ? retry.attempt : 0

  useEffect(() => {
    if (visible || !ownerPath || !element.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisible(true)
    }, { rootMargin: '200px' })
    observer.observe(element.current)
    const image = element.current
    const prepare = () => setVisible(true)
    image.addEventListener('prepare-asana-print', prepare)
    return () => {
      observer.disconnect()
      image.removeEventListener('prepare-asana-print', prepare)
    }
  }, [visible, ownerPath])

  useEffect(() => {
    if (!ownerPath || (!visible && !force)) return
    let mounted = true
    let timer
    const image = acquireAsanaImage(ownerPath, user.id)
    const reconnect = () => {
      void image.url.then(url => {
        if (mounted && !url) setRetry({ path: ownerPath, attempt: 0 })
      })
    }
    window.addEventListener('online', reconnect)
    void image.url.then(url => {
      if (!mounted) return
      setLoaded({ path: ownerPath, url })
      if (!url && attempt === 0) timer = setTimeout(() => setRetry({ path: ownerPath, attempt: 1 }), 500)
    })
    return () => {
      mounted = false
      clearTimeout(timer)
      window.removeEventListener('online', reconnect)
      image.release()
    }
  }, [ownerPath, user?.id, visible, force, retry, attempt])

  const src = path ? (ownerPath && loaded?.path === ownerPath ? loaded.url : undefined) : asana.image_url
  if (!path && !src) return null
  return <img {...props} ref={element} alt={alt} src={src || undefined} onError={() => {
    if (ownerPath && attempt === 0) {
      setLoaded(null)
      setRetry({ path: ownerPath, attempt: 1 })
    }
  }} />
}
