#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.14"
# dependencies = ["typer"]
# ///
import json
import re
import xml.etree.ElementTree as ET
import zipfile
from enum import StrEnum
from pathlib import Path
from typing import TYPE_CHECKING, Annotated, ReadOnly, TypedDict

import typer

if TYPE_CHECKING:
    from collections.abc import Iterator

app = typer.Typer()


# ----------- READING -------------
NS = {"x": "urn:xmind:xmap:xmlns:content:2.0"}


class Format(StrEnum):
    JSON = "content.json"  # XMind Zen / 2020+
    XML = "content.xml"  # legacy XMind 8

    @property
    def extension(self) -> str:
        return self.name.lower()


class Node(TypedDict):
    children: ReadOnly[list[Node]]
    content: ReadOnly[str]


class File(TypedDict):
    node: ReadOnly[Node]
    extension: ReadOnly[str]
    title: ReadOnly[str]


def read_content_from_xml(spreadsheet_topic: ET.Element[str]) -> Node:
    content = spreadsheet_topic.find("x:title", NS)
    children = []
    for group in spreadsheet_topic.findall("x:children/x:topics", NS):
        children.extend(
            read_content_from_xml(content) for content in group.findall("x:topic", NS)
        )
    return Node(
        content=(content.text or "").strip() if content is not None else "",
        children=children,
    )


def read_content_from_json(spreadsheet_topic: dict) -> Node:  # ty:ignore[missing-type-argument]
    kids = spreadsheet_topic.get("children") or {}
    attached = kids.get("attached") or []
    detached = kids.get("detached") or []
    return Node(
        content=(spreadsheet_topic.get("title") or "").strip(),
        children=[read_content_from_json(c) for c in list(attached) + list(detached)],
    )


def read_containers(input_file: Path) -> Iterator[File]:
    if not zipfile.is_zipfile(input_file):
        # Some tools emit a bare content.json named .xmind
        raise ValueError("Not_a_zip")
    with zipfile.ZipFile(input_file) as z:
        names = set(z.namelist())
        if Format.JSON in names:
            content = json.loads(z.read("content.json").decode("utf-8"))
            entries = content if isinstance(content, list) else [content]
            for i, sheet in enumerate(entries, 1):
                root = sheet.get("rootTopic")
                if not root:
                    continue
                yield File(
                    extension=Format.JSON.extension,
                    title=(sheet.get("title") or f"Sheet {i}").strip(),
                    node=read_content_from_json(root),
                )
        elif Format.XML in names:
            content = ET.fromstring(z.read("content.xml").decode("utf-8"))
            for i, sheet in enumerate(content.findall("x:sheet", NS), 1):
                root = sheet.find("x:topic", NS)
                if root is None:
                    continue
                title = sheet.find("x:title", NS)
                yield File(
                    node=read_content_from_xml(root),
                    extension=Format.XML.extension,
                    title=str(title.text) if title is not None else f"Sheet {i}",
                )
        else:
            raise ValueError("content_None")


# ----------- CONVERTING -------------
def esc(input_str: str) -> str:
    return re.sub(r"^([#>\-*+]|\d+\.)\s", r"\\\1 ", input_str)


def render(node: Node, out: list[str], depth: int) -> None:
    title = esc(" ".join(node["content"].split())) or "*(senza titolo)*"
    out.append(f"{'  ' * depth}- {title}\n")
    for c in node["children"]:
        render(c, out, depth + 1)


# ----------- WRITING  -------------
def slug(title: str | None) -> str:
    if title is None:
        return "foglio"
    title = re.sub(r"[^\w\s-]", "", title, flags=re.UNICODE).strip()
    return re.sub(r"[\s_]+", "-", title).lower() or "foglio"


def write(destination: Path, output_list: list[str]) -> None:
    with destination.open(mode="a", encoding="utf-8") as fh:  # <-- 101 opens
        fh.writelines(output_list)


@app.command()
def main(
    source: Annotated[
        Path,
        typer.Argument(
            exists=True,
            file_okay=True,
            dir_okay=False,
            writable=False,
            readable=True,
            resolve_path=True,
        ),
    ],
    outdir: Annotated[
        Path,
        typer.Option(
            exists=True,
            dir_okay=True,
            readable=True,
            resolve_path=True,
        ),
    ],
) -> None:
    try:
        for index, file in enumerate(read_containers(source)):
            dest = Path(outdir) / f"{index:02d}-{slug(file.get('title'))}.md"
            lines: list[str] = []
            render(file["node"], lines, 0)
            write(destination=dest, output_list=lines)
    except (
        ValueError,
        KeyError,
        ET.ParseError,
        json.JSONDecodeError,
        zipfile.BadZipFile,
        OSError,
    ) as e:
        typer.secho(str(e), fg=typer.colors.RED, err=True)
        raise typer.Exit(1) from e


if __name__ == "__main__":
    app()
