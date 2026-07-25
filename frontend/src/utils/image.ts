const MAX_MEGAPIXELS = 4
const JPEG_QUALITY = 0.85

/**
 * Redimensionne une image côté client avant envoi (max ~4 mégapixels) pour
 * éviter les échecs d'upload avec les photos de smartphone (souvent
 * 10-15 Mo / 12+ Mpx), bien au-delà de la limite serveur.
 * `imageOrientation: 'from-image'` applique la rotation EXIF avant le
 * redimensionnement, car le canvas ne conserve pas les métadonnées EXIF —
 * sans ça, les photos prises en portrait ressortiraient pivotées.
 */
export async function resizeImageFile(file: File, maxMegapixels = MAX_MEGAPIXELS): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const { width, height } = bitmap
    const maxPixels = maxMegapixels * 1_000_000

    if (width * height <= maxPixels) {
      bitmap.close()
      return file
    }

    const scale = Math.sqrt(maxPixels / (width * height))
    const targetWidth = Math.round(width * scale)
    const targetHeight = Math.round(height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )
    if (!blob) return file

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    // navigateur sans createImageBitmap/canvas fonctionnel — on envoie
    // l'original, le serveur reste garant de ses propres limites
    return file
  }
}
