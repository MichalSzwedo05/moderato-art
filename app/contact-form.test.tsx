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

function fillChildRequiredFields() {
  fireEvent.change(screen.getByLabelText(/imię i nazwisko dziecka/i), { target: { value: "Anna Kowalska" } });
  fireEvent.change(screen.getByLabelText(/data urodzenia/i), { target: { value: "2020-05-12" } });
  fireEvent.change(screen.getByLabelText(/przedszkole/i), { target: { value: "Przedszkole Moderato" } });
  fireEvent.change(screen.getByLabelText(/grupa/i), { target: { value: "Motylki" } });
  fireEvent.change(screen.getByLabelText(/adres e-mail/i), { target: { value: "anna@example.com" } });
  fireEvent.change(screen.getByLabelText(/numer telefonu/i), { target: { value: "500 000 000" } });
  fireEvent.click(screen.getByLabelText(/akceptuję warunki/i));
  fireEvent.click(screen.getByLabelText("Nie wyrażam zgody"));
  fireEvent.click(screen.getByLabelText(/polityką prywatności/i));
}

function fillParticipantRequiredFields() {
  fireEvent.change(screen.getByLabelText(/imię i nazwisko/i), { target: { value: "Ola Nowak" } });
  fireEvent.change(screen.getByLabelText(/data urodzenia/i), { target: { value: "2005-08-20" } });
  fireEvent.change(screen.getByLabelText(/adres e-mail/i), { target: { value: "ola@example.com" } });
  fireEvent.change(screen.getByLabelText(/numer telefonu/i), { target: { value: "+48 500 000 000" } });
  fireEvent.click(screen.getByLabelText("Nie wyrażam zgody"));
  fireEvent.click(screen.getByLabelText(/polityką prywatności/i));
}

