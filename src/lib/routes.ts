// Discovery route constants. The category/city namespaces are fixed by D12;
// only the discovery LANDING is mount-portable — it lives at /explore now and
// becomes / when the holding page retires. Swapping it is a one-line change
// here; nothing else references the landing path directly.
export const DISCOVERY_HOME = '/explore'

// Fixed D12 namespace (does NOT move when the landing does).
export const categoryPath = (slug: string) => `/explore/${slug}`
