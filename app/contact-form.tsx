export function ContactForm() {
  return (
    <form className="contact-form" aria-describedby="contact-form-status">
      <fieldset disabled>
        <legend>Formularz kontaktowy</legend>
        <label>
          Imię i nazwisko rodzica lub opiekuna
          <input autoComplete="name" name="name" placeholder="Np. Anna Kowalska" type="text" />
        </label>
        <label>
          Adres e-mail
          <input autoComplete="email" name="email" placeholder="twoj@email.pl" type="email" />
        </label>
        <label>
          Numer telefonu
          <input autoComplete="tel" name="phone" placeholder="Np. 500 000 000" type="tel" />
        </label>
        <label>
          Rodzaj zajęć
          <select defaultValue="" name="lessonType">
            <option disabled value="">Wybierz zajęcia</option>
            <option value="rytmika">Rytmisolki</option>
            <option value="junior-voice">Junior Voice</option>
            <option value="studio-wokalne">Studio Wokalne</option>
          </select>
        </label>
        <label>
          Wiek dziecka
          <select defaultValue="" name="childAgeRange">
            <option disabled value="">Wybierz przedział wieku</option>
            <option value="3-5">3–5 lat</option>
            <option value="6-9">6–9 lat</option>
            <option value="10-15">10–15 lat</option>
            <option value="16-plus">16 lat lub więcej</option>
          </select>
        </label>
        <label>
          Wiadomość
          <textarea name="message" placeholder="Napisz, jakich zajęć szukasz. Nie podawaj danych wrażliwych dziecka." rows={4} />
        </label>
        <button className="button button-primary" type="submit">
          Formularz chwilowo niedostępny
        </button>
      </fieldset>
      <small id="contact-form-status">Formularz zostanie aktywowany po zatwierdzeniu zasad przetwarzania danych i infrastruktury.</small>
    </form>
  );
}
