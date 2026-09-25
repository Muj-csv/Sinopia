import { type ChangeEvent, useId, useState } from 'react'
import { ACCEPTED_TYPES, type CapturedImage, MAX_UPLOAD_BYTES, loadImage } from './types'

interface Props {
  onCapture: (image: CapturedImage) => void
}

export function ImageUpload({ onCapture }: Props) {
  const [error, setError] = useState<string | undefined>()
  const inputId = useId()

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Please choose a PNG or JPG image.')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('That image is larger than 10 MB. Please choose a smaller file.')
      return
    }

    setError(undefined)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const image = await loadImage(reader.result as string)
        onCapture(image)
      } catch {
        setError('Could not read that image. Please try another file.')
      }
    }
    reader.onerror = () => setError('Could not read that image. Please try another file.')
    reader.readAsDataURL(file)
  }

  return (
    <div className="capture-panel">
      <label htmlFor={inputId} className="capture-dropzone">
        <span>Choose a PNG or JPG (up to 10 MB)</span>
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleChange}
        />
      </label>
      {error !== undefined && (
        <p role="alert" className="capture-error">
          {error}
        </p>
      )}
    </div>
  )
}
