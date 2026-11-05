import { describe, it, expect } from "vitest";
import { isPublicRoute } from "@/lib/supabase/middleware";

describe("Middleware Route Protection (F-01, F-02, F-07)", () => {
  it("allows authentication and recovery routes without requiring login", () => {
    expect(isPublicRoute("/login")).toBe(true);
    expect(isPublicRoute("/register")).toBe(true);
    expect(isPublicRoute("/forgot-password")).toBe(true);
    expect(isPublicRoute("/reset-password")).toBe(true);
  });

  it("allows auth API endpoints without 307 redirect", () => {
    expect(isPublicRoute("/api/auth/login")).toBe(true);
  });

  it("allows calendar feed and cron endpoints", () => {
    expect(isPublicRoute("/api/calendar/feed")).toBe(true);
    expect(isPublicRoute("/api/cron/backups")).toBe(true);
    expect(isPublicRoute("/api/cron/notifications")).toBe(true);
  });

  it("allows PWA and offline shell without requiring login", () => {
    expect(isPublicRoute("/sw.js")).toBe(true);
    expect(isPublicRoute("/manifest.webmanifest")).toBe(true);
    expect(isPublicRoute("/offline")).toBe(true);
  });

  it("correctly identifies protected application routes", () => {
    expect(isPublicRoute("/")).toBe(false);
    expect(isPublicRoute("/kehadiran")).toBe(false);
    expect(isPublicRoute("/laporan")).toBe(false);
    expect(isPublicRoute("/tugas")).toBe(false);
    expect(isPublicRoute("/jadwal")).toBe(false);
    expect(isPublicRoute("/review")).toBe(false);
    expect(isPublicRoute("/tim")).toBe(false);
    expect(isPublicRoute("/resources")).toBe(false);
    expect(isPublicRoute("/settings/profile")).toBe(false);
    expect(isPublicRoute("/admin/users")).toBe(false);
    expect(isPublicRoute("/admin/analytics")).toBe(false);
    expect(isPublicRoute("/admin/audit")).toBe(false);
  });

  it("blocks unauthenticated access to protected API endpoints", () => {
    expect(isPublicRoute("/api/exports/export-123")).toBe(false);
  });

  it("handles trailing slashes gracefully", () => {
    expect(isPublicRoute("/login/")).toBe(true);
    expect(isPublicRoute("/forgot-password/")).toBe(true);
    expect(isPublicRoute("/api/auth/login/")).toBe(true);
    expect(isPublicRoute("/kehadiran/")).toBe(false);
  });
});
