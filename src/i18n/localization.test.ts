import { afterEach, describe, expect, it } from 'vitest'
import { i18n } from './index'
import en from './en.json'
import ru from './ru.json'
import releases from '../data/releases.json'

const keys = (value: Record<string, unknown>, prefix = ''): string[] => Object.entries(value).flatMap(([key, item]) => typeof item === 'string' ? [prefix + key] : keys(item as Record<string, unknown>, prefix + key + '.'))
afterEach(() => { i18n.global.locale.value = 'en' })
describe('complete offline localization', () => {
  it('provides the same messages, including interpolation, in both languages', () => {
    const english = keys(en), russian = keys(ru)
    expect(russian.sort()).toEqual(english.sort())
    for (const locale of ['en', 'ru'] as const) {
      i18n.global.locale.value = locale
      for (const key of english) {
        const result = i18n.global.t(key, { number: 12, letter: locale === 'ru' ? 'Ё' : 'E', symbol: 3, count: 2 })
        expect(result.trim()).not.toBe('')
        expect(result).not.toBe(key)
        expect(result).not.toMatch(/\{\w+\}/)
      }
    }
    i18n.global.locale.value = 'ru'
    expect(i18n.global.t('duplicate', { letter: 'Ё', symbol: 33 })).toContain('Ё')
    expect(i18n.global.t('duplicate', { letter: 'Ё', symbol: 33 })).toContain('33')
  })
  it('includes Russian notes for every historical version, not just the latest', () => {
    for (const release of releases) {
      expect(release.ru.title.trim()).not.toBe('')
      expect(release.ru.changes).toHaveLength(release.changes.length)
      expect(release.ru.changes.every(line => line.trim().length > 0)).toBe(true)
    }
  })
})
