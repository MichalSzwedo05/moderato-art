# Instrukcja użytkownika CMS Moderato Art

Ten dokument jest przeznaczony dla osób, które zarządzają stroną Moderato Art, ale nie muszą znać programowania. Wyjaśnia, gdzie znaleźć najważniejsze funkcje i co stanie się po wykonaniu danej czynności.

## 1. Do czego służy CMS?

CMS, czyli panel administracyjny, pozwala zarządzać treściami widocznymi na stronie:

- zdjęciami galerii,
- artykułami,
- zgłoszeniami wysłanymi przez formularz kontaktowy.

Zmiany zapisane w panelu mogą stać się widoczne publicznie. Przed zapisaniem sprawdź tekst, adres artykułu i zdjęcia.

## 2. Logowanie i wylogowanie

1. Otwórz adres panelu: `/admin`.
2. Zależnie od konfiguracji zobaczysz jedną z dwóch metod logowania:
   - nazwę użytkownika i hasło,
   - adres e-mail i jednorazowy link logowania.
3. Po zalogowaniu trafisz do głównego panelu.
4. Po zakończeniu pracy kliknij **Wyloguj**.

Sesja administratora jest czasowa. Jeśli panel poprosi o ponowne logowanie, zaloguj się jeszcze raz. Link logowania jest ważny 15 minut — nie przekazuj go innym osobom ani nie zostawiaj go otwartego na współdzielonym komputerze.

## 3. Jak odnaleźć się w panelu głównym?

W górnej części panelu znajdziesz:

- **Pobierz instrukcję** — pobiera ten przewodnik jako plik Markdown,
- **Zgłoszenia kontaktowe** — otwiera skrzynkę wiadomości z formularza,
- **Wyloguj** — kończy sesję administratora.

Niżej znajdują się dwa główne obszary:

1. **Galeria zdjęć** — zdjęcia przestrzeni i ich kolejność.
2. **Artykuły** — tworzenie, edycja, publikowanie, archiwizowanie i usuwanie artykułów.

## 4. Galeria zdjęć

### Dodawanie zdjęcia

1. Wybierz plik zdjęcia.
2. Wpisz **Tekst alternatywny**. Opisz krótko, co znajduje się na zdjęciu, na przykład: `Sala z pianinem i matami do zajęć`.
3. Sprawdź podgląd.
4. Kliknij **Dodaj zdjęcie**.

Akceptowane są pliki JPEG, PNG i WebP o rozmiarze do 8 MB. Tekst alternatywny pomaga osobom korzystającym z czytników ekranu i powinien opisywać zdjęcie, a nie zawierać jego nazwę techniczną.

### Zmienianie kolejności

- Przy zdjęciach użyj przycisków **↑** i **↓**.
- Po ustawieniu kolejności kliknij **Zapisz kolejność**.
- **Cofnij zmiany** przywraca ostatnią zapisaną kolejność.
- Pierwsze cztery zdjęcia są pokazywane w skróconej galerii na stronie głównej. Pełna galeria pokazuje wszystkie aktywne zdjęcia.

Jeśli kolejność została zmieniona, najpierw ją zapisz albo cofnij. Dopiero wtedy dodawaj lub usuwaj zdjęcia.

### Usuwanie zdjęcia

Kliknij **Usuń** przy wybranym zdjęciu i potwierdź. Usunięcie jest trwałe i nie ma przycisku „cofnij”, dlatego przed usunięciem upewnij się, że wybrałeś właściwy plik.

## 5. Artykuły

### Tworzenie artykułu

W formularzu **Nowy artykuł** uzupełnij:

- **Tytuł** — tytuł widoczny dla czytelników,
- **Adres artykułu** — krótki adres URL; jest tworzony automatycznie z tytułu,
- **Kategoria** — na przykład `Muzyka` albo `Dla rodziców`,
- **Krótki opis** — zapowiedź widoczna na karcie artykułu,
- **Adres obrazka** — opcjonalny adres obrazu zaczynający się od `https://`; panel nie wysyła tutaj pliku,
- **Widoczność** — wybierz szkic, publikację lub archiwum,
- **Treść artykułu (Markdown)** — właściwy tekst artykułu.

Adres artykułu powinien zawierać małe litery, cyfry i myślniki, na przykład `jak-wspierac-glos-dziecka`. Nie używaj spacji, polskich znaków ani znaków specjalnych. Jeśli adres jest już zajęty, zapisz inną wersję.

Adres obrazka musi zaczynać się od `https://`. Adres `http://` albo lokalna ścieżka nie zostaną zaakceptowane.

Po prawej stronie formularza znajduje się **Podgląd**. Pokazuje on przybliżony wygląd artykułu przed zapisaniem.

### Proste formatowanie tekstu

Treść można formatować bez znajomości HTML. Przykład:

```markdown
## Nagłówek

To jest **ważne zdanie**.

- pierwszy punkt
- drugi punkt
```

