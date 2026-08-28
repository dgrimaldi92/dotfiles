---
description: Sessione di ripetizione orale su un mazzo Anki
argument-hint: "<argomento> [n-carte]"
---
Oral exam drill session.

Topic: $1
Cards: ${2:-8}

**All output to the user is in Italian**, using the terminology of the
course. These instructions are in English; everything you say is in Italian.

## Setup

1. `ankicli ping`. If it fails, stop — Anki is closed.
2. `ankicli due -d "Patofisio::$1" -n ${2:-8} --new`. If nothing comes back,
   say so and stop. Do not look elsewhere for cards.

## The loop, per card

- Ask the `front` and **stop**. Wait for the answer. Do not anticipate, do
  not hint, do not show the `back`.
- Once answered, compare against the `back` and say what was omitted.
- Then one follow-up: "e perché ne consegue?", "cosa cambia se invece...".
  The grade covers the card; this is discussion.
- Grade with `ankicli answer <cardId> -e N`. 1 if they could not produce
  it, 2 if the fact was there but the mechanism was not, 3 if complete, 4
  only if immediate and precise. Grade what they actually said, not what
  they meant. Do not inflate to encourage — a corrupted scheduler costs
  them weeks.
- Then move to the next card.

## Rules

- Explain nothing that is not in the `back` or in the notes. If you cannot
  find it, say so rather than answering from memory.
- If they miss something no card covers, accumulate it. At the end of the
  session propose the new cards for `Patofisio::$1::debole` in a single
  `ankicli batch`.

At the end: two lines on what does not hold up.
