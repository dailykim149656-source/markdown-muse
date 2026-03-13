import { afterEach, describe, expect, it } from "vitest";
import {
  readUserProfilePreference,
  USER_PROFILE_STORAGE_KEY,
  writeUserProfilePreference,
} from "@/lib/editor/webEditorPreferences";

describe("webEditorPreferences user profile", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("defaults to beginner when no preference is stored", () => {
    expect(readUserProfilePreference()).toBe("beginner");
  });

  it("persists the selected user profile", () => {
    writeUserProfilePreference("advanced");

    expect(window.localStorage.getItem(USER_PROFILE_STORAGE_KEY)).toBe("advanced");
    expect(readUserProfilePreference()).toBe("advanced");
  });
});
