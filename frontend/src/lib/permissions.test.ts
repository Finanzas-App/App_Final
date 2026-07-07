import { describe, expect, it } from "vitest";
import { hasPermission, getHomeRoute, ROLES } from "./permissions";

describe("permissions", () => {
  it("defines three roles", () => {
    expect(ROLES).toEqual(["Administrador", "Vendedor", "Soporte"]);
  });

  it("allows vendedor to create simulations", () => {
    expect(hasPermission("Vendedor", "simulations:write")).toBe(true);
  });

  it("denies vendedor audit access", () => {
    expect(hasPermission("Vendedor", "audit:read")).toBe(false);
  });

  it("allows soporte audit and evaluate", () => {
    expect(hasPermission("Soporte", "audit:read")).toBe(true);
    expect(hasPermission("Soporte", "applications:evaluate")).toBe(true);
    expect(hasPermission("Soporte", "settings:read")).toBe(false);
  });

  it("redirects each role to its home", () => {
    expect(getHomeRoute("Administrador")).toBe("/");
    expect(getHomeRoute("Vendedor")).toBe("/simulations");
    expect(getHomeRoute("Soporte")).toBe("/applications");
  });
});
