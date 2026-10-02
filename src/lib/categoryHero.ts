export type CategoryHero = {
  image: string
  text: string
  wordmark: { src: string; width: number; height: number }
}

// `wordmark` is the cream lettering rendered over the hero photograph in place
// of a visible H1 (the H1 survives as sr-only text). Files live in
// /public/images/categories/categories and are named for the category with
// spaces rather than hyphens ('ancient healing arts.png'), so the paths below
// are percent-encoded; two filenames on disk also carry a leading space
// (' Embodied.png', ' Intimate.png'), encoded as a leading %20.
//
// This replaces the previous /categories/*.png paths, which pointed at a
// directory that does not exist anywhere in /public -- every wordmark image
// on this page has been 404ing. journeys has no corresponding file in the
// new asset set (11 of 12 categories are covered); its path below is left
// pointing at the old, still-broken location rather than guessing a
// replacement -- flagged for a real asset.
//
// Intrinsic dimensions are carried explicitly so next/image can reserve the
// right box and the lettering never causes layout shift; they differ per file
// because each is the word set at a fixed cap height.
export const CATEGORY_HERO: Record<string, CategoryHero> = {
  'energy-healing': {
    image: '/images/categories/frequency.jpg',
    wordmark: { src: '/images/categories/categories/Energy%20HeAling.png', width: 5088, height: 457 },
    text: 'Work with the subtle body and the energy that moves through it. Reiki, sound healing, pranic healing, and the practices that shift what you cannot see but can absolutely feel. These modalities work with the body’s energetic field to release what is stuck and restore flow. Practitioners here come from many lineages and traditions, each bringing their own approach to the same essential work.',
  },
  journeys: {
    image: '/images/categories/Journeys.jpg',
    // No file for "journeys" in /public/images/categories/categories (11 of
    // 12 categories are covered) -- still pointing at the old, broken path.
    // Needs a real asset before this one renders.
    wordmark: { src: '/categories/journeys.png', width: 4503, height: 888 },
    text: 'For those ready to go inward and meet whatever is waiting there. Plant medicine, breathwork, psychedelic facilitation, and guided passage into the deeper layers of the self. These are not casual experiences. They ask for preparation, intention, and the right person holding space alongside you. The practitioners in this category are experienced guides who understand the terrain and how to move through it safely.',
  },
  readings: {
    image: '/images/categories/readings.jpg',
    wordmark: { src: '/images/categories/categories/readings.png', width: 2957, height: 457 },
    text: 'The map was always there, and these are the people who know how to read it. Astrology, tarot, human design, numerology, akashic records, and more. A good reading does not tell you what to do. It reflects something back, names a pattern you half-sensed, and gives you language for the moment you are in. Find someone whose practice resonates and whose insight you can actually use.',
  },
  'ancient-healing-arts': {
    image: '/images/categories/AncientHealingArts.jpg',
    wordmark: { src: '/images/categories/categories/ancient%20healing%20arts.png', width: 7117, height: 457 },
    text: 'Medicine that has been trusted and refined across centuries and cultures. Acupuncture, ayurveda, traditional Chinese medicine, cupping, and herbalism. These traditions understand the body as a whole system rather than a collection of symptoms. The practitioners here have trained deeply in their craft, often over many years, and bring both technical skill and a way of seeing that modern medicine often misses.',
  },
  consciousness: {
    image: '/images/categories/consciousness.jpg',
    wordmark: { src: '/images/categories/categories/Consciousness.png', width: 5062, height: 455 },
    text: 'Meet your own mind differently and learn what lives beneath the surface of it. Meditation, hypnotherapy, past life regression, dream work, and shamanic healing. These practices work with awareness itself, with the states we pass through and rarely stop to examine. The work can be subtle or profound. Find a practitioner who can guide you into the deeper states and back again with care.',
  },
  embodied: {
    image: '/images/categories/embodied.jpg',
    wordmark: { src: '/images/categories/categories/%20Embodied.png', width: 3212, height: 457 },
    text: 'The body keeps the score, and it also holds the way through. Somatic therapy, massage, bodywork, dance movement therapy, and yoga therapy. So much of what we carry lives in tissue and breath rather than thought. These practitioners work directly with the body to release held tension, restore safety, and reconnect you to a fuller sense of being present in your own skin.',
  },
  'natural-beauty': {
    image: '/images/categories/natural-beauty.jpg',
    wordmark: { src: '/images/categories/categories/Natural%20Beauty.png', width: 5367, height: 457 },
    text: 'Care that begins beneath the surface and works its way out. Holistic facials, gua sha, facial acupuncture, scalp care, and natural aesthetics. This is beauty understood as health rather than performance, ritual rather than routine. The practitioners here treat the skin and the face as part of the whole, using techniques that nourish and restore rather than simply cover or correct.',
  },
  family: {
    image: '/images/categories/family.jpg',
    wordmark: { src: '/images/categories/categories/Family.png', width: 1975, height: 459 },
    text: 'Held through the thresholds that change everything. Doulas, birth preparation, postpartum support, fertility support, and infant massage. These are some of the most tender and demanding passages a person moves through. The practitioners in this category specialize in holding families through them, offering steady presence and real expertise at exactly the moments when both matter most.',
  },
  creativity: {
    image: '/images/categories/creativity.jpg',
    wordmark: { src: '/images/categories/categories/Creativity.png', width: 3465, height: 455 },
    text: 'Make something true, and let the making change you. Art therapy, expressive arts, writing, music therapy, and creative practice as a path. Creativity here is not about producing or performing. It is a way into parts of yourself that words alone cannot reach. These practitioners use creative process as a form of healing, helping you express, release, and discover through the act of making.',
  },
  intimate: {
    image: '/images/categories/intimate.jpg',
    wordmark: { src: '/images/categories/categories/%20Intimate.png', width: 2689, height: 459 },
    text: 'Tender, honest work in the places most people avoid. Sexuality coaching, tantra, relationship coaching, and somatic sex therapy. These practitioners hold space for the conversations and the growth that intimacy asks of us. The work is done with care, consent, and deep respect for where you are. Find someone whose approach feels safe and whose presence you can trust with this.',
  },
  coaching: {
    image: '/images/categories/coaching.jpg',
    wordmark: { src: '/images/categories/categories/Coaching.png', width: 3298, height: 457 },
    text: 'A steady hand for whatever the next chapter asks of you. Life coaching, spiritual coaching, business coaching, nutrition coaching, and therapy. Sometimes you do not need a whole modality. You need a person who can see clearly, ask the right questions, and walk alongside you while you figure out the way forward. The practitioners here bring focus, accountability, and genuine care to that work.',
  },
  ceremony: {
    image: '/images/categories/ceremony.jpg',
    wordmark: { src: '/images/categories/categories/Ceremony.png', width: 3434, height: 457 },
    text: 'Mark what matters with intention and the right people present. Cacao ceremony, grief rituals, rites of passage, wedding ceremony, and death doula work. Ceremony gives shape to the moments that deserve more than to simply pass unmarked. These practitioners hold sacred space for transition and gathering, bringing structure and reverence to the thresholds that ask to be honored.',
  },
}
