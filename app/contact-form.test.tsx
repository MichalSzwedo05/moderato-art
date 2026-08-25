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

  it("shows the privacy acknowledgement when the form is enabled", () => {
    render(<ContactForm enabled lessonTitle="Studio Wokalne" lessonType="studio-wokalne" />);

    expect(screen.getByRole("group")).not.toBeDisabled();
    expect(screen.getByLabelText(/polityką prywatności/i)).toBeRequired();
    expect(screen.getByText("Imię i nazwisko osoby kontaktowej")).toBeInTheDocument();
    expect(screen.getByText("Wiek uczestnika")).toBeInTheDocument();
    const message = screen.getByRole("textbox", { name: "Wiadomość (opcjonalnie)" });
    expect(message).not.toBeRequired();
    expect(message).toHaveAttribute("maxlength", "2000");
    const messageHelp = screen.getByText(/wiadomość jest opcjonalna/i);
    expect(message).toHaveAttribute("aria-describedby", messageHelp.id);
    expect(screen.getByText(/nie podawaj danych wrażliwych w wiadomości/i)).toBeInTheDocument();
  });

  it.each([
    ["Junior Voice", "junior-voice"],
    ["Studio Wokalne", "studio-wokalne"],
  ] as const)("submits the fixed lesson type for %s", async (lessonTitle, lessonType) => {
    render(<ContactForm enabled lessonTitle={lessonTitle} lessonType={lessonType} />);
    fireEvent.change(screen.getByLabelText(/imię i nazwisko/i), { target: { value: "Anna Kowalska" } });
    fireEvent.change(screen.getByLabelText(/adres e-mail/i), { target: { value: "anna@example.com" } });
    fireEvent.change(screen.getByLabelText(/wiadomość/i), { target: { value: "Proszę o kontakt." } });
    fireEvent.click(screen.getByLabelText(/polityką prywatności/i));
    fireEvent.submit(screen.getByRole("group").closest("form")!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(request.body))).toMatchObject({ lessonType });
  });

  it("lets the standalone form choose one of the form-based offers", async () => {
    render(<ContactForm enabled standalone />);

    const offerSelect = screen.getByLabelText("Rodzaj zajęć");
    expect(offerSelect).toBeRequired();
    expect(Array.from(offerSelect.querySelectorAll("option")).map((option) => option.textContent)).toEqual([
      "Wybierz rodzaj zajęć",
      "Junior Voice",
      "Studio Wokalne",
    ]);
    expect(screen.queryByRole("option", { name: "Rytmisolki" })).not.toBeInTheDocument();
    fireEvent.change(offerSelect, { target: { value: "studio-wokalne" } });
    fireEvent.change(screen.getByLabelText(/imię i nazwisko/i), { target: { value: "Anna Kowalska" } });
    fireEvent.change(screen.getByLabelText(/adres e-mail/i), { target: { value: "anna@example.com" } });
    fireEvent.change(screen.getByLabelText(/wiadomość/i), { target: { value: "Proszę o kontakt." } });
    fireEvent.click(screen.getByLabelText(/polityką prywatności/i));
    fireEvent.submit(screen.getByRole("group").closest("form")!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(request.body))).toMatchObject({ lessonType: "studio-wokalne" });
  });

  it("submits an empty optional message", async () => {
    render(<ContactForm enabled lessonTitle="Junior Voice" lessonType="junior-voice" />);
    fireEvent.change(screen.getByLabelText(/imię i nazwisko/i), { target: { value: "Anna Kowalska" } });
    fireEvent.change(screen.getByLabelText(/adres e-mail/i), { target: { value: "anna@example.com" } });
    fireEvent.click(screen.getByLabelText(/polityką prywatności/i));
    fireEvent.submit(screen.getByRole("group").closest("form")!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(request.body))).toMatchObject({ message: "" });
  });
});
