/** FR-001: upload a PNG/JPG sketch, <= 10 MB. */
import { useState } from 'react'
import { validateUploadFile } from './validateUpload'

export function Upload({ onImage }: { onImage: (file: File) => void }) {
  const [error, setError] = useState<string | null>(null)

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    const reason = validateUploadFile(file)
    if (reason !== null) {
      setError(reason)
      return
    }
    setError(null)
    onImage(file)
  }

  return (
    <div
      className="capture-upload"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        handleFiles(e.dataTransfer.files)
      }}
    >
      <label className="capture-upload-label">
        <input
          type="file"
          accept="image/png,image/jpeg"
          onChange={(e) => handleFiles(e.target.files)}
        />
        Choose a file or drag it here
      </label>
      {error !== null && (
        <p className="capture-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
