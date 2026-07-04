import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HeaderEnvironmentSelector } from "@/components/environment/header-environment-selector";
import { useEnvironmentStore } from "@/stores/environment-store";
import type { EnvironmentData } from "@apiark/types";

vi.mock("@/lib/tauri-api", () => ({
  loadEnvironments: vi.fn().mockResolvedValue([]),
  getResolvedVariables: vi.fn().mockResolvedValue({}),
  loadRootDotenv: vi.fn().mockResolvedValue({}),
}));

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

  it("renders the active environment in the trigger", () => {
    useEnvironmentStore.setState({
      environments: [env("Local"), env("Production")],
      activeEnvironmentName: "Production",
    });

    render(<HeaderEnvironmentSelector />);

    expect(screen.getByRole("combobox")).toHaveTextContent("Production");
  });

  it("renders one option per environment plus 'No Environment'", () => {
    useEnvironmentStore.setState({
      environments: [env("Local"), env("Production")],
      activeEnvironmentName: "Local",
    });

    render(<HeaderEnvironmentSelector />);

    fireEvent.click(screen.getByRole("combobox"));

    expect(screen.getByRole("option", { name: "Local" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Production" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "No Environment" })).toBeInTheDocument();
  });

  it("switches the active environment when an option is clicked", () => {
    useEnvironmentStore.setState({
      environments: [env("Local"), env("Production")],
      activeEnvironmentName: "Local",
    });

    render(<HeaderEnvironmentSelector />);

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "Production" }));

    expect(useEnvironmentStore.getState().activeEnvironmentName).toBe("Production");
  });

  it("clears the active environment when 'No Environment' is chosen", () => {
    useEnvironmentStore.setState({
      environments: [env("Local")],
      activeEnvironmentName: "Local",
    });

    render(<HeaderEnvironmentSelector />);

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "No Environment" }));

    expect(useEnvironmentStore.getState().activeEnvironmentName).toBeNull();
  });

  it("renders a 'No Environment' pill when there are no environments", () => {
    useEnvironmentStore.setState({ environments: [], activeEnvironmentName: null });

    render(<HeaderEnvironmentSelector />);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("No Environment")).toBeInTheDocument();
  });
});
