---
name: anki
description: Read and write the user's live Anki collection via the bundled `anki` CLI — turn lecture notes, PDFs and slide decks into spaced-repetition cards, run drill sessions on what is due, and grade the answers back into Anki so the scheduler stays honest. Use this whenever the user mentions Anki, flashcards, cards, decks, cloze, "quiz me", "drill me", "interrogami", "fammi ripetere", revision, spaced repetition, or asks to study/review any material they have just read or written. Also use it when they say a topic is not sticking, or when a study session ends and the weak points should be captured. Prefer this over writing cards into a chat message — cards typed into a conversation are lost.
---

# Anki

The collection is the source of truth, not this conversation. Anything worth
remembering goes into a card before the session ends.

## Setup check

Run `ankicli ping` once per session before anything else. If it fails, Anki is
closed or the AnkiConnect add-on (code `2055492159`) is missing — say so and
stop. Do not fake card creation.

`ankicli models` shows the note types actually installed. Field names differ on
localised collections; if `Basic`/`Cloze` are absent, pass `--model` per note
in the batch JSON rather than guessing.

## Writing cards

**Always use `batch`, never a loop of `add`.** Build the JSON, pipe it in, one
call:

```bash
ankicli batch cards.json -d "Patofisio::Shock" --tags "corso2026 lezione12"
ankicli batch - -d Deck --dry-run < cards.json   # review before committing
```

Schema — a list of objects, `type` inferred from the fields present:

```json
[
  {"type": "cloze", "text": "Nello shock settico le SVR sono {{c1::ridotte}} e la portata {{c2::aumentata}}.", "extra": "Shock distributivo", "tags": ["shock"]},
  {"type": "basic", "front": "Perché la riperfusione peggiora il danno?", "back": "Burst di ROS + complemento + sequestro neutrofilo.", "tags": "ischemia"}
]
```

`--dry-run` needs no running Anki, so draft freely and show the user the list
before it lands. Duplicates are rejected by the collection, not silently
merged; the command reports what it skipped.

### Rules for the cards themselves

- **One fact per card.** If the answer contains "and", it is two cards.
- **Cloze for mechanisms, basic for "why".** Chains of causation cloze well;
  reasoning that needs a sentence of explanation does not.
- **Never cloze a whole clause.** `{{c1::ridotte}}` is a card;
  `{{c1::le SVR sono ridotte e la portata aumentata}}` is a fill-in-the-blank
  paragraph that tests nothing.
- **Keep the user's language and terminology exactly as they wrote it** —
  Italian, French, or the mix their course uses. Do not translate technical
  terms into English, and do not "correct" a professor's phrasing.
- Test understanding, not formatting recognition. A card answerable from
  sentence shape alone is worse than no card.
- Tag by course and lecture (`--tags`) so drills can be scoped later.

## Drill sessions

```bash
ankicli due -d "Patofisio" -n 15          # cardId, deck, Q, A — truncated
ankicli due -d "Patofisio" -n 15 --full   # untruncated
ankicli due --new                          # include unseen cards
```

The loop: pull due cards, ask **one at a time**, wait for the answer, judge it,
then grade it back:

```bash
ankicli answer 1712345678901 -e 3          # 1 again  2 hard  3 good  4 easy
ankicli answer <id1> <id2> <id3> -e 3      # batch same ease
```

Grade what the user actually produced, not what they meant. A recalled fact
with the mechanism missing is `2`, not `3`. Never grade a card the user did not
answer, and never grade generously to be encouraging — a corrupted scheduler
costs them weeks.

For oral-exam subjects, ask the card's question and then push one level past
it: "and why does that follow?" Grade on the card, remark on the rest.

When the user misses something, write a new card on the specific gap in the
same session and tag it so it can be found again:

```bash
ankicli tag "deck:Patofisio tag:shock" debole
ankicli find "tag:debole" -n 20
ankicli suspend "tag:ritirato"
```

## Context economy

Output is deliberately terse because it all lands in the context window.
Do not re-run `ankicli decks` or `ankicli due` to "check" — read what you already
have. Narrow with the query language instead of pulling more rows:
`deck:"X" is:due -tag:sospeso`, `prop:due<=2`, `rated:1:1` (answered *again*
today), `is:new added:7`. Full syntax is Anki's own search grammar.

`ankicli sync` at the end of a session if the user syncs to AnkiWeb. It returns
as soon as Anki accepts the request, which is not the same as the sync
completing — a modal dialog open in Anki will silently queue it.
