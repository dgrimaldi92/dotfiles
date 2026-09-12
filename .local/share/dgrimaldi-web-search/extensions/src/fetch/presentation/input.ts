import { err, ok, Result } from "../../shared/result";
import { ParsePublicHttpUrlError, ToolInputParseError } from "../../shared/errors";
import { WebFetchFormat } from "../domain/types";
import { PublicHttpUrl, parsePublicHttpUrl } from "../../shared/url-parser";
import { WebToolsSettings } from "../../shared/web-tools";
import { clampInteger, FETCH_TIMEOUT_SECONDS } from "../../shared/config";
import { WEB_FETCH_FORMATS } from "../domain/config";

interface WebFetchToolInput {
  readonly url: PublicHttpUrl;
  readonly format: WebFetchFormat;
  readonly timeoutSeconds: number;
}

/** Parse raw Pi webfetch params into service-facing input. */
export function parseWebFetchToolParams(
  raw: unknown,
  settings: WebToolsSettings["fetch"],
): Result<WebFetchToolInput, ToolInputParseError | ParsePublicHttpUrlError> {
  if (!isPlainObject(raw)) {
    return err({ _tag: "InvalidToolInput", message: "Expected an object" });
  }

  for (const key of Object.keys(raw)) {
    if (key !== "url" && key !== "format" && key !== "timeout") {
      return err({ _tag: "UnknownToolField", field: key });
    }
  }

  const urlValue = raw["url"];
  if (typeof urlValue !== "string") {
    return err({ _tag: "InvalidToolField", field: "url", message: "Expected a string" });
  }

  const url = parsePublicHttpUrl(urlValue);
  if (url._tag === "err") {
    return url;
  }

  const formatValue = raw["format"];
  let format = settings.defaultFormat;
  if (formatValue !== undefined) {
    if (typeof formatValue !== "string" || !isWebFetchFormat(formatValue)) {
      return err({
        _tag: "InvalidToolField",
        field: "format",
        message: "Expected one of: markdown, text, html",
      });
    }
    format = formatValue;
  }

  const timeoutValue = raw["timeout"];
  let timeoutSeconds = clampInteger(settings.timeoutSeconds, {
    min: FETCH_TIMEOUT_SECONDS.min,
    max: FETCH_TIMEOUT_SECONDS.max,
    fallback: FETCH_TIMEOUT_SECONDS.default,
  });
  if (timeoutValue !== undefined) {
    if (typeof timeoutValue !== "number" || !Number.isFinite(timeoutValue)) {
      return err({
        _tag: "InvalidToolField",
        field: "timeout",
        message: "Expected a finite number",
      });
    }
    timeoutSeconds = clampInteger(timeoutValue, {
      min: FETCH_TIMEOUT_SECONDS.min,
      max: FETCH_TIMEOUT_SECONDS.max,
      fallback: FETCH_TIMEOUT_SECONDS.default,
    });
  }

  return ok({ url: url.value, format, timeoutSeconds });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWebFetchFormat(value: string): value is WebFetchFormat {
  const formats: readonly string[] = WEB_FETCH_FORMATS;
  return formats.includes(value);
}
