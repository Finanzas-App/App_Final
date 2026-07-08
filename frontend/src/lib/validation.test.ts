import { describe, expect, it, beforeAll } from "vitest";
import i18n from "../i18n";
import {
  validateLogin,
  validateCustomer,
  validateVehicle,
  validateUser,
  validateSettings,
  validateSimulationStep1,
  validateSimulationStep2,
  validateApplicationStatus,
  hasErrors,
} from "./validation";

beforeAll(async () => {
  await i18n.changeLanguage("es");
});

describe("validateLogin", () => {
  it("rejects empty credentials", () => {
    const errors = validateLogin("", "");
    expect(hasErrors(errors)).toBe(true);
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });

  it("rejects invalid email", () => {
    const errors = validateLogin("not-an-email", "secret");
    expect(errors.email).toBeDefined();
  });

  it("accepts valid credentials", () => {
    const errors = validateLogin("user@test.com", "secret");
    expect(hasErrors(errors)).toBe(false);
  });
});

describe("validateCustomer", () => {
  const valid = {
    nombres: "Juan",
    apellidos: "Pérez",
    dni: "12345678",
    edad: 30,
    ingreso_mensual: 5000,
    email: "juan@test.com",
    telefono: "987654321",
    direccion: "Lima",
  };

  it("accepts valid customer", () => {
    expect(hasErrors(validateCustomer(valid))).toBe(false);
  });

  it("rejects invalid DNI", () => {
    const errors = validateCustomer({ ...valid, dni: "123" });
    expect(errors.dni).toBeDefined();
  });
});

describe("validateVehicle", () => {
  it("rejects year before 2020", () => {
    const errors = validateVehicle({
      brand: "Toyota",
      model: "Yaris",
      year: 2019,
      color: "Rojo",
      price: 50000,
    });
    expect(errors.year).toBeDefined();
  });
});

describe("validateUser", () => {
  it("rejects short password", () => {
    const errors = validateUser({
      name: "Test",
      email: "test@test.com",
      password: "123",
    });
    expect(errors.password).toBeDefined();
  });
});

describe("validateSettings", () => {
  it("rejects invalid RUC", () => {
    const errors = validateSettings({
      dealership_name: "Auto",
      dealership_ruc: "123",
      dealership_email: "info@auto.com",
    });
    expect(errors.dealership_ruc).toBeDefined();
  });
});

describe("validateSimulationStep1", () => {
  it("requires customer and vehicle", () => {
    const errors = validateSimulationStep1({ customer_id: 0, vehicle_id: 0 });
    expect(errors.customer_id).toBeDefined();
    expect(errors.vehicle_id).toBeDefined();
  });
});

describe("validateSimulationStep2", () => {
  it("rejects invalid balloon percent", () => {
    const errors = validateSimulationStep2({
      down_payment: 5000,
      rate_value: 0.12,
      term_months: 48,
      balloon_percent: 1.5,
    });
    expect(errors.balloon_percent).toBeDefined();
  });

  it("rejects balloon greater than financed amount", () => {
    const errors = validateSimulationStep2(
      {
        down_payment: 40000,
        rate_value: 0.12,
        term_months: 48,
        balloon_percent: 0.25,
        balloon_base: "vehicle",
      },
      { price: 48000 },
    );
    expect(errors.balloon_percent).toBeDefined();
  });
});

describe("validateApplicationStatus", () => {
  it("requires reason when rejected", () => {
    const errors = validateApplicationStatus({ status: "Rejected", decision_reason: "" });
    expect(errors.decision_reason).toBeDefined();
  });
});
