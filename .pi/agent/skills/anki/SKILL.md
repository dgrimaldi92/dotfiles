---
name: anki
description: Reads and writes the user's Anki collection through the `ankicli` CLI. Use whenever the conversation involves Anki, cards, flashcards, decks, spaced repetition, drilling, "interrogami", "fammi ripetere", or turning notes and exam questions into cards. Cards written into a chat message are lost — always go through the CLI.
---

# Anki

All user-facing output is in Italian. These instructions are in English.

Anki must be open: AnkiConnect runs inside the GUI, there is no headless
mode. Run `ankicli ping` first; if it fails, stop and say so. Never fake
card creation.

## Commands

```
ankicli ping
ankicli decks
ankicli batch FILE -d DECK [--mode dry-run|send]
ankicli due -d DECK [-n N] [--new]
ankicli answer CARDID -e 1|2|3|4
```

There are no other commands. Do not invent any.

## JSON schema

Two keys, nothing else. This is **not** AnkiConnect's schema: no
`modelName`, no `fields`, no `type`, no `tags`, no `extra`.

```json
[
  {"front": "Le fasi della cancerogenesi", "back": "Iniziazione: ... Promozione: ... Progressione: ..."}
]
```

Basic notes only. Never cloze: the exam is oral and discursive, and a
deletion trains recall of one word rather than exposition.

- `front` — the consegna the user speaks to
- `back` — the checklist of what a complete answer contains, not a
  paragraph to recite

`--mode dry-run` is the default and sends nothing: it builds, validates and
prints. It works with Anki closed. Always show the dry run and wait for
confirmation before `--mode send`.

## Organisation

One deck per topic: `Patofisio::Cancro`, `Patofisio::Shock`. No tags. Cards
that keep failing go in a `Patofisio::Cancro::debole` subdeck — `-d
Patofisio::Cancro` includes subdecks.

## Grading

`ankicli answer <cardId> -e N` — 1 not produced, 2 fact present but
mechanism missing, 3 complete, 4 immediate and precise. Grade what the user
said, not what they meant. Do not inflate: a corrupted scheduler costs them
weeks.
