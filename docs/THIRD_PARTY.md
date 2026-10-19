# Third-party materials

Application dependencies are declared in package.json and reproducibly resolved by package-lock.json. npm distributes their upstream licenses. No remote font, image, quote or analytics service is used.

- **Manrope**, interface font: SIL Open Font License 1.1; bundled via @fontsource/manrope. Upstream license retained in docs/licenses/Manrope.txt.
- **Noto Serif**, Russian editorial font: SIL Open Font License 1.1; bundled Cyrillic regular/italic via @fontsource/noto-serif. Upstream license retained in docs/licenses/NotoSerif.txt.
- **Newsreader**, editorial font: SIL Open Font License 1.1; bundled via @fontsource/newsreader. Upstream license retained in docs/licenses/Newsreader.txt.
- **Lucide**, interface icons: ISC license; bundled as Vue components. License retained in docs/licenses/Lucide.txt.
- **Vue I18n**, localization: MIT license, installed through npm; translations ship inside the app.
- Quotes: see CONTENT.md, src/data/puzzles.ts and src/data/russian-quotes.ts for original works, sources and reuse rationale.

The CODE logomark is drawn specifically for this project as public/icon.svg; PNG installation icons are raster versions of that source.

## Editorial frequency data

Developer-only scripts/lexicons/en.tsv and ru.tsv derive from wordfreq by Robyn Speer, source commit 912caf64b657478d1dff1138efdc078947d54bb1. Data license: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Retain the upstream NOTICE and acknowledgements to Google Books Ngrams, Wikipedia, Leeds, ParaCrawl, OpenSubtitles and the freely available SUBTLEX data by Marc Brysbaert et al. Filtering, provenance and checksums are recorded in scripts/lexicons/README.md. This license applies to the derived data, not CODE source. The lists are excluded from the production app. No wordfreq Python dependency is required to run or build CODE.
