import { NextResponse, type NextRequest } from "next/server";

import { parseStoragePayload } from "../../../lib/storage-schema";
import { initialState } from "../../../lib/tracker-state";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_PROGRESS_ID = "default";
const DEFAULT_TABLE = "interview_tracker_progress";
const TABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

type SupabaseConfig = Readonly<{
  progressId: string;
  serviceRoleKey: string;
  table: string;
  url: string;
}>;

function supabaseConfig(): SupabaseConfig | null {
  const url = process.env["SUPABASE_URL"]?.replace(/\/$/, "");
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const table = process.env["SUPABASE_PROGRESS_TABLE"] ?? DEFAULT_TABLE;
  const progressId = process.env["SUPABASE_PROGRESS_ID"] ?? DEFAULT_PROGRESS_ID;
  if (url === undefined || url.length === 0 || serviceRoleKey === undefined || serviceRoleKey.length === 0 || !TABLE_NAME_PATTERN.test(table)) return null;
  return { progressId, serviceRoleKey, table, url };
}

function supabaseHeaders(config: SupabaseConfig): HeadersInit {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

function progressSelectUrl(config: SupabaseConfig): string {
  const id = encodeURIComponent(config.progressId);
  return `${config.url}/rest/v1/${config.table}?id=eq.${id}&select=state&limit=1`;
}

function progressUpsertUrl(config: SupabaseConfig): string {
  return `${config.url}/rest/v1/${config.table}?on_conflict=id`;
}

function progressJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  return NextResponse.json(body, { ...init, headers });
}

export async function GET() {
  const config = supabaseConfig();
  if (config === null) {
    return progressJson({ configured: false, state: initialState() });
  }

  const response = await supabaseFetch(progressSelectUrl(config), {
    headers: supabaseHeaders(config),
    cache: "no-store",
  });
  if (response === null) {
    return progressJson({ configured: true, error: "Supabase read failed", state: initialState() }, { status: 502 });
  }
  if (!response.ok) {
    return progressJson({ configured: true, error: "Supabase read failed", state: initialState() }, { status: 502 });
  }

  const rows: unknown = await response.json();
  const row = Array.isArray(rows) ? rows[0] : undefined;
  const state = typeof row === "object" && row !== null && "state" in row ? row.state : initialState();
  const parsed = parseStoragePayload(state);
  return progressJson({ configured: true, state: parsed.ok ? parsed.state : initialState() });
}

export async function POST(request: NextRequest) {
  return saveProgress(request);
}

export async function PUT(request: NextRequest) {
  return saveProgress(request);
}

async function saveProgress(request: NextRequest) {
  const config = supabaseConfig();
  if (config === null) {
    return progressJson({ configured: false, error: "Supabase is not configured", ok: false }, { status: 503 });
  }

  const payload = await parseRequestJson(request);
  if (!payload.ok) {
    return progressJson({ error: "Invalid JSON", ok: false }, { status: 400 });
  }
  const parsed = parseStoragePayload(payload.value);
  if (!parsed.ok) {
    return progressJson({ error: parsed.error.message, ok: false }, { status: 400 });
  }

  const response = await supabaseFetch(progressUpsertUrl(config), {
    method: "POST",
    headers: {
      ...supabaseHeaders(config),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ id: config.progressId, state: parsed.state, updated_at: new Date().toISOString() }),
  });
  if (response === null) {
    return progressJson({ configured: true, error: "Supabase save failed", ok: false }, { status: 502 });
  }
  if (!response.ok) {
    return progressJson({ configured: true, error: "Supabase save failed", ok: false }, { status: 502 });
  }

  return progressJson({ configured: true, ok: true });
}

async function supabaseFetch(url: string, init: RequestInit): Promise<Response | null> {
  try {
    return await fetch(url, init);
  } catch {
    return null;
  }
}

async function parseRequestJson(request: NextRequest): Promise<{ ok: true; value: unknown } | { ok: false }> {
  try {
    const value: unknown = await request.json();
    return { ok: true, value };
  } catch {
    return { ok: false };
  }
}
