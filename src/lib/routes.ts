// Discovery route constants. The category/city namespaces are fixed by D12.
//
// The discovery landing is NO LONGER mount-portable. It stays at /explore
// permanently. The marketing landing page is a separate page, built at
// /welcome, and it is the one that takes / at launch: with a thin initial
// roster a browse index is the wrong front door for a first-time visitor, so
// the two pages do two different jobs rather than one page doing both.
export const DISCOVERY_HOME = '/explore'

// Fixed D12 namespace.
export const categoryPath = (slug: string) => `/explore/${slug}`
