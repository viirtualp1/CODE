import { createI18n } from 'vue-i18n'
import en from './en.json'
import ru from './ru.json'
export type Locale = 'en' | 'ru'
export const isLocale = (value: unknown): value is Locale => value === 'en' || value === 'ru'
export function deviceLocale(): Locale { return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en' }
export const i18n = createI18n({ legacy: false, locale: deviceLocale(), fallbackLocale: 'en', flatJson: true, messages: { en, ru } })
export const t = i18n.global.t
