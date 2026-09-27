/** PHASE-1 task 1: '/new/pin' -- confirm where the photo was taken. */
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getDraft, updateDraft, type Draft } from '../lib/draftStore'
import { reverseGeocode } from '../lib/nominatim'
import './capture.css'
import { PinPicker } from './PinPicker'

export function PinCheck() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const draftId = params.get('draft')

  const [draft, setDraft] = useState<Draft | null>(null)
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [placeName, setPlaceName] = useState('')
  const [geocoding, setGeocoding] = useState(false)

  useEffect(() => {
    if (draftId === null) return
    getDraft(draftId).then((d) => {
      if (d === undefined) return
      setDraft(d)
      setLat(d.location?.lat ?? null)
      setLng(d.location?.lng ?? null)
      setPlaceName(d.placeName ?? '')
    })
  }, [draftId])

  useEffect(() => {
    if (lat === null || lng === null) return
    let cancelled = false
    Promise.resolve()
      .then(() => {
        if (!cancelled) setGeocoding(true)
        return reverseGeocode(lat, lng)
      })
      .then((result) => {
        if (cancelled) return
        if (result.placeName !== null) setPlaceName(result.placeName)
      })
      .finally(() => {
        if (!cancelled) setGeocoding(false)
      })
    return () => {
      cancelled = true
    }
  }, [lat, lng])

  const confirm = async () => {
    if (draftId === null || lat === null || lng === null) return
    await updateDraft(draftId, { location: { lat, lng }, placeName: placeName || null })
    navigate(`/new/draw?draft=${draftId}`)
  }

  if (draftId === null || draft === null) {
    return <p className="capture-status">Loading...</p>
  }

  return (
    <div className="pin-check">
      <h2>Confirm where it was taken</h2>
      <PinPicker
        lat={lat}
        lng={lng}
        onChange={(newLat, newLng) => {
          setLat(newLat)
          setLng(newLng)
        }}
      />

      <label className="pin-check-place">
        Place name
        <input
          type="text"
          value={geocoding ? 'Finding place name...' : placeName}
          disabled={geocoding}
          onChange={(e) => setPlaceName(e.target.value)}
          placeholder="No location in this photo -- drop a pin"
        />
      </label>

      <button
        type="button"
        className="pin-check-confirm"
        onClick={confirm}
        disabled={lat === null || lng === null}
      >
        Confirm
      </button>
    </div>
  )
}
