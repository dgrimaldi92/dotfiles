# /// script
# requires-python = ">=3.14"
# dependencies = ["typer", "httpx"]
# ///
import json
import os
import re
from enum import StrEnum
from html import unescape
from pathlib import Path  # noqa: TC003
from typing import Annotated, Literal, TypedDict

import httpx
import typer
from rich import print as rich_print

app = typer.Typer()

URL = os.environ.get("ANKI_CONNECT_URL", "http://127.0.0.1:8765")
API = 6

MODEL = "Basilare"
# MODEL_EN = "Basic"
FIELDS = ("Fronte", "Retro")
# FIELDS_EN = ("Front", "Back")

client = httpx.Client(base_url=URL, timeout=15.0)


Fields = TypedDict(
    "Fields",
    {
        FIELDS[0]: str,
        FIELDS[1]: str,
    },
)


class InputNote(TypedDict):
    back: str
    front: str


class Note(TypedDict):
    deckName: str
    modelName: Literal["Basilare", "Basic"]
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
    DRY = "dry"
    SEND = "send"


def strip_html(text: str) -> str:
    return " ".join(unescape(re.sub(r"<[^>]+>", " ", text)).split())


def raise_typer(msg: str) -> None:
    typer.secho(
        msg,
        fg=typer.colors.RED,
        err=True,
    )
    raise typer.Exit(1)


def anki_caller[T: str](
    action: str,
    params: FindCardsParams
    | CardsInfoParams
    | AddNotesParams
    | CreateDeckParams
    | AnswerCardsParams
    | None,
) -> T:
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


def create_deck(deck: str) -> None:
    existing = anki_caller("deckNames", None)
    if deck in existing:
        return
    anki_caller("createDeck", {"deck": deck})


def read_notes(file: Path) -> list[InputNote]:
    items: list[InputNote] = json.loads(
        file.read_text(encoding="utf-8"),
    )
    if not isinstance(items, list):
        raise_typer("JSON should contain a list of notes")
    for i, item in enumerate(items, 1):
        if not (item.get("front") and item.get("back")):
            raise_typer(f"note #{i}: miss 'front' o 'back'")
    return items


@app.command()
def ping() -> None:
    """
    Check AnkiConnect is reachable
    """
    rich_print(f"ok  AnkiConnect v{anki_caller('version', None)}  {URL}")


@app.command()
def test() -> None:
    rich_print(anki_caller("deckNames", None))


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
    mode: Annotated[
        BatchOpts,
        typer.Option(case_sensitive=False),
    ] = BatchOpts.DRY,
) -> None:
    """
    Insert anki cards from json into the batch
    """
    items = read_notes(file)

    if mode is BatchOpts.DRY:
        for item in items:
            rich_print(item["front"])
        rich_print(f"[dim]{len(items)} notes, not send[/dim]")
        return

    create_deck(deck)
    notes = [
        Note(
            deckName=deck,
            modelName=MODEL,
            fields=Fields(Fronte=item["front"], Retro=item["back"]),
        )
        for item in items
    ]
    results = anki_caller("addNotes", {"notes": notes})
    rich_print(results)


@app.command()
def due(
    deck: Annotated[
        str,
        typer.Option("-d", "--deck", help="Deck name, e.g. Patofisio::Cancro"),
    ],
    number_of_print_cards: Annotated[
        int,
        typer.Option("-n", help="Max number of cards to print"),
    ] = 10,
    new: Annotated[
        bool,
        typer.Option("--new", help="Include cards never seen before"),
    ] = True,
) -> None:
    """Print cards to review: cardId, front, back."""
    query = f'deck:"{deck}" ' + ("(is:due or is:new)" if new else "is:due")
    card_ids = anki_caller("findCards", {"query": query})
    if not card_ids:
        rich_print("[dim]nothing to review[/dim]")
        return

    for card in anki_caller("cardsInfo", {"cards": card_ids[:number_of_print_cards]}):
        values = [f["value"] for f in card["fields"].values()]
        front, back = strip_html(values[0]), strip_html(values[1])
        rich_print(f"[dim]{card['cardId']}[/dim]  {front}")
        rich_print(f"  → {back}\n")


@app.command()
def answer(
    card_id: Annotated[int, typer.Argument(help="cardId, as printed by `due`")],
    ease: Annotated[
        int,
        typer.Option("-e", "--ease", min=1, max=4, help="1=again 2=hard 3=good 4=easy"),
    ],
) -> None:
    """Grade a card: 1=again 2=hard 3=good 4=easy."""
    if not anki_caller("answerCards", {"answers": [{"cardId": card_id, "ease": ease}]})[
        0
    ]:
        typer.secho(f"card {card_id} not graded", fg=typer.colors.RED, err=True)
        raise typer.Exit(1)
    typer.echo(f"{card_id} → {ease}")


if __name__ == "__main__":
    app()
