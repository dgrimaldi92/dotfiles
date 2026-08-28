---
description: Genera carte Anki scomponendo le domande d'esame in punti
argument-hint: "<argomento> [file-appunti]"
---
Generate Anki cards for topic: $1

Sources:
- exam questions: `domande-esame.md`
- notes: ${2:-appunti/}

**All output to the user is in Italian.** These instructions are in English;
the cards, the point lists and everything you say are in Italian, using the
terminology of the notes. Never translate technical terms into English,
never "improve" the professor's phrasing.

## Phase 1 — decompose, then stop

The exam questions are broad: one question covers fifteen minutes of oral
answer. A card whose front is the whole question cannot be graded and is
useless.

1. Read `domande-esame.md` and select the questions concerning $1.
2. For each one, identify its key points — the sub-questions an examiner
   could pull out as a follow-up. The right size is two or three minutes of
   spoken answer: small enough to say "this one I know, this one I don't",
   large enough to require reasoning rather than a single term.
3. Report, per question: the list of points you found and how many cards
   that means. Decide the count from the material — do not pad to reach a
   number, do not compress to stay under one.

Then **stop**. The user removes points the professor never asks, merges the
ones that are too fine, and adds what you missed. Write nothing until they
confirm.

## Phase 2 — one card per confirmed point

- `front` is the point, phrased as a consegna the user speaks to. Not the
  verbatim database question, and not a one-word prompt.
- `back` is the checklist of what a complete answer contains: the elements
  to cover, in the order they would be presented. Not a paragraph to
  recite.
- If the notes do not cover a point, say so and skip the card. Never fill
  the gap from your own knowledge.
- Isolated figures and percentages are not cards. If there is no mechanism
  behind it, it is not oral-exam material.
- The JSON schema is in `~/.pi/agent/skills/anki/SKILL.md`. Two keys,
  `front` and `back`. Read it — do not guess.

Then:

```
ankicli batch carte.json -d "Patofisio::$1"
```

The default is dry-run and sends nothing. Show the list. Once the user
confirms, rerun with `--mode send` and report the output: the CLI prints
`inserite N/M` and names the cards rejected as duplicates.
