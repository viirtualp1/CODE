# Sample content provenance

The collection bundles 100 English and 100 original Russian literary excerpts. The original sixteen English entries are documented below; the 0.3.0 Russian and 0.3.1 expansion sections complete the current corpus. Each data record includes its direct catalogue source, reuse rationale, work/date, explicit clue set and rationale. Source text was checked against Project Gutenberg's primary transcriptions on 19 October 2026. No modern translation is used.

| Puzzle | Work | Source passage |
| --- | --- | --- |
| 001 | Jane Austen, Emma (1815) | [Text, search “no charm equal”](https://www.gutenberg.org/cache/epub/158/pg158-images.html) |
| 002 | William Shakespeare, Hamlet (1603), IV.v | [Text, search “know what we are”](https://www.gutenberg.org/cache/epub/1524/pg1524-images.html) |
| 003 | Louisa May Alcott, Little Women (1868–1869) | [Text, search “not afraid of storms”](https://www.gutenberg.org/cache/epub/514/pg514-images.html) |
| 004 | Lewis Carroll, Alice’s Adventures in Wonderland (1865) | [Text, search “no use going back”](https://www.gutenberg.org/cache/epub/11/pg11-images.html) |
| 005 | Oscar Wilde, The Soul of Man Under Socialism (1891) | [Text, search “rarest thing”](https://www.gutenberg.org/cache/epub/1017/pg1017-images.html) |
| 006 | Henry David Thoreau, Walden (1854) | [Text, search “give me truth”](https://www.gutenberg.org/cache/epub/205/pg205-images.html) |

Editorial normalization: uppercase at encoding time; straight apostrophes for contraction input; sentence fragments start with a capital and end with a period. Hamlet omits the preceding vocative “Lord,”; the Alcott and Carroll excerpts preserve contractions. Austen's quoted clause is terminated with a period instead of the dialogue comma. Original meanings and letter sequences are retained.

These editions are listed as public domain in the US. The originals are also old enough to be strong candidates in standard life-plus-70 jurisdictions, but release jurisdiction review remains a later content gate. The application reproduces brief original passages, not Gutenberg wrappers, illustrations, summaries or trademarks. Sources remain available in data and this document for independent review. Nothing contacts Gutenberg at runtime.


## Added in 0.2.3

The original 001–006 IDs, text, clues and revisions remain unchanged. The ten additions below were checked against the linked primary transcriptions on 19 October 2026. Each has an explicit clue set and rationale in src/data/puzzles.ts; difficulty remains editorial, without a solver certification.

| Puzzle | Work | Source passage |
| --- | --- | --- |
| 007 | Jane Austen, Pride and Prejudice (1813), XI | [Text, search “no enjoyment like reading”](https://www.gutenberg.org/cache/epub/1342/pg1342-images.html) |
| 008 | Charlotte Brontë, Jane Eyre (1847), XXIII | [Text, search “I am no bird”](https://www.gutenberg.org/cache/epub/1260/pg1260-images.html) |
| 009 | Charles Dickens, Great Expectations (1861), XIX | [Text, search “ashamed of our tears”](https://www.gutenberg.org/cache/epub/1400/pg1400-images.html) |
| 010 | Ralph Waldo Emerson, Essays: Circles (1841) | [Text, search “Nothing great was ever achieved”](https://www.gutenberg.org/cache/epub/16643/pg16643-images.html) |
| 011 | Herman Melville, Moby-Dick (1851), XII | [Text, search “true places never are”](https://www.gutenberg.org/cache/epub/2701/pg2701-images.html) |
| 012 | Mary Shelley, Frankenstein (1831 revision), XXIII | [Text, search “great and sudden change”](https://www.gutenberg.org/cache/epub/84/pg84-images.html) |
| 013 | Mark Twain, The Adventures of Tom Sawyer (1876), II | [Text, search “Work consists”](https://www.gutenberg.org/cache/epub/74/pg74-images.html) |
| 014 | Frances Hodgson Burnett, The Secret Garden (1911), XXVII | [Text, search “thistle cannot grow”](https://www.gutenberg.org/cache/epub/113/pg113-images.html) |
| 015 | Arthur Conan Doyle, The Boscombe Valley Mystery (1891), collected 1892 | [Text, search “deceptive than an obvious fact”](https://www.gutenberg.org/cache/epub/1661/pg1661-images.html) |
| 016 | Oscar Wilde, The Picture of Dorian Gray (1891 edition), II | [Text, search “only way to get rid”](https://www.gutenberg.org/cache/epub/174/pg174-images.html) |

Editorial boundaries: 007 preserves the sentence and exclamation; 008 ends at the first ME clause, replacing its semicolon with a period; 009 extracts the contiguous WE–TEARS clause, capitalizes its opening and replaces the following comma with a period; 013 extracts the WORK–DO clause, replacing the following comma with a period. For 014, two verse lines are joined by a space and the second line's initial A is lowercased. Other additions preserve the sourced sentence punctuation. No words are spliced, translated or modernized.

All new passages are from original English works published by 1911; the latest author death is Doyle in 1930. Reuse notes remain attached to each record. The same jurisdiction-review gate above applies; no modern translations or editorial introductions are copied.


## Russian originals — 0.3.0

Twelve native Russian excerpts form a separate collection, numbered 001–012 within that language. They are original works, not translations of the English puzzles. Sources were checked against the linked primary transcriptions on 19 October 2026. Each record in src/data/russian-quotes.ts includes its own clue selection/rationale, author/work/date and exact editorial boundary. Date is the first publication year of the original work/excerpt. All authors died by 1910 and originals were published before 1931; no modern notes, introductions, illustrations or translations are reproduced. The existing jurisdiction-review gate still applies.

| Russian puzzle | Work | Source |
| --- | --- | --- |
| 001 | Александр Пушкин, Зимнее утро (1830) | [Original text](https://ru.wikisource.org/wiki/%D0%97%D0%B8%D0%BC%D0%BD%D0%B5%D0%B5_%D1%83%D1%82%D1%80%D0%BE_%28%D0%9F%D1%83%D1%88%D0%BA%D0%B8%D0%BD%29) |
| 002 | Михаил Лермонтов, Парус (1841) | [Original text](https://ru.wikisource.org/wiki/%D0%9F%D0%B0%D1%80%D1%83%D1%81_%28%D0%9B%D0%B5%D1%80%D0%BC%D0%BE%D0%BD%D1%82%D0%BE%D0%B2%29) |
| 003 | Александр Грибоедов, Горе от ума · Действие I (1825) | [Original text](https://ru.wikisource.org/wiki/%D0%93%D0%BE%D1%80%D0%B5_%D0%BE%D1%82_%D1%83%D0%BC%D0%B0_%28%D0%93%D1%80%D0%B8%D0%B1%D0%BE%D0%B5%D0%B4%D0%BE%D0%B2%29/%D0%9F%D0%A1%D0%A1_1911_%28%D0%92%D0%A2%29/%D0%94%D0%B5%D0%B9%D1%81%D1%82%D0%B2%D0%B8%D0%B5_I) |
| 004 | Лев Толстой, Анна Каренина · Часть I, глава I (1875) | [Original text](https://ru.wikisource.org/wiki/%D0%90%D0%BD%D0%BD%D0%B0_%D0%9A%D0%B0%D1%80%D0%B5%D0%BD%D0%B8%D0%BD%D0%B0_%28%D0%A2%D0%BE%D0%BB%D1%81%D1%82%D0%BE%D0%B9%29/%D0%A7%D0%B0%D1%81%D1%82%D1%8C_I/%D0%93%D0%BB%D0%B0%D0%B2%D0%B0_I) |
| 005 | Афанасий Фет, Я пришёл к тебе с приветом (1843) | [Original text](https://ru.wikisource.org/wiki/%D0%AF_%D0%BF%D1%80%D0%B8%D1%88%D1%91%D0%BB_%D0%BA_%D1%82%D0%B5%D0%B1%D0%B5_%D1%81_%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82%D0%BE%D0%BC_%28%D0%A4%D0%B5%D1%82%29) |
| 006 | Иван Крылов, Квартет (1811) | [Original text](https://ru.wikisource.org/wiki/%D0%9A%D0%B2%D0%B0%D1%80%D1%82%D0%B5%D1%82_%28%D0%9A%D1%80%D1%8B%D0%BB%D0%BE%D0%B2%29) |
| 007 | Николай Гоголь, Мёртвые души · Том I, глава XI (1842) | [Original text](https://ru.wikisource.org/wiki/%D0%9C%D1%91%D1%80%D1%82%D0%B2%D1%8B%D0%B5_%D0%B4%D1%83%D1%88%D0%B8_%28%D0%93%D0%BE%D0%B3%D0%BE%D0%BB%D1%8C%29/%D0%A2%D0%BE%D0%BC_I/%D0%93%D0%BB%D0%B0%D0%B2%D0%B0_XI) |
| 008 | Антон Чехов, Дядя Ваня · Действие II (1897) | [Original text](https://ru.wikisource.org/wiki/%D0%94%D1%8F%D0%B4%D1%8F_%D0%92%D0%B0%D0%BD%D1%8F_%28%D0%A7%D0%B5%D1%85%D0%BE%D0%B2%29/%D0%94%D0%B5%D0%B9%D1%81%D1%82%D0%B2%D0%B8%D0%B5_%D0%B2%D1%82%D0%BE%D1%80%D0%BE%D0%B5) |
| 009 | Александр Пушкин, Я вас любил (1830) | [Original text](https://ru.wikisource.org/wiki/%D0%AF_%D0%B2%D0%B0%D1%81_%D0%BB%D1%8E%D0%B1%D0%B8%D0%BB:_%D0%BB%D1%8E%D0%B1%D0%BE%D0%B2%D1%8C_%D0%B5%D1%89%D1%91%2C_%D0%B1%D1%8B%D1%82%D1%8C_%D0%BC%D0%BE%D0%B6%D0%B5%D1%82_%28%D0%9F%D1%83%D1%88%D0%BA%D0%B8%D0%BD%29) |
| 010 | Фёдор Тютчев, Silentium! (1833) | [Original text](https://ru.wikisource.org/wiki/Silentium%21_%28%D0%A2%D1%8E%D1%82%D1%87%D0%B5%D0%B2%29/%D0%9F%D0%A1%D0%A1_1987_%28%D0%A1%D0%9E%29) |
| 011 | Михаил Лермонтов, И скучно и грустно (1840) | [Original text](https://ru.wikisource.org/wiki/%D0%98_%D1%81%D0%BA%D1%83%D1%87%D0%BD%D0%BE_%D0%B8_%D0%B3%D1%80%D1%83%D1%81%D1%82%D0%BD%D0%BE_%28%D0%9B%D0%B5%D1%80%D0%BC%D0%BE%D0%BD%D1%82%D0%BE%D0%B2%29) |
| 012 | Александр Пушкин, Зимнее утро (1830) | [Original text](https://ru.wikisource.org/wiki/%D0%97%D0%B8%D0%BC%D0%BD%D0%B5%D0%B5_%D1%83%D1%82%D1%80%D0%BE_%28%D0%9F%D1%83%D1%88%D0%BA%D0%B8%D0%BD%29) |

Poem line breaks become spaces and line-initial capitals inside the excerpt become lowercase. Boundaries are contiguous; a trailing comma/semicolon/dash/ellipsis is replaced by a period where documented in the data. Chekhov’s все is written всё by meaning; Ё in Fet/Pushkin is preserved. Е and Ё are independent cipher letters and keys. No other spelling is modernized, and no text from different passages is spliced. Sources and rationale remain development metadata, available for audit without a runtime request.

## Expanded collections — 0.3.1

The app now includes 100 English and 100 Russian puzzles. Previously published records and their cipher mappings are unchanged. The two expansion JSON files contain the complete per-excerpt provenance, original work/edition date, explicit clues and editorial rationale. New excerpts were checked against original-language primary transcriptions; no quotation aggregation site or modern translation was used. English typography/paragraph marks are normalized; Russian verse lines are joined, line-initial case and boundary punctuation are normalized, and modern Е/Ё spelling is restored. Words remain verbatim. Some puzzles are contiguous literary clauses or verse excerpts rather than complete prose sentences.

Selection excluded long opaque proper names and unsupported symbols. An initial 360×640 browser pass identified crowded excerpts; these were shortened at clause boundaries or replaced with shorter sentences from the same book. Maximum word length is now 12 letters, tested intact rather than split. Clues are explicit editorial anchors crossing several words and/or repeated structures. Difficulty is not calibrated by a solver, and no uniqueness claim is made.

Added sources:

| Collection | Work | Added excerpts | Source |
| --- | --- | ---: | --- |
| English | Alice’s Adventures in Wonderland | 12 | [Original text](https://www.gutenberg.org/ebooks/11) |
| English | The Adventures of Sherlock Holmes | 10 | [Original text](https://www.gutenberg.org/ebooks/1661) |
| English | The Adventures of Tom Sawyer | 9 | [Original text](https://www.gutenberg.org/ebooks/74) |
| English | Essays | 9 | [Original text](https://www.gutenberg.org/ebooks/16643) |
| English | Frankenstein | 10 | [Original text](https://www.gutenberg.org/ebooks/84) |
| English | Pride and Prejudice | 8 | [Original text](https://www.gutenberg.org/ebooks/1342) |
| English | The Secret Garden | 9 | [Original text](https://www.gutenberg.org/ebooks/113) |
| English | Little Women | 9 | [Original text](https://www.gutenberg.org/ebooks/514) |
| English | The Picture of Dorian Gray | 4 | [Original text](https://www.gutenberg.org/ebooks/174) |
| English | Emma | 3 | [Original text](https://www.gutenberg.org/ebooks/158) |
| English | Walden | 1 | [Original text](https://www.gutenberg.org/ebooks/205) |
| Russian | Зимнее утро | 5 | [Original text](https://ru.wikisource.org/wiki/%D0%97%D0%B8%D0%BC%D0%BD%D0%B5%D0%B5_%D1%83%D1%82%D1%80%D0%BE_%28%D0%9F%D1%83%D1%88%D0%BA%D0%B8%D0%BD%29) |
| Russian | Зимний вечер | 7 | [Original text](https://ru.wikisource.org/wiki/%D0%97%D0%B8%D0%BC%D0%BD%D0%B8%D0%B9_%D0%B2%D0%B5%D1%87%D0%B5%D1%80_%28%D0%9F%D1%83%D1%88%D0%BA%D0%B8%D0%BD%29) |
| Russian | Узник | 4 | [Original text](https://ru.wikisource.org/wiki/%D0%A3%D0%B7%D0%BD%D0%B8%D0%BA_%28%D0%9F%D1%83%D1%88%D0%BA%D0%B8%D0%BD%29) |
| Russian | Зимняя дорога | 5 | [Original text](https://ru.wikisource.org/wiki/%D0%97%D0%B8%D0%BC%D0%BD%D1%8F%D1%8F_%D0%B4%D0%BE%D1%80%D0%BE%D0%B3%D0%B0_%28%D0%9F%D1%83%D1%88%D0%BA%D0%B8%D0%BD%29) |
| Russian | Няне | 4 | [Original text](https://ru.wikisource.org/wiki/%D0%9D%D1%8F%D0%BD%D0%B5_%28%D0%9F%D1%83%D1%88%D0%BA%D0%B8%D0%BD%29) |
| Russian | Я помню чудное мгновенье | 6 | [Original text](https://ru.wikisource.org/wiki/%D0%AF_%D0%BF%D0%BE%D0%BC%D0%BD%D1%8E_%D1%87%D1%83%D0%B4%D0%BD%D0%BE%D0%B5_%D0%BC%D0%B3%D0%BD%D0%BE%D0%B2%D0%B5%D0%BD%D1%8C%D0%B5_%28%D0%9F%D1%83%D1%88%D0%BA%D0%B8%D0%BD%29) |
| Russian | Туча | 4 | [Original text](https://ru.wikisource.org/wiki/%D0%A2%D1%83%D1%87%D0%B0_%28%D0%9F%D1%83%D1%88%D0%BA%D0%B8%D0%BD%29) |
| Russian | Парус | 4 | [Original text](https://ru.wikisource.org/wiki/%D0%9F%D0%B0%D1%80%D1%83%D1%81_%28%D0%9B%D0%B5%D1%80%D0%BC%D0%BE%D0%BD%D1%82%D0%BE%D0%B2%29) |
| Russian | И скучно и грустно | 4 | [Original text](https://ru.wikisource.org/wiki/%D0%98_%D1%81%D0%BA%D1%83%D1%87%D0%BD%D0%BE_%D0%B8_%D0%B3%D1%80%D1%83%D1%81%D1%82%D0%BD%D0%BE_%28%D0%9B%D0%B5%D1%80%D0%BC%D0%BE%D0%BD%D1%82%D0%BE%D0%B2%29) |
| Russian | Бородино | 10 | [Original text](https://ru.wikisource.org/wiki/%D0%91%D0%BE%D1%80%D0%BE%D0%B4%D0%B8%D0%BD%D0%BE_%28%D0%9B%D0%B5%D1%80%D0%BC%D0%BE%D0%BD%D1%82%D0%BE%D0%B2%29) |
| Russian | Тучи | 3 | [Original text](https://ru.wikisource.org/wiki/%D0%A2%D1%83%D1%87%D0%B8_%28%D0%9B%D0%B5%D1%80%D0%BC%D0%BE%D0%BD%D1%82%D0%BE%D0%B2%29) |
| Russian | Утёс | 2 | [Original text](https://ru.wikisource.org/wiki/%D0%A3%D1%82%D1%91%D1%81_%28%D0%9B%D0%B5%D1%80%D0%BC%D0%BE%D0%BD%D1%82%D0%BE%D0%B2%29) |
| Russian | Листок | 6 | [Original text](https://ru.wikisource.org/wiki/%D0%9B%D0%B8%D1%81%D1%82%D0%BE%D0%BA_%28%D0%9B%D0%B5%D1%80%D0%BC%D0%BE%D0%BD%D1%82%D0%BE%D0%B2%29) |
| Russian | Я пришёл к тебе с приветом | 4 | [Original text](https://ru.wikisource.org/wiki/%D0%AF_%D0%BF%D1%80%D0%B8%D1%88%D1%91%D0%BB_%D0%BA_%D1%82%D0%B5%D0%B1%D0%B5_%D1%81_%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82%D0%BE%D0%BC_%28%D0%A4%D0%B5%D1%82%29) |
| Russian | Это утро, радость эта | 4 | [Original text](https://ru.wikisource.org/wiki/%D0%AD%D1%82%D0%BE_%D1%83%D1%82%D1%80%D0%BE%2C_%D1%80%D0%B0%D0%B4%D0%BE%D1%81%D1%82%D1%8C_%D1%8D%D1%82%D0%B0_%28%D0%A4%D0%B5%D1%82%29) |
| Russian | Ласточки пропали | 4 | [Original text](https://ru.wikisource.org/wiki/%D0%9B%D0%B0%D1%81%D1%82%D0%BE%D1%87%D0%BA%D0%B8_%D0%BF%D1%80%D0%BE%D0%BF%D0%B0%D0%BB%D0%B8_%28%D0%A4%D0%B5%D1%82%29) |
| Russian | Квартет | 2 | [Original text](https://ru.wikisource.org/wiki/%D0%9A%D0%B2%D0%B0%D1%80%D1%82%D0%B5%D1%82_%28%D0%9A%D1%80%D1%8B%D0%BB%D0%BE%D0%B2%29) |
| Russian | Ворона и Лисица | 3 | [Original text](https://ru.wikisource.org/wiki/%D0%92%D0%BE%D1%80%D0%BE%D0%BD%D0%B0_%D0%B8_%D0%9B%D0%B8%D1%81%D0%B8%D1%86%D0%B0_%28%D0%9A%D1%80%D1%8B%D0%BB%D0%BE%D0%B2%29) |
| Russian | Стрекоза и Муравей | 3 | [Original text](https://ru.wikisource.org/wiki/%D0%A1%D1%82%D1%80%D0%B5%D0%BA%D0%BE%D0%B7%D0%B0_%D0%B8_%D0%9C%D1%83%D1%80%D0%B0%D0%B2%D0%B5%D0%B9_%28%D0%9A%D1%80%D1%8B%D0%BB%D0%BE%D0%B2%29) |
| Russian | Лебедь, Щука и Рак | 2 | [Original text](https://ru.wikisource.org/wiki/%D0%9B%D0%B5%D0%B1%D0%B5%D0%B4%D1%8C%2C_%D0%A9%D1%83%D0%BA%D0%B0_%D0%B8_%D0%A0%D0%B0%D0%BA_%28%D0%9A%D1%80%D1%8B%D0%BB%D0%BE%D0%B2%29) |
| Russian | Зеркало и Обезьяна | 1 | [Original text](https://ru.wikisource.org/wiki/%D0%97%D0%B5%D1%80%D0%BA%D0%B0%D0%BB%D0%BE_%D0%B8_%D0%9E%D0%B1%D0%B5%D0%B7%D1%8C%D1%8F%D0%BD%D0%B0_%28%D0%9A%D1%80%D1%8B%D0%BB%D0%BE%D0%B2%29) |
| Russian | Ларчик | 1 | [Original text](https://ru.wikisource.org/wiki/%D0%9B%D0%B0%D1%80%D1%87%D0%B8%D0%BA_%28%D0%9A%D1%80%D1%8B%D0%BB%D0%BE%D0%B2%29) |

## Reviewed difficulty profiles — 0.4.0

No answers, excerpt boundaries, sources or numeric seeds changed. src/data/puzzles.ts retains publishedQuotes for compatibility, applies src/data/clue-profiles.json, and keeps each language at 100 stable positions. English: 20 Easy, 55 Medium, 25 Hard. Russian: 20 Easy, 50 Medium, 30 Hard. scripts/easy-selection.json records the explicit beginner and advanced selections; remaining entries are Medium. Poetry with obsolete forms, fragments depending on context, and vocabulary-heavy passages were excluded from the beginner selection. Famous text alone never earns an Easy label.

The 40 Easy clue sets are supersets of their previous givens and pass the independent common-word propagation route described in PUZZLE_ENGINE.md. Profiles store audit version/work/steps/anchor metadata; tests rerun the actual deductions against the broad independent TSVs rather than trusting these metadata. Old revision-1 sessions migrate explicitly to revision 2 without changing their answers. All other records remain revision 1. Medium/Hard labels still require human calibration; frequency/word patterns do not prove universal uniqueness.

Frequency data: Robyn Speer, wordfreq, pinned commit 912caf64b657478d1dff1138efdc078947d54bb1, derived lists under CC BY-SA 4.0. Attribution, source checksums, filtering and upstream NOTICE are in scripts/lexicons/README.md. Lists are used by tests/editorial tools only, not shipped in the game bundle and not fetched at runtime.
