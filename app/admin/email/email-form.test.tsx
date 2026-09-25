import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { EmailForm } from "./email-form";

describe("EmailForm", () => {
  it("allows selecting a contact and entering an email", async () => {
    const user = userEvent.setup();
    render(<EmailForm recipients={[{ childName: "Anna Kowalska", email: "anna@example.com", id: "one", parentName: null }]} />);

    await user.click(screen.getByRole("checkbox"));
    await user.type(screen.getByLabelText("Temat"), "Przypomnienie");
    await user.type(screen.getByLabelText("Treść wiadomości"), "Wiadomość");

    expect(screen.getAllByText("Anna Kowalska")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Wyślij e-mail" })).toBeEnabled();
  });

  it("removes a contact from the selected recipients box", async () => {
    const user = userEvent.setup();
    render(<EmailForm recipients={[{ childName: "Anna Kowalska", email: "anna@example.com", id: "one", parentName: null }]} />);

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Usuń Anna Kowalska" }));

    expect(screen.getByText("Zaznaczone kontakty pojawią się tutaj.")).toBeInTheDocument();
  });
});
