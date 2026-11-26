'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthProvider'
import { signAsanaImage } from '../lib/asana-images'

export default function AsanaImage({ asana, force = false, ...props }) {
  const { user } = useAuth()
  const element = useRef(null)
  const [visible, setVisible] = useState(false)
  const [signed, setSigned] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const path = asana.private_image_path
  const ownerPath = user && path?.split('/')[0] === user.id ? path : null

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
    async function load(refresh) {
      const url = await signAsanaImage(ownerPath, refresh)
      if (!mounted) return
      setSigned({ path: ownerPath, url })
      if (url) timer = setTimeout(() => load(true), 270000)
    }
    void load(attempt > 0)
    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [ownerPath, visible, force, attempt])

  const src = path ? (ownerPath && signed?.path === ownerPath ? signed.url : undefined) : asana.image_url
  if (!path && !src) return null
  return <img {...props} ref={element} src={src || undefined} onError={() => {
    if (ownerPath && attempt === 0) setAttempt(1)
  }} />
}
