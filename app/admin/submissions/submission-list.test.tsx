import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SubmissionList, submissionDeletedEvent } from "./submission-list";

describe("SubmissionList", () => {
  it("keeps deletion feedback stable and focuses it after a record is removed", async () => {
    render(<SubmissionList><details><summary>Anna Kowalska</summary></details></SubmissionList>);

    fireEvent(window, new CustomEvent(submissionDeletedEvent, { detail: { parentName: "Anna Kowalska" } }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveFocus());
    expect(screen.getByRole("status")).toHaveTextContent("Usunięto zgłoszenie od „Anna Kowalska”.");
  });

  it("refocuses feedback for repeated deletions with the same name", async () => {
    render(<SubmissionList><p>Brak zgłoszeń</p></SubmissionList>);
    const otherTarget = document.createElement("button");
    document.body.append(otherTarget);

    fireEvent(window, new CustomEvent(submissionDeletedEvent, { detail: { parentName: "Anna Kowalska" } }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveFocus());
    otherTarget.focus();
    fireEvent(window, new CustomEvent(submissionDeletedEvent, { detail: { parentName: "Anna Kowalska" } }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveFocus());
    otherTarget.remove();
  });
});
