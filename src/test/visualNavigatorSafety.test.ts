import { describe, expect, it } from "vitest";
import { getNavigatorConfirmationReason } from "@/lib/visualNavigator/safety";

describe("getNavigatorConfirmationReason", () => {
  it("flags high-impact click actions", () => {
    expect(getNavigatorConfirmationReason({
      action: {
        target: {
          name: "Reset documents",
        },
        type: "click",
      },
    })).toContain("needs confirmation");
  });

  it("allows regular navigation clicks", () => {
    expect(getNavigatorConfirmationReason({
      action: {
        target: {
          dataTarget: "header-google-menu",
          name: "Google Workspace",
        },
        type: "click",
      },
    })).toBeNull();
  });
});
