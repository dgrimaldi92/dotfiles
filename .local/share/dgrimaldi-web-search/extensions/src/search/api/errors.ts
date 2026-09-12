import { logger } from "../../shared/logger";
import { isOperationTimeoutError } from "../../shared/network";
import { SearchWebError } from "../composition/web-search";
import { ParseSearchQueryError } from "../domain/SearchDepth";
import { ToolOutputStoreError } from "../presentation/agent-view";
import { ToolInputParseError } from "../presentation/input";

type WebSearchBoundaryError =
  | ToolInputParseError
  | ParseSearchQueryError
  | SearchWebError
  | ToolOutputStoreError;

function renderSafeWebSearchError(error: WebSearchBoundaryError): string {
  let msg = "";
  switch (error._tag) {
    case "InvalidToolInput":
      msg = error.message;
      break;
    case "InvalidToolField":
      msg = `${error.field}: ${error.message}`;
      break;
    case "UnknownToolField":
      msg = `Unknown websearch field: ${error.field}`;
      break;
    case "EmptySearchQuery":
      msg = "Search query cannot be empty";
      break;
    case "SearchDisabled":
      msg = "websearch is disabled in web-tools settings. Enable it to use this tool.";
      break;
    case "SearchProviderUnavailable":
      msg = "Search provider unavailable";
      break;
    case "SearchProviderStatusRejected":
      msg = `Search request failed (${error.status})`;
      break;
    case "SearchProviderResponseTooLarge":
      msg = `Search response too large (${Math.floor(error.maxBytes / (1024 * 1024))}MB limit)`;
      break;
    case "SearchProviderProtocolInvalid":
      msg = "Search provider returned an invalid response";
      break;
    case "SearchProviderReturnedError":
      msg = error.safeMessage;
      break;
    case "SearchProviderNoRecognizedResults":
      msg = "Search provider returned an unrecognized response format";
      break;
    case "SearchProviderCancelled":
      msg = "Web search cancelled";
      break;
    case "TempFileWriteFailed":
      msg = "Failed to write full websearch output";
      break;
  }
  logger.error(msg);
  return msg;
}

export function toWebSearchToolError(error: WebSearchBoundaryError): Error {
  return new Error(renderSafeWebSearchError(error));
}

export function toWebSearchBoundaryError(
  error: WebSearchBoundaryError,
  timeoutSeconds: number,
  outerSignal: AbortSignal | undefined,
  operationSignal: AbortSignal,
): Error {
  if (outerSignal?.aborted) {
    return new Error("Web search cancelled");
  }
  if (isOperationTimeoutError(operationSignal.reason)) {
    return new Error(`Web search timed out after ${timeoutSeconds}s`);
  }
  return toWebSearchToolError(error);
}
