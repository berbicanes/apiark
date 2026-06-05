import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HeaderEnvironmentSelector } from "@/components/environment/header-environment-selector";
import { useEnvironmentStore } from "@/stores/environment-store";
import type { EnvironmentData } from "@apiark/types";

// The store imports the real Tauri bridge at module load; mock it like the
// store tests do so jsdom never tries to resolve @tauri-apps. The component
// only reads/writes store state, so empty stubs are enough.
vi.mock("@/lib/tauri-api", () => ({
  loadEnvironments: vi.fn().mockResolvedValue([]),
  getResolvedVariables: vi.fn().mockResolvedValue({}),
  loadRootDotenv: vi.fn().mockResolvedValue({}),
}));

// Component tests don't run the i18n bootstrap (it reads localStorage at import
// time). Resolve the handful of keys this component uses to their English copy.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "environment.noEnvironment": "No Environment",
        "environment.noEnvironments":
          "Create an environment to manage variables across requests",
        "environment.title": "Environments",
      })[key] ?? key,
  }),
}));

function env(name: string): EnvironmentData {
  return { name, variables: {}, secrets: [] };
}

describe("HeaderEnvironmentSelector", () => {
  beforeEach(() => {
    useEnvironmentStore.setState({
      environments: [],
      activeEnvironmentName: null,
      activeCollectionPath: null,
      runtimeOverrides: {},
    });
  });

  it("renders the active environment as the selected value", () => {
    useEnvironmentStore.setState({
      environments: [env("Local"), env("Production")],
      activeEnvironmentName: "Production",
    });

    render(<HeaderEnvironmentSelector />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("Production");
  });

  it("renders one option per environment plus the 'No Environment' option", () => {
    useEnvironmentStore.setState({
      environments: [env("Local"), env("Production")],
      activeEnvironmentName: "Local",
    });

    render(<HeaderEnvironmentSelector />);

    expect(screen.getByRole("option", { name: "Local" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Production" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "No Environment" })).toBeInTheDocument();
  });

  it("switches the active environment in the store on change", () => {
    useEnvironmentStore.setState({
      environments: [env("Local"), env("Production")],
      activeEnvironmentName: "Local",
    });

    render(<HeaderEnvironmentSelector />);

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Production" },
    });

    expect(useEnvironmentStore.getState().activeEnvironmentName).toBe("Production");
  });

  it("clears the active environment when 'No Environment' is chosen", () => {
    useEnvironmentStore.setState({
      environments: [env("Local")],
      activeEnvironmentName: "Local",
    });

    render(<HeaderEnvironmentSelector />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "" } });

    expect(useEnvironmentStore.getState().activeEnvironmentName).toBeNull();
  });

  it("renders a 'No Environment' pill and no dropdown when there are no environments", () => {
    useEnvironmentStore.setState({ environments: [], activeEnvironmentName: null });

    render(<HeaderEnvironmentSelector />);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("No Environment")).toBeInTheDocument();
  });
});
