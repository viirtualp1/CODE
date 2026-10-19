# Editorial frequency lists

Derived from wordfreq, Copyright 2022 Robyn Speer, source commit `912caf64b657478d1dff1138efdc078947d54bb1` (language usage through approximately 2021).

Source: https://github.com/rspeer/wordfreq/tree/912caf64b657478d1dff1138efdc078947d54bb1/wordfreq/data

Data license: **CC BY-SA 4.0**, https://creativecommons.org/licenses/by-sa/4.0/ . This license applies to these derived TSV lists, not to CODE source. Retain NOTICE-wordfreq.md and the upstream attribution to Google Books Ngrams, Wikipedia, Leeds, ParaCrawl, OpenSubtitles and the freely available SUBTLEX data by Marc Brysbaert et al. The upstream code license is retained separately.

Changes: filtered to English/Russian letter tokens (plus English apostrophes), uppercased, maximum 16 characters, Zipf frequency at least 3.0; standalone letters restricted to normal grammatical words. TSV columns are token and Zipf frequency. Е/Ё remain distinct. No quote-specific words were inserted. These are broad frequency lists, not exhaustive dictionaries or a proof that a sentence has a unique solution. Only short, high-frequency words with at most two unknown symbols can drive the Easy audit.

Original compressed source SHA-256:
- large_en.msgpack.gz: dffae8066b78dce0a6667cf5f58e567054f902674667090a7ac8a8a44628b05c
- large_ru.msgpack.gz: 0440613cc765c14a20fb9483225f2fec4d85e66672809076bcec9b29119f9b43

These lists are used by developer audits/tests only and are not imported into the application bundle. Run npm run content:audit. No network is used by that command.
