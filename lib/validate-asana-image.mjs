import sharp from 'sharp'

export async function normalizeWebp(bytes) {
  const image = sharp(bytes, { limitInputPixels: 4096 * 4096, failOn: 'warning' })
  const metadata = await image.metadata()
  if (metadata.format !== 'webp' || (metadata.pages ?? 1) !== 1) {
    throw new Error('Expected a single WebP image')
  }
  return image.webp({ quality: 85 }).toBuffer()
}
