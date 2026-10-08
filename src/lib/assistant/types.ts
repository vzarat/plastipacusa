export type FilmKind = "hand" | "machine";

export type PackageTier = "box" | "layer" | "half_pallet" | "full_pallet";

export type AssistantSuccess<T> = { ok: true } & T;

export type AssistantFailure = { ok: false; error: string };

export type AssistantResult<T> = AssistantSuccess<T> | AssistantFailure;
