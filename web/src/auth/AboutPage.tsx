/**
 * '/about' (UX_MAP: "Profile / About -- name, sign out; licenses and credits").
 * D-017 resolved that the licence position is stated in the README *and*
 * in the app: MIT for the code, frescoes belong to their artists.
 *
 * The attribution list is not decoration -- NFR-004 requires the map and
 * imagery credits to be visible, and every service named here is one the
 * app actually calls (ARCHITECTURE.md §6).
 */
import { Link } from 'react-router-dom'
import './auth.css'

interface Credit {
  name: string
  href: string
  what: string
  terms: string
}

const CREDITS: Credit[] = [
  {
    name: 'OpenStreetMap',
    href: 'https://www.openstreetmap.org/copyright',
    what: 'the map data behind the globe, place search and place names',
    terms: '© OpenStreetMap contributors, ODbL',
  },
  {
    name: 'OpenFreeMap / OpenMapTiles',
    href: 'https://openfreemap.org/',
    what: 'the map tiles',
    terms: '© OpenMapTiles, data from OpenStreetMap',
  },
  {
    name: 'MapLibre GL JS',
    href: 'https://maplibre.org/',
    what: 'the globe and maps',
    terms: 'BSD-3-Clause',
  },
  {
    name: 'Openverse',
    href: 'https://openverse.org/',
    what: 'the reference images in the drawing screen',
    terms: 'openly licensed works; each result carries its own licence',
  },
  {
    name: 'Mapillary and Panoramax',
    href: 'https://www.mapillary.com/',
    what: 'street-level imagery beside a fresco, where it exists',
    terms: 'CC BY-SA, by their contributors',
  },
  {
    name: 'Photon and Nominatim',
    href: 'https://photon.komoot.io/',
    what: 'searching for a place, and naming the spot a photo was taken',
    terms: 'OpenStreetMap-based, free to use',
  },
  {
    name: 'Gochi Hand, Gaegu and Karla',
    href: 'https://fonts.google.com/',
    what: 'the three typefaces: the marker, the pencil and the print',
    terms: 'SIL Open Font License, via Google Fonts',
  },
  {
    name: 'Doodle Icons by Khushmeen Sidhu',
    href: 'https://khushmeen.com/icons.html',
    what: 'the hand-drawn icon set',
    terms: 'CC0, no attribution required',
  },
  {
    name: 'Open-Meteo',
    href: 'https://open-meteo.com/',
    what: 'the weather shown on a fresco, for when it was captured',
    terms: 'free for non-commercial use',
  },
]

export function AboutPage() {
  return (
    <div className="scroll lined">
      <section className="page about-page">
        <h1>About Sinopia</h1>
        <p className="about-lede">Draw on the real world. Leave it where you found it.</p>
        <p>
          Sinopia is named after the red earth pigment from Sinope that fresco painters used to
          sketch the <em>underdrawing</em> on a wall before painting it. Here the real world is the
          wall: you photograph a place, draw your interpretation over the photo, and the finished
          piece — a <em>fresco</em> — stays where you made it.
        </p>
        <p>
          Your <em>Sinopia</em> is your own world: the places you have drawn, seen from above. Other
          artists have theirs, made of the places they have drawn. They are all the same Earth, so
          two people can draw the same wall and find each other there.
        </p>

        <h3>Licence</h3>
        <p>
          Sinopia&apos;s code is open source under the MIT licence.{' '}
          <strong>Frescoes belong to the artists who drew them</strong> — publishing one to Sinopia
          does not sign it over to anyone.
        </p>

        <h3>Your location</h3>
        <p>
          The exact spot a photo was taken is stored where only you can read it. A published fresco
          shows either that exact point, if you chose it and accepted the warning, or a point
          snapped to roughly half a kilometre. Photo metadata, including GPS, is stripped from every
          image before it is uploaded.
        </p>

        <h3>References</h3>
        <p>
          Reference images come from Openverse and are shown with the licence, creator and source as
          reported by the source. Sinopia does not store them. License information is as reported by
          the source; check it before reuse.
        </p>

        <h3>Built with</h3>
        <ul className="about-credits">
          {CREDITS.map((credit) => (
            <li key={credit.name}>
              <a href={credit.href} target="_blank" rel="noreferrer noopener">
                {credit.name}
              </a>
              <span className="about-credit-what"> — {credit.what}</span>
              <span className="about-credit-terms">{credit.terms}</span>
            </li>
          ))}
        </ul>

        <p>
          <Link className="link" to="/me">
            Back to profile
          </Link>
        </p>
      </section>
    </div>
  )
}