Pusty wiersz pomaga oddzielić akapity. Po zapisaniu sprawdź artykuł na stronie publicznej.

### Statusy artykułu

- **Szkic — tylko w panelu** — artykuł jest zapisany, ale nie jest widoczny dla odwiedzających.
- **Opublikowany — widoczny na stronie** — artykuł może pojawić się na stronie głównej i pod swoim adresem.
- **Archiwum — ukryty na stronie** — artykuł zostaje w panelu, ale znika z części publicznej.

Jeśli nie ma żadnego opublikowanego artykułu, sekcja artykułów oraz jej odnośniki na stronie głównej są ukryte. Po opublikowaniu pierwszego artykułu sekcja pojawi się automatycznie.

### Edycja, archiwizacja i trwałe usuwanie

1. Na liście **Ostatnio zmienione** rozwiń **Edytuj artykuł**.
2. Wprowadź zmiany i kliknij **Zapisz zmiany**.
3. Aby tylko ukryć artykuł, wybierz status **Archiwum**.
4. Aby usunąć go bezpowrotnie, kliknij **Usuń artykuł** i potwierdź komunikat.

Archiwizacja jest bezpieczniejsza, bo zachowuje artykuł w panelu. Trwałe usunięcie usuwa rekord i nie można go cofnąć.

Uwaga: zapis opublikowanego artykułu ponownie ustawia jego datę publikacji. Po edycji taki artykuł może pojawić się wyżej na liście i mieć nową datę widoczną na stronie.

## 6. Zgłoszenia kontaktowe

Kliknij **Zgłoszenia kontaktowe** w nagłówku panelu.

- Domyślnie widoczne są tylko imiona i nazwiska.
- Rozwiń zgłoszenie, aby zobaczyć e-mail, telefon, wybrane zajęcia, wiek uczestnika, wiadomość i informacje o prywatności.
- Użyj filtra **Status zgłoszenia**, aby wyświetlić nowe, obsłużone albo zarchiwizowane rekordy.
- Przyciski **Nowsze** i **Starsze** służą do przechodzenia między stronami.
- Kliknięcie adresu e-mail lub telefonu otwiera odpowiednią aplikację.

Panel pokazuje statusy i pozwala je filtrować, ale obecna wersja nie ma przycisku do zmiany statusu zgłoszenia.

### Retencja i usuwanie danych

Przy zgłoszeniu może być widoczna planowana data usunięcia. Jeśli jej nie ma, panel pokaże ostrzeżenie, że termin retencji wymaga decyzji administratora.

Przycisk **Usuń zgłoszenie** usuwa rekord trwale. Przed usunięciem upewnij się, że nie jest już potrzebny.

### Eksport XML

Przycisk **Pobierz XML** tworzy plik ze wszystkimi przechowywanymi zgłoszeniami. Nie ogranicza się do wybranego statusu ani aktualnej strony listy. Eksport zawiera dane osobowe, dlatego:

- pobieraj go tylko wtedy, gdy jest potrzebny,
- przechowuj go w bezpiecznym miejscu,
- nie wysyłaj go przypadkowym osobom,
- usuń kopię, gdy nie jest już potrzebna.

Eksport jest ograniczony do maksymalnie 1000 zgłoszeń i 4 MB. Jeśli dane przekroczą któryś z tych limitów, pobieranie zostanie odrzucone. Filtr na stronie służy do przeglądania, a nie do zawężania eksportu.

## 7. Co zrobić, gdy coś nie działa?

- **Panel jest chwilowo niedostępny** — sprawdź później lub skontaktuj się z osobą odpowiedzialną za konfigurację CMS.
- **Nie można zapisać artykułu** — sprawdź wymagane pola, długość tekstu i unikalność adresu artykułu.
- **Nie można dodać zdjęcia** — sprawdź format, rozmiar pliku i tekst alternatywny.
- **Nie można dodać lub usunąć zdjęcia po zmianie kolejności** — zapisz kolejność albo kliknij **Cofnij zmiany**.
- **Pobieranie pliku nie rozpoczęło się** — odśwież panel i spróbuj ponownie. Nie klikaj wielokrotnie, jeśli przeglądarka już rozpoczęła pobieranie.
- **Zmiana nie jest widoczna na stronie** — odśwież stronę publiczną. Przy publikowaniu artykułu sprawdź, czy wybrano status **Opublikowany**.

Jeśli problem powtarza się po ponowieniu próby, zapisz dokładny komunikat i przekaż go osobie opiekującej się stroną. Nie przesyłaj jej hasła ani linku logowania.

## 8. Dobra praktyka przed wylogowaniem

- sprawdź, czy zapisany artykuł ma właściwy status,
- upewnij się, że kolejność galerii została zapisana,
- zamknij lub bezpiecznie usuń pobrane eksporty XML,
- nie pozostawiaj otwartego panelu na współdzielonym komputerze,
- kliknij **Wyloguj**.
