#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.14"
# dependencies = ["typer", "httpx"]
# ///
from enum import Enum, StrEnum
import json
import os
from pathlib import Path
from typing import Annotated, TypedDict

import httpx
import typer
from rich import print as rich_print

app = typer.Typer()

URL = os.environ.get("ANKI_CONNECT_URL", "http://127.0.0.1:8765")
API = 6

client = httpx.Client(base_url=URL, timeout=15.0)


class Fields(TypedDict):
    Fronte: str
    Retro: str


class Note(TypedDict):
    deckName: str
    modelName: str
    fields: Fields


class CardFieldValue(TypedDict):
    value: str
    order: int


class CardInfo(TypedDict):
    cardId: int
    deckName: str
    fields: dict[str, CardFieldValue]


class FindCardsParams(TypedDict):
    query: str


class CardsInfoParams(TypedDict):
    cards: list[int]


class AddNotesParams(TypedDict):
    notes: list[Note]


class CreateDeckParams(TypedDict):
    deck: str


class Answer(TypedDict):
    cardId: int
    ease: int


class AnswerCardsParams(TypedDict):
    answers: list[Answer]


class BatchOpts(StrEnum):
    dry = "dry"
    create = "create"


def raise_typer(msg: str) -> None:
    typer.secho(
        msg,
        fg=typer.colors.RED,
        err=True,
    )
    raise typer.Exit(1)


def call(
    action: str,
    params: FindCardsParams
    | CardsInfoParams
    | AddNotesParams
    | CreateDeckParams
    | AnswerCardsParams
    | None,
) -> str:
    body = {}
    try:
        response = client.post(
            "",
            json={
                "action": action,
                "version": API,
                params: params or [],
            },
        )
        response.raise_for_status()
        body = response.json()

    except httpx.HTTPError as e:
        raise_typer(
            f"unreachable: {URL} ({e}). Is Anki open?",
        )
    if error := body.get("error"):
        raise_typer(f"{action}: {error}")
    return body.get("result", "")


@app.command()
def ping() -> None:
    """
    Check AnkiConnect is reachable
    """
    rich_print(f"ok  AnkiConnect v{call('version', None)}  {URL}")


def note_payload(deck: str, item: dict) -> dict:
    """Build an AnkiConnect note from a dict."""
    kind = (item.get("type") or ("cloze" if "text" in item else "basic")).lower()
    if kind == "cloze":
        text = item.get("text") or item.get("front")
        if not text:
            raise_typer(f"cloze note missing 'text': {item}")
        if text is not None and "{{c" not in text:
            raise_typer("cloze note has no {{{{c1::...}}}}")
        fields = {"Text": text, "Back Extra": item.get("extra", "")}
        model = item.get("model", "Cloze")
    else:
        if not (item.get("front") and item.get("back")):
            raise_typer(f"basic note needs 'front' and 'back': {item}")
        fields = {"Front": item["front"], "Back": item["back"]}
        model = item.get("model", "Basic")
    return {
        "deckName": item.get("deck", deck),
        "modelName": model,
        "fields": fields,
        "options": {"allowDuplicate": False, "duplicateScope": "deck"},
    }


def create_deck(deck: str) -> None:
    existing = call("deckNames", None)
    if deck in existing:
        return
    call("createDeck", {"deck": deck})


def batch_notes(content: str, deck_name: str, batch_opts: BatchOpts) -> None:
    items: list[Note] | None = []
    try:
        items: list[Note] = json.loads(content)
    except json.JSONDecodeError as e:
        raise_typer(f"bad JSON: {e}")

    if not isinstance(items, list):
        raise_typer("json should be a list")

    if batch_opts == BatchOpts.create:
        create_deck(deck_name)
    if batch_opts == BatchOpts.dry:
        for n in items:
            first = next(iter(n["fields"].values()))
            rich_print(f"[{n['modelName']}] {flatten(first, 100)}")
        rich_print(f"# {len(items)} notes, not sent (--dry-run)")
        return
    # result = call("addNotes", notes)
    # ok = [r for r in result if r]
    # for n, r in zip(notes, result):
    #     if r is None:
    #         first = next(iter(n["fields"].values()))


@app.command()
def test() -> None:
    rich_print(call("deckNames", None))


@app.command()
def batch(
    file: Annotated[
        Path,
        typer.Argument(
            exists=True,
            file_okay=True,
            dir_okay=False,
            writable=False,
            readable=True,
            resolve_path=True,
            help="Json input file path",
        ),
    ],
    deck: Annotated[str, typer.Option(help="Name of the deck")],
    batch_opts: Annotated[
        BatchOpts,
        typer.Option(case_sensitive=False),
    ] = BatchOpts.create,
) -> None:
    """
    Insert anki cards from json into the batch
    """
    batch_notes(file.read_text(), deck, batch_opts)


if __name__ == "__main__":
    app()