describe("ContactForm", () => {
  it("keeps every staged control disabled and explains why the form is unavailable", () => {
    render(<ContactForm lessonTitle="Junior Voice" lessonType="junior-voice" />);

    expect(screen.getAllByRole("group")[0]).toBeDisabled();
    expect(screen.getByText(/formularz zostanie aktywowany/i)).toBeInTheDocument();
  });

  it("shows the participant fields and wording for a fixed Studio Wokalne form", () => {
    render(<ContactForm enabled lessonTitle="Studio Wokalne" lessonType="studio-wokalne" />);

    expect(screen.getAllByRole("group")[0]).not.toBeDisabled();
    expect(screen.getByLabelText(/polityką prywatności/i)).toBeRequired();
    expect(screen.getByText("Imię i nazwisko")).toBeInTheDocument();
    expect(screen.getByLabelText(/imię i nazwisko/i)).toBeRequired();
    expect(screen.getByLabelText(/numer telefonu/i)).toBeRequired();
    expect(screen.getByText("Data urodzenia")).toBeInTheDocument();
    expect(screen.queryByText("Imię i nazwisko dziecka")).not.toBeInTheDocument();
    expect(screen.queryByText(/przedszkole/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Grupa")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/akceptuję warunki/i)).not.toBeInTheDocument();
    expect(screen.getByText(/wizerunku uczestnika/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Wyrażam zgodę")).toBeRequired();
    expect(screen.getByLabelText("Nie wyrażam zgody")).toBeRequired();
  });

  it("submits the fixed lesson type and child fields for Junior Voice", async () => {
    render(<ContactForm enabled lessonTitle="Junior Voice" lessonType="junior-voice" />);
    fillChildRequiredFields();
    fireEvent.submit(screen.getByLabelText(/polityką prywatności/i).closest("form")!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(request.body))).toMatchObject({
      birthDate: "2020-05-12",
      childName: "Anna Kowalska",
      group: "Motylki",
      imageConsent: "Nie wyrażam zgody",
      lessonType: "junior-voice",
      paymentAccepted: true,
      preschool: "Przedszkole Moderato",
    });
  });

  it("submits the fixed lesson type without child-only fields for Studio Wokalne", async () => {
    render(<ContactForm enabled lessonTitle="Studio Wokalne" lessonType="studio-wokalne" />);
    fillParticipantRequiredFields();
    fireEvent.submit(screen.getByLabelText(/polityką prywatności/i).closest("form")!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = JSON.parse(String(request.body));
    expect(parsed).toMatchObject({
      birthDate: "2005-08-20",
      childName: "Ola Nowak",
      imageConsent: "Nie wyrażam zgody",
      lessonType: "studio-wokalne",
      phone: "+48 500 000 000",
    });
    expect(parsed.preschool).toBeUndefined();
    expect(parsed.group).toBeUndefined();
    expect(parsed.paymentAccepted).toBeUndefined();
  });

  it("adapts the standalone form fields to the selected lesson type", () => {
    render(<ContactForm enabled standalone />);
    const offerSelect = screen.getByLabelText(/rodzaj zajęć/i);

    expect(screen.getByText("Imię i nazwisko dziecka")).toBeInTheDocument();
    expect(screen.getByText("Data urodzenia dziecka")).toBeInTheDocument();
    expect(screen.getByText(/przedszkole/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/akceptuję warunki/i)).toBeInTheDocument();
    expect(screen.getByText(/wizerunku mojego dziecka/i)).toBeInTheDocument();

    fireEvent.change(offerSelect, { target: { value: "studio-wokalne" } });

    expect(screen.getByText("Imię i nazwisko")).toBeInTheDocument();
    expect(screen.getByText("Data urodzenia")).toBeInTheDocument();
    expect(screen.queryByText("Imię i nazwisko dziecka")).not.toBeInTheDocument();
    expect(screen.queryByText("Data urodzenia dziecka")).not.toBeInTheDocument();
    expect(screen.queryByText(/przedszkole/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Grupa")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/akceptuję warunki/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/terminowej zapłaty/i)).not.toBeInTheDocument();
    expect(screen.getByText(/wizerunku uczestnika/i)).toBeInTheDocument();
  });

  it("lets the standalone form default to Junior Voice and choose among the enrollable offers", async () => {
    render(<ContactForm enabled standalone />);

    const offerSelect = screen.getByLabelText(/rodzaj zajęć/i);
    expect(offerSelect).toBeRequired();
    expect(offerSelect).toHaveValue("junior-voice");
    expect(Array.from(offerSelect.querySelectorAll("option")).map((option) => option.textContent)).toEqual([
      "Junior Voice",
      "Studio Wokalne",
      "Rehabilitacja zaburzeń głosu",
    ]);
    expect(Array.from(offerSelect.querySelectorAll("option")).every((option) => option.textContent !== "Rytmisolki")).toBe(true);
    fireEvent.change(offerSelect, { target: { value: "studio-wokalne" } });
    fillParticipantRequiredFields();
    fireEvent.submit(screen.getByLabelText(/polityką prywatności/i).closest("form")!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = JSON.parse(String(request.body));
    expect(parsed).toMatchObject({ lessonType: "studio-wokalne" });
    expect(parsed.preschool).toBeUndefined();
    expect(parsed.group).toBeUndefined();
    expect(parsed.paymentAccepted).toBeUndefined();
  });

  it("submits the three optional address fields grouped together", async () => {
    render(<ContactForm enabled standalone />);
    fireEvent.change(screen.getByLabelText(/ulica i numer/i), { target: { value: "Krokusowa 25" } });
    fireEvent.change(screen.getByLabelText(/kod pocztowy/i), { target: { value: "86-012" } });
    fireEvent.change(screen.getByLabelText(/miasto/i), { target: { value: "Żołędowo" } });
    fillChildRequiredFields();
    fireEvent.submit(screen.getByLabelText(/polityką prywatności/i).closest("form")!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(request.body))).toMatchObject({
      addressStreet: "Krokusowa 25",
      postalCode: "86-012",
      city: "Żołędowo",
    });
  });

  it("submits without the optional address fields", async () => {
    render(<ContactForm enabled lessonTitle="Junior Voice" lessonType="junior-voice" />);
    fireEvent.change(screen.getByLabelText(/imię i nazwisko dziecka/i), { target: { value: "Anna Kowalska" } });
    fireEvent.change(screen.getByLabelText(/data urodzenia/i), { target: { value: "2020-05-12" } });
    fireEvent.change(screen.getByLabelText(/przedszkole/i), { target: { value: "Przedszkole Moderato" } });
    fireEvent.change(screen.getByLabelText(/grupa/i), { target: { value: "Motylki" } });
    fireEvent.change(screen.getByLabelText(/adres e-mail/i), { target: { value: "anna@example.com" } });
    fireEvent.change(screen.getByLabelText(/numer telefonu/i), { target: { value: "500 000 000" } });
    fireEvent.click(screen.getByLabelText(/akceptuję warunki/i));
    fireEvent.click(screen.getByLabelText("Wyrażam zgodę"));
    fireEvent.click(screen.getByLabelText(/polityką prywatności/i));
    fireEvent.submit(screen.getByLabelText(/polityką prywatności/i).closest("form")!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = JSON.parse(String(request.body));
    expect(parsed.addressStreet).toBeUndefined();
    expect(parsed.postalCode).toBeUndefined();
    expect(parsed.city).toBeUndefined();
    expect(parsed).toMatchObject({ imageConsent: "Wyrażam zgodę", phone: "500 000 000" });
  });

  it("shows a green success popup after a successful submission", async () => {
    render(<ContactForm enabled standalone />);
    fillChildRequiredFields();
    fireEvent.submit(screen.getByLabelText(/polityką prywatności/i).closest("form")!);

    const popup = await screen.findByRole("status");
    expect(popup).toHaveAttribute("data-kind", "success");
    expect(popup).toHaveTextContent("Wysłano");
  });

  it("shows a red error popup when the submission fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ message: "Sprawdź poprawność formularza." }) });
    render(<ContactForm enabled standalone />);
    fillChildRequiredFields();
    fireEvent.submit(screen.getByLabelText(/polityką prywatności/i).closest("form")!);

    const popup = await screen.findByRole("alert");
    expect(popup).toHaveAttribute("data-kind", "error");
    expect(popup).toHaveTextContent("Sprawdź poprawność formularza.");
  });
});
