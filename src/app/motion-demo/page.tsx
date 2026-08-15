import { buildMetadata } from '@/lib/metadata'
import MotionProvider from '@/components/motion/MotionProvider'
import RevealLines from '@/components/motion/RevealLines'
import RevealBlock from '@/components/motion/RevealBlock'
import Marquee from '@/components/motion/Marquee'
import StickyStack from '@/components/motion/StickyStack'
import ScrubScale from '@/components/motion/ScrubScale'
import CountUp from '@/components/motion/CountUp'

// SCRATCH ROUTE — delete before launch.
//
// Proves each motion primitive in isolation, with no page copy involved. All
// strings here are throwaway scaffolding, deliberately not brand copy: this
// route exists to be scrolled, not read.
//
// noindex because it must never be crawled. It is also unlinked from anywhere
// in the site, so the only way in is typing the URL.

export const metadata = buildMetadata({
  concept: 'motion demo',
  description:
    'Internal scratch route for verifying the scroll motion primitives in isolation. Not part of the public site and excluded from search.',
  path: '/motion-demo',
  noindex: true,
})

const Panel = ({ n, label }: { n: string; label: string }) => (
  <div className="flex min-h-[60vh] flex-col justify-center">
    <span className="t-eyebrow text-olive">State {n}</span>
    <p className="t-h3 mt-4">{label}</p>
  </div>
)

export default function MotionDemoPage() {
  return (
    <>
      <MotionProvider />

      <main className="redesign-container">
        <section className="redesign-section">
          <span className="t-eyebrow text-olive">Scratch route</span>
          <RevealLines as="h1" className="t-display mt-6">
            Every primitive on one page so each can be judged on its own
          </RevealLines>
          <RevealBlock>
            <p className="t-lede mt-8">
              Scroll. Then reload with reduced motion on and scroll again. The second
              pass should read identically with no movement.
            </p>
          </RevealBlock>
        </section>

        <section className="redesign-section border-t border-border">
          <span className="t-eyebrow text-olive">RevealBlock, stagger base</span>
          <RevealBlock stagger="base" className="mt-8 flex flex-col gap-4">
            <p className="t-body">First child, rises first.</p>
            <p className="t-body">Second child, 0.08s later.</p>
            <p className="t-body">Third child, 0.16s later.</p>
            <p className="t-body">Fourth child, 0.24s later.</p>
          </RevealBlock>
        </section>

        <section className="redesign-section border-t border-border">
          <span className="t-eyebrow text-olive">Marquee, two directions</span>
          <div className="mt-8 flex flex-col gap-6">
            <Marquee ariaLabel="Demo ticker, left">
              {['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT'].map((w) => (
                <span key={w} className="t-eyebrow px-8 text-dark">
                  {w}
                </span>
              ))}
            </Marquee>
            <Marquee ariaLabel="Demo ticker, right" reverse speed={55}>
              {['GOLF', 'HOTEL', 'INDIA', 'JULIET', 'KILO', 'LIMA'].map((w) => (
                <span key={w} className="t-eyebrow px-8 text-dark">
                  {w}
                </span>
              ))}
            </Marquee>
          </div>
        </section>

        <section className="redesign-section border-t border-border">
          <span className="t-eyebrow text-olive">CountUp</span>
          <div className="mt-8 flex flex-wrap gap-16">
            <p className="t-display">
              <CountUp value={2790} suffix="+" />
            </p>
            <p className="t-display">
              <CountUp value={12} />
            </p>
          </div>
        </section>

        <section className="redesign-section border-t border-border">
          <span className="t-eyebrow text-olive">ScrubScale</span>
          <ScrubScale className="mt-8 h-[60vh] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/healinghands.jpg"
              alt="Two open hands held out with the palms up, a faint band of prism light resting across them."
              className="h-full w-full object-cover"
            />
          </ScrubScale>
        </section>

        <section className="redesign-section border-t border-border">
          <span className="t-eyebrow text-olive">Hover and focus, CSS only</span>
          <div className="mt-8 flex flex-wrap items-center gap-8">
            <a href="#top" className="link-wipe t-body text-olive">
              Underline wipes in from the left
            </a>
            <button type="button" className="btn-primary btn-fill">
              Fill from the bottom
            </button>
          </div>
        </section>
      </main>

      {/* StickyStack breaks the container on purpose: it pins full-bleed. */}
      <section className="border-t border-border">
        <div className="redesign-container">
          <StickyStack
            className="min-h-[60vh]"
            states={[
              <Panel key="1" n="01" label="Pinned, first state." />,
              <Panel key="2" n="02" label="Crossfades on scrub." />,
              <Panel key="3" n="03" label="Unpins after the last one." />,
            ]}
          />
        </div>
      </section>

      <section className="redesign-container redesign-section border-t border-border">
        <p className="t-body">
          End of scratch route. If this scrolled smoothly and nothing jumped, the
          system is wired correctly.
        </p>
      </section>
    </>
  )
}
