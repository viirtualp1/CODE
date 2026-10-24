import hosting from '../../vercel.json'
import { describe, expect, it } from 'vitest'
import { destinationFor, destinations, isSecondary, launchDestination } from './routes'
describe('local navigation', () => {
  it('opens Home for first launches and unknown/dead links', () => {
    expect(destinationFor('')).toBe('home')
    expect(destinationFor('/')).toBe('home')
    expect(destinationFor('/unknown')).toBe('home')
  })
  it('migrates old fragment links into clean paths and accepts trailing slashes', () => {
    for (const [destination, path] of Object.entries(destinations)) {
      expect(launchDestination('/', '#' + path)).toBe(destination)
      expect(destinationFor(path + '/')).toBe(destination)
      expect(path).not.toContain('#')
    }
    expect(launchDestination('/settings', '')).toBe('settings')
  })
  it('configures direct-load HTML rewrites only for application paths', () => {
    for (const path of Object.values(destinations).filter(path => path !== '/')) {
      expect(hosting.rewrites).toContainEqual({ source: path, destination: '/index.html' })
      expect(hosting.headers.find(rule => rule.source === path)?.headers[0]?.value).toContain('no-cache')
    }
    expect(hosting.rewrites.every(rule => Object.values(destinations).some(path => path === rule.source))).toBe(true)
  })
  it('keeps game, drawer, tutorial and Settings distinct and deep-linkable', () => {
    for (const [destination, path] of Object.entries(destinations)) expect(destinationFor(path)).toBe(destination)
    expect(isSecondary('home')).toBe(false)
    expect(isSecondary('game')).toBe(false)
    expect(isSecondary('menu')).toBe(false)
    expect(isSecondary('help')).toBe(true)
    expect(isSecondary('settings')).toBe(true)
  })
})
