import { Redacted } from "./redacted";

export type ToolOutputStoreError = {
  readonly _tag: "TempFileWriteFailed";
  readonly cause: unknown;
};

export type ParsePublicHttpUrlError =
  | { readonly _tag: "EmptyUrl" }
  | { readonly _tag: "UnsupportedUrlProtocol"; readonly protocol?: string }
  | { readonly _tag: "InvalidUrl"; readonly input: Redacted<string> }
  | { readonly _tag: "UrlCredentialsUnsupported"; readonly url: Redacted<string> };

export type ToolInputParseError =
  | { readonly _tag: "InvalidToolInput"; readonly message: string }
  | { readonly _tag: "InvalidToolField"; readonly field: string; readonly message: string }
  | { readonly _tag: "UnknownToolField"; readonly field: string };
