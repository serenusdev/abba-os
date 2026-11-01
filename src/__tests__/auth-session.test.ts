import { describe, it, expect } from "vitest";
import { DEFAULT_MOCK_USER, getCurrentUserProfile } from "@/lib/auth/session";

describe("Auth Session & Roles", () => {
  it("provides valid default mock user profile matching Master PRD", () => {
    expect(DEFAULT_MOCK_USER).toBeDefined();
    expect(DEFAULT_MOCK_USER.full_name).toBe("Salman Al-Farisi");
    expect(DEFAULT_MOCK_USER.role).toBe("santri");
    expect(DEFAULT_MOCK_USER.status).toBe("active");
    expect(DEFAULT_MOCK_USER.team_name).toBe("Tim Media & IT");
  });

  it("returns default mock user when Supabase is in fallback/mock mode", async () => {
    const profile = await getCurrentUserProfile();
    expect(profile.id).toBe(DEFAULT_MOCK_USER.id);
    expect(profile.email).toBe(DEFAULT_MOCK_USER.email);
  });
});

