import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
const source = readFileSync(new URL('./_tokens.scss', import.meta.url), 'utf8')
function luminance(hex: string) {
  const channels = hex.slice(1).match(/../g)!.map(channel => parseInt(channel, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  return channels[0]! * .2126 + channels[1]! * .7152 + channels[2]! * .0722
}
describe('semantic palette contrast', () => {
  for (const [name, block] of [['light', source.match(/:root \{([^}]+)\}/)![1]!], ['dark', source.match(/:root\[data-theme='dark'\] \{([^}]+)\}/)![1]!]]) {
    it(`${name} keeps regular text, numbers, selection, keyboard, actions and verdicts readable`, () => {
      const tokens = Object.fromEntries([...block!.matchAll(/--([\w-]+): (#[a-f0-9]{6});/g)].map(match => [match[1]!, match[2]!]))
      const pairs = [['ink', 'paper'], ['ink', 'surface'], ['muted', 'paper'], ['muted', 'key'], ['muted', 'selected'], ['accent', 'paper'], ['danger', 'paper'], ['danger', 'danger-surface'], ['success', 'paper'], ['on-action', 'action'], ['on-accent', 'accent']]
      for (const [foreground, background] of pairs) {
        const a = luminance(tokens[foreground!]!), b = luminance(tokens[background!]!)
        expect((Math.max(a, b) + .05) / (Math.min(a, b) + .05), `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5)
      }
    })
  }
})
