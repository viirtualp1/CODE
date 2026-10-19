export type PuzzleLanguage = 'en' | 'ru'
export const alphabets = { en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ru: 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ' } as const
export const alphabetFor = (language: PuzzleLanguage = 'en') => alphabets[language]
