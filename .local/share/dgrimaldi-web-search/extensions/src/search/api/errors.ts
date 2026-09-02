import { isOperationTimeoutError } from "@/shared/network";
import { SearchWebError } from "@/search/composition/web-search";
import { ParseSearchQueryError } from "@/search/domain/types";
import { ToolOutputStoreError } from "@/search/presentation/agent-view";
import { ToolInputParseError } from "@/search/presentation/input";

export type WebSearchBoundaryError =
  | ToolInputParseError
  | ParseSearchQueryError
  | SearchWebError
  | ToolOutputStoreError;

export function renderSafeWebSearchError(error: WebSearchBoundaryError): string {
  switch (error._tag) {
    case "InvalidToolInput":
      return error.message;
    case "InvalidToolField":
      return `${error.field}: ${error.message}`;
    case "UnknownToolField":
      return `Unknown websearch field: ${error.field}`;
    case "EmptySearchQuery":
      return "Search query cannot be empty";
    case "SearchDisabled":
      return "websearch is disabled in web-tools settings. Enable it to use this tool.";
    case "SearchProviderUnavailable":
      return "Search provider unavailable";
    case "SearchProviderStatusRejected":
      return `Search request failed (${error.status})`;
    case "SearchProviderResponseTooLarge":
      return `Search response too large (${Math.floor(error.maxBytes / (1024 * 1024))}MB limit)`;
    case "SearchProviderProtocolInvalid":
      return "Search provider returned an invalid response";
    case "SearchProviderReturnedError":
      return error.safeMessage;
    case "SearchProviderNoRecognizedResults":
      return "Search provider returned an unrecognized response format";
    case "SearchProviderCancelled":
      return "Web search cancelled";
    case "TempFileWriteFailed":
      return "Failed to write full websearch output";
  }
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
