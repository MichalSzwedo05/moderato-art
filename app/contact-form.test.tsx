import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContactForm } from "./contact-form";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ message: "Wysłano" }) });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("ContactForm", () => {
  it("keeps every staged control disabled and explains why the form is unavailable", () => {
    render(<ContactForm lessonTitle="Junior Voice" lessonType="junior-voice" />);

    expect(screen.getByRole("group")).toBeDisabled();
    expect(screen.getByText(/formularz zostanie aktywowany/i)).toBeInTheDocument();
  });

  it("shows a visible synthetic-data warning when the restricted test mode is enabled", () => {
    render(<ContactForm lessonTitle="Studio Wokalne" lessonType="studio-wokalne" testEnabled />);

    expect(screen.getByRole("group")).not.toBeDisabled();
    expect(screen.getByText(/używaj wyłącznie fikcyjnych danych/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/kod dostępu do testu/i)).toHaveAttribute("type", "password");
  });

  it.each([
    ["Junior Voice", "junior-voice"],
    ["Studio Wokalne", "studio-wokalne"],
  ] as const)("submits the fixed lesson type for %s", async (lessonTitle, lessonType) => {
    render(<ContactForm lessonTitle={lessonTitle} lessonType={lessonType} testEnabled />);
    fireEvent.change(screen.getByLabelText(/kod dostępu do testu/i), { target: { value: "test-token" } });
    fireEvent.change(screen.getByLabelText(/imię i nazwisko/i), { target: { value: "Anna Kowalska" } });
    fireEvent.change(screen.getByLabelText(/adres e-mail/i), { target: { value: "anna@example.com" } });
    fireEvent.change(screen.getByLabelText(/wiadomość/i), { target: { value: "Proszę o kontakt." } });
    fireEvent.submit(screen.getByRole("group").closest("form")!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(request.body))).toMatchObject({ lessonType });
  });
});
