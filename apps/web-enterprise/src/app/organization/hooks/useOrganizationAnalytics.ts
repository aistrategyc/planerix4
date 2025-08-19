

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Types for organization analytics data returned by the backend.
 * Extend safely as backend grows – unknown fields are preserved in `extra`.
 */
export interface OrganizationAnalytics {
  organizationId: string;
  organizationName: string;
  totalProjects: number;
  totalMembers: number;
  activeMembers: number;
  revenue: number; // in major currency units
  period?: {
    from?: string; // ISO date
    to?: string;   // ISO date
  };
  // Keep any additional backend fields without breaking the UI
  [key: string]: unknown;
}

export interface UseOrganizationAnalyticsResult {
  data: OrganizationAnalytics | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Resolve API base URL from environment. Prefer NEXT_PUBLIC_API_URL if provided.
 * Fallback to empty string so relative calls hit the same origin via Next.js proxy.
 */
function getApiBase(): string {
  // Example envs used in this project: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_API_PREFIX
  const direct = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (direct) return direct;
  const prefix = process.env.NEXT_PUBLIC_API_PREFIX?.replace(/\/$/, "");
  return prefix || ""; // e.g. "/api" or ""
}

/**
 * Build endpoint for org analytics. In our backend we already have endpoints like
 * /api/orgs/:id/departments – keeping the same convention for analytics.
 */
function buildEndpoint(orgId: string): string {
  const base = getApiBase();
  return `${base}/orgs/${encodeURIComponent(orgId)}/analytics`;
}

/**
 * A fully ready hook to load organization analytics by orgId.
 *
 * Usage:
 *   const { data, loading, error, refresh } = useOrganizationAnalytics(orgId);
 */
export function useOrganizationAnalytics(orgId?: string): UseOrganizationAnalyticsResult {
  const [data, setData] = useState<OrganizationAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const canLoad = useMemo(() => typeof orgId === "string" && orgId.length > 0, [orgId]);

  const fetchOnce = useCallback(async () => {
    if (!canLoad) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(buildEndpoint(orgId!), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        // credentials: "include", // uncomment if your API needs cookies
      });

      if (!res.ok) {
        // Try to extract error message
        let detail = `HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          detail = (errJson?.detail as string) || detail;
        } catch (_) {}
        throw new Error(`Failed to load analytics: ${detail}`);
      }

      const json = (await res.json()) as Partial<OrganizationAnalytics> | null;

      // Normalize with safe defaults so UI is stable
      const normalized: OrganizationAnalytics = {
        organizationId: String(json?.organizationId ?? orgId),
        organizationName: String(json?.organizationName ?? "Organization"),
        totalProjects: Number(json?.totalProjects ?? 0),
        totalMembers: Number(json?.totalMembers ?? 0),
        activeMembers: Number(json?.activeMembers ?? 0),
        revenue: Number(json?.revenue ?? 0),
        period: json?.period as OrganizationAnalytics["period"],
        ...json,
      };

      setData(normalized);
    } catch (err: any) {
      if (err?.name === "AbortError") return; // cancelled
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [canLoad, orgId]);

  useEffect(() => {
    fetchOnce();
    return () => abortRef.current?.abort();
  }, [fetchOnce]);

  const refresh = useCallback(async () => {
    await fetchOnce();
  }, [fetchOnce]);

  return { data, loading, error, refresh };
}