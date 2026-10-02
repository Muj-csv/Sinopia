/**
 * '/terms': age requirement, acceptable use, and a takedown contact.
 *
 * A location app that draws over real photos of real places will attract people underage to sign
 * a binding agreement, so this states the floor plainly rather than burying it in prose, and gives
 * anyone -- signed in or not -- a way to ask for something taken down without having to find a
 * report button on a specific fresco first (ReportDialog.tsx covers that narrower, in-app case).
 */
import { Link } from 'react-router-dom'
import './auth.css'

// Same address the README's team table already lists for Joey T. Cuison -- one public contact,
// not a second one nobody associates with this project.
const CONTACT_EMAIL = 'joeycuison333@gmail.com'

export function TermsPage() {
  return (
    <div className="scroll lined">
      <section className="page about-page">
        <h1>Terms &amp; safety</h1>

        <h3>Age</h3>
        <p>
          You must be at least 13 years old to use Sinopia. If you are a parent or guardian and
          believe a child under 13 has created an account, contact us at the address below and we
          will remove it.
        </p>

        <h3>Your frescoes</h3>
        <p>
          Frescoes belong to the artists who drew them -- publishing one does not sign it over to
          anyone. You are responsible for what you photograph and draw; don&apos;t publish anything
          that isn&apos;t yours to share, or that depicts someone else without their consent.
        </p>

        <h3>What we don&apos;t allow</h3>
        <ul>
          <li>Photos or drawings of another person made or published without their consent.</li>
          <li>Anything illegal, or that exists mainly to harass, threaten or mislead someone.</li>
          <li>Exact locations of places where showing the exact spot would put someone at risk.</li>
        </ul>
        <p>
          Reporting a published fresco hides it from Sinopia immediately, pending review (one
          report is enough -- there is no threshold to game). Report a specific fresco from its own
          page; for anything else, including your own account or data, use the contact below.
        </p>

        <h3>Takedown requests</h3>
        <p>
          To report content, request removal of a fresco (yours or someone else&apos;s), or ask
          about your data, email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Include a link to the fresco or
          profile if you have one -- it&apos;s the fastest way for us to find what you mean.
        </p>

        <h3>No warranty</h3>
        <p>
          Sinopia is a small, independently run project provided as-is, with no uptime guarantee.
          See <Link className="link" to="/about">About</Link> for licensing and the services it
          relies on.
        </p>

        <p>
          <Link className="link" to="/me">
            Back to profile
          </Link>
        </p>
      </section>
    </div>
  )
}
