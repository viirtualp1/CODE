export const destinations = { home: '/', game: '/play', menu: '/menu', library: '/collection', help: '/help', settings: '/settings', updates: '/updates' } as const
export type Destination = keyof typeof destinations
export function destinationFor(pathname: string): Destination {
  const path = pathname.replace(/\/+$/, '') || '/'
  return (Object.keys(destinations) as Destination[]).find(key => destinations[key] === path) ?? 'home'
}
export function isSecondary(destination: Destination) { return !['home', 'game', 'menu'].includes(destination) }

/** Keep old shared/bookmarked links working, then remove the fragment on launch. */
export function launchDestination(pathname: string, hash: string): Destination {
  return destinationFor(hash.startsWith('#/') ? hash.slice(1) : pathname)
}
