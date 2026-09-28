import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CreatableMultiSelect, CreatableSelect } from "./creatable-select";

describe("creatable taxonomy selectors", () => {
  it("selects an existing category", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CreatableSelect options={[{ id: "1", name: "Governance" }]} value={null} onChange={onChange} emptyLabel="No category" placeholder="Search categories" createLabel={(name) => `Create ${name}`} onCreate={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "No category" }));
    await user.click(screen.getByRole("button", { name: "Governance" }));
    expect(onChange).toHaveBeenCalledWith({ id: "1", name: "Governance" });
  });

  it("creates and selects a tag from the dropdown", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onCreate = vi.fn().mockResolvedValue({ id: "2", name: "budget" });
    render(<CreatableMultiSelect options={[]} values={[]} onChange={onChange} selectedLabel="Selected tags" placeholder="Search tags" createLabel={(name) => `Create ${name}`} onCreate={onCreate} />);
    await user.click(screen.getByRole("button", { name: "Search tags" }));
    await user.type(screen.getByRole("textbox", { name: "Search tags" }), "budget");
    await user.click(screen.getByRole("button", { name: "Create budget" }));
    expect(onCreate).toHaveBeenCalledWith("budget");
    expect(onChange).toHaveBeenCalledWith([{ id: "2", name: "budget" }]);
  });
});
