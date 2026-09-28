/**
 * PHASE-1 task 1: '/new/pin' -- confirm where the photo was taken.
 *
 * SCREENS.md "Pin check": full-bleed map with a fixed centre pin, a top card showing the photo and
 * where the location came from, and a bottom dock with the place name, Confirm spot (this screen's
 * one yellow button) and Use my location. Never confirm silently without saying where it came from.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getDraft, updateDraft, type Draft } from '../lib/draftStore'
import { reverseGeocode } from '../lib/nominatim'
import { FlowBar } from '../ui/FlowBar'
import { Icon } from '../ui/Icon'
import './capture.css'
import { getDevicePosition, type LocationSource } from './LocationFallback'
import { PinPicker } from './PinPicker'

const SOURCE_TEXT: Record<LocationSource, string> = {
  exif: "From your photo's location",
  device: 'From your device',
  map: 'Placed by you',
}

export function PinCheck() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const draftId = params.get('draft')

  const [draft, setDraft] = useState<Draft | null>(null)
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [placeName, setPlaceName] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeFailed, setGeocodeFailed] = useState(false)
  const [source, setSource] = useState<LocationSource>('map')
  const [locating, setLocating] = useState(false)
  const [locateDenied, setLocateDenied] = useState(false)

  useEffect(() => {
    if (draftId === null) return
    getDraft(draftId).then((d) => {
      if (d === undefined) return
      setDraft(d)
      setLat(d.location?.lat ?? null)
      setLng(d.location?.lng ?? null)
      setPlaceName(d.placeName ?? '')
      setSource(d.locationSource ?? (d.location === null ? 'map' : 'exif'))
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
        setGeocodeFailed(result.placeName === null)
      })
      .finally(() => {
        if (!cancelled) setGeocoding(false)
      })
    return () => {
      cancelled = true
    }
  }, [lat, lng])

  const thumbUrl = useMemo(
    () => (draft === null ? null : URL.createObjectURL(draft.thumb)),
    [draft],
  )
  useEffect(() => {
    return () => {
      if (thumbUrl !== null) URL.revokeObjectURL(thumbUrl)
    }
  }, [thumbUrl])

  const useMyLocation = async () => {
    setLocating(true)
    setLocateDenied(false)
    const position = await getDevicePosition()
    setLocating(false)
    if (position === null) {
      setLocateDenied(true)
      return
    }
    setLat(position.lat)
    setLng(position.lng)
    setSource('device')
  }

  const confirm = async () => {
    if (draftId === null || lat === null || lng === null) return
    await updateDraft(draftId, {
      location: { lat, lng },
      locationSource: source,
      placeName: placeName || null,
    })
    navigate(`/new/draw?draft=${draftId}`)
  }

  if (draftId === null || draft === null) {
    return (
      <>
        <FlowBar title="Where was this?" exit="back" />
        <div className="scroll lined">
          <p className="page">Loading&hellip;</p>
        </div>
      </>
    )
  }

  return (
    <>
      <FlowBar title="Where was this?" exit="back" />

      <div className="pin-check">
        <PinPicker
          lat={lat}
          lng={lng}
          onChange={(newLat, newLng) => {
            setLat(newLat)
            setLng(newLng)
            // Once the map has been dragged the location is the artist's, not the photo's.
            setSource('map')
          }}
        />

        <div className="pin-check-origin">
          {thumbUrl !== null && <img src={thumbUrl} alt="" className="pin-check-thumb" />}
          <span className="t-label">{SOURCE_TEXT[source]}</span>
        </div>

        <div className="pin-check-dock lined">
          <label className="field">
            <span>Place name</span>
            <input
              type="text"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder={geocoding ? 'Finding place name…' : 'Add one if you like'}
            />
            {geocodeFailed && !geocoding && (
              <span className="help">No place name here yet. You can add one when you finish.</span>
            )}
          </label>

          {locateDenied && (
            <p className="notice" role="alert">
              <Icon name="warn" />
              <span>Location is off. Drag the map to place the pin instead.</span>
            </p>
          )}

          <div className="pin-check-actions">
            <button
              type="button"
              className="btn-y btn-wide"
              onClick={confirm}
              disabled={lat === null || lng === null}
            >
              Confirm spot
            </button>
            <button
              type="button"
              className="btn-o btn-wide"
              onClick={useMyLocation}
              disabled={locating}
            >
              <Icon name="locate" />
              {locating ? 'Finding you…' : 'Use my location'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
