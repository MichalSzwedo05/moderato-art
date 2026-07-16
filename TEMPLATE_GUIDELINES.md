# Website Template Guidelines

## Purpose

Create a professional, warm, and modern Polish-language website for Moderato Art, owned by Magdalena Warzecha-Hiller. The template should encourage parents and guardians to contact the instructor about music and singing classes for children.

## Audience

- Children are the participants of the classes.
- Parents and guardians are the website visitors and decision-makers.
- Do not imply that the offer includes classes for parents.

## Content and Tone

- All public text, labels, messages, metadata, and legal content must be in Polish.
- Use a warm, calm, clear, and trustworthy tone.
- Keep copy concise and easy to scan on mobile devices.
- Use `BIOGRAPHY.md` as the source for the instructor biography.
- Do not publish a private home address or detailed class location.

## Homepage Structure

1. Header with logo or brand name, navigation, and a visible contact action.
2. Hero with the Moderato Art name, a short description of music and singing classes for children, and "Zapisz dziecko" and "Zadzwoń" calls to action.
3. About section introducing Magdalena Warzecha-Hiller and the Moderato Art approach.
4. Offer section for individual singing lessons, group music classes, rhythm classes, and preschool music classes.
5. Benefits section explaining the individual approach, learning through play, musical development, and welcoming atmosphere.
6. Gallery placeholder for class, thematic, and promotional images.
7. Blog preview that links to published articles.
8. Contact section with phone number, email address, contact form, and optional social links.
9. Footer with contact information and legal links.

## Visual Direction

- Mobile-first, bright, calm, elegant, and minimal.
- Use generous whitespace, readable typography, a limited colour palette, and clear visual hierarchy.
- Keep call-to-action buttons prominent and easy to tap.
- Use music and child-friendly imagery without making the design overly childish.
- Use subtle scroll-triggered transitions only when they do not harm performance or usability.
- Respect `prefers-reduced-motion`.

## Responsive and Accessible Design

- Design for small screens first, then extend to tablet and desktop.
- Use readable heading sizes, short text blocks, large touch targets, and lightweight responsive images.
- Ensure sufficient contrast, keyboard navigation, visible focus states, correct heading order, and meaningful image alternative text.

## Contact Form

- Target parents and guardians.
- Include name, email, phone number, class type, child's age, message, and Privacy Policy acknowledgement.
- Provide clear validation and success or error messages in Polish.
- Do not expose technical errors to visitors.

## Blog and Article Management

- Provide a public blog listing and individual article pages.
- Published articles need a title, publication date, content, optional cover image, and SEO-friendly URL.
- An authenticated administrator must be able to create, edit, save drafts, publish, unpublish, and archive articles.
- Draft and archived articles must not be publicly accessible.

## QR Code Requirement

- The final website must be available at a public HTTPS URL.
- Generate a QR code that points to the final canonical website URL.
- Verify that scanning the QR code opens the website on a mobile device.

## Assets and Decisions Needed

- logo or final wordmark
- colour palette and font choices
- professional photos and promotional banners
- phone number and email address
- social media links
- Privacy Policy content

## Design Reference: Duolingo Style Guide

This section preserves the provided reference for the visual template.

### Fonts

- Primary font: `Nunito` from Google Fonts, weights 400, 500, 600, 700, 800, and 900.
- Display and heading font: `Feather Bold` from `https://db.onlinewebfonts.com/c/14936bb7a4b6575fd2eee80a3ab52cc2?family=Feather+Bold`.
- Font stack fallback: `Nunito`, `DIN Round Pro`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`.

### Color Variables

```css
--green: rgb(88, 204, 2);
--green-hover: rgb(75, 178, 0);
--green-shadow: #61B800;
--dark-blue: rgb(16, 15, 62);
--blue: rgb(28, 176, 246);
--gray-text: rgb(75, 75, 75);
--gray-light: rgb(119, 119, 119);
--border-color: rgb(229, 229, 229);
--nav-text: rgb(175, 175, 175);
--footer-green: #4EC604;
--red: #FF4B4B;
--orange: #FF9600;
--golden: #FFC800;
```

### Structure and Layout

#### Fixed Navbar

- Height: 64px.
- White background and bottom border.
- Left side: Duolingo logo image (`https://d35aaqx5ub95lt.cloudfront.net/images/splash/f92d5f2f7d56636846861c458c0d0b6c.svg`, 140px by 33px), followed by a 1px vertical divider, 24px tall, then the `STYLE GUIDE` label.
- `STYLE GUIDE`: 11px, uppercase, 1.5px letter spacing, gray.
- Right side: horizontal links for `Colors`, `Type`, `Buttons`, `Cards`, and `Components`.
- Navigation links: 13px, bold, uppercase, 0.5px letter spacing, gray; green hover and active states, with a subtle green background on hover.
- Maximum width: 1440px, centred.

#### Hero Section

- Centred, with a green-to-white gradient background.
- Headline: `duolingo design`, Feather Bold, 52px, green (`#58CC02`), lowercase.
- Description: `A comprehensive visual reference for the Duolingo design system covering colors, typography, button variants, cards, and UI components.`
- Description styling: 17px, gray-light, maximum width 520px, 1.5 line height.
- Two buttons: primary `GET STARTED` and secondary `I ALREADY HAVE AN ACCOUNT`.
- Both buttons: 48px height, 24px horizontal padding, 15px font size, 700 weight, uppercase.
- Primary button: green, white text, 12px radius, 4px green box shadow for a 3D effect.
- Secondary button: transparent, 2px gray border, blue text, 4px gray box shadow for a 3D effect.
- Active state: remove box shadow and use `translateY(4px)`.
- Padding: 56px top, 40px horizontal, 40px bottom.

#### Main Grid

- Two-column grid with no gap and a 1440px maximum width.
- Each panel has 36px vertical and 40px horizontal padding, a bottom border, and a right border.
- Panels in the even column have no right border.
- Panel labels: 11px, 800 weight, uppercase, 2px letter spacing, `--nav-text` color.
- Add a 1px line extending to the right of the label with an `::after` pseudo-element.

### Panels

#### Panel 1: Color Palette

- Light panel with a grid of 12 color swatches.
- Grid: `repeat(auto-fill, minmax(100px, 1fr))` with a 12px gap.
- Swatch: square aspect ratio, 12px radius, 1px `rgba(0, 0, 0, 0.06)` border.
- Swatch hover: `scale(1.05)` and `0 8px 24px rgba(0, 0, 0, 0.12)` shadow.
- Name: 12px, bold, `--gray-text`.
- Hex value: 10px, semi-bold, `--gray-light`.

| Name | Value | Hex |
| --- | --- | --- |
| Green | `rgb(88, 204, 2)` | `#58CC02` |
| Green Hover | `rgb(75, 178, 0)` | `#4BB200` |
| Blue | `rgb(28, 176, 246)` | `#1CB0F6` |
| Dark Blue | `rgb(16, 15, 62)` | `#100F3E` |
| Red | `#FF4B4B` | `#FF4B4B` |
| Orange | `#FF9600` | `#FF9600` |
| Golden | `#FFC800` | `#FFC800` |
| Footer Green | `#4EC604` | `#4EC604` |
| Gray Text | `rgb(75, 75, 75)` | `#4B4B4B` |
| Gray Light | `rgb(119, 119, 119)` | `#777777` |
| Nav Text | `rgb(175, 175, 175)` | `#AFAFAF` |
| Border | `rgb(229, 229, 229)` | `#E5E5E5` |

#### Panel 2: Typography

- Light panel with a vertical stack and 20px gaps.
- Each row is flex, baseline-aligned, with a 20px gap.
- Meta column: 80px wide and right aligned. Size is blue, 11px, bold; weight label is 10px and `--nav-text`.

| Style | Sample | Specification |
| --- | --- | --- |
| Display | `Display` | 48px, Feather Bold, green |
| Heading One | `Heading One` | 32px, bold 700, `--gray-text` |
| Heading Two | `heading two` | 28px, Feather Bold, green, lowercase |
| Body | `Body text for paragraphs and descriptions with comfortable reading line-height.` | 18px, medium 500, `--gray-light`, 1.6 line height |
| Caption | `CAPTION LABEL` | 14px, bold 700, uppercase, `--nav-text`, 0.5px letter spacing |
| Utility | `Small utility text for metadata and hints` | 12px, semi-bold 600, `--gray-light` |

#### Panel 3: Button Variants

- Light panel with a vertical stack and 16px gaps.
- Rows have an 80px label: 10px, bold, uppercase, 1px letter spacing, `--nav-text`.
- Button groups have a 12px gap and wrap as needed.

| Row | Buttons |
| --- | --- |
| Primary | `GET STARTED`: green background, white text, 4px green shadow. `SMALL`: 36px height, 13px font, 16px padding, 10px radius, 3px shadow. `DISABLED`: primary with 0.45 opacity and `pointer-events: none`. |
| Secondary | `LEARN MORE`: transparent, 2px `#CFCFCF` border, blue text, 4px `#CFCFCF` shadow. `SMALL`: matching small sizing. `DISABLED`: 0.45 opacity. |
| Danger | `DELETE`: `#FF4B4B` background, white text, 4px `#CC3C3C` shadow. `REMOVE`: small variant. |
| Ghost | `VIEW ALL`: no background, border, or shadow; green text; green background at 0.08 opacity on hover. |

#### Panel 4: Dark Theme Buttons

- `--dark-blue` background.
- Section label uses white at 35% opacity; its line uses white at 10% opacity.
- First row: `GET STARTED` primary and `TRY 1 WEEK FREE`, with white background, dark-blue text, and 4px `#88879F` shadow.
- The white button hover background is `#c8f040`.
- Second row contains small variants of both buttons.

#### Panel 5: Cards

- Light panel with a two-column card grid and 16px gap.
- Card: white background, 2px `--border-color` border, 16px radius.
- Card hover: `translateY(-4px)` and `0 12px 32px rgba(0, 0, 0, 0.08)` shadow.

Card 1:

- Image: `https://images.pexels.com/photos/4145354/pexels-photo-4145354.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop`, 120px height, cover.
- Tag: `NEW`, green text, green background at 10% opacity, 11px, 800 weight, uppercase, 6px radius, 3px by 8px padding.
- Title: `Spanish for Beginners`, 16px, bold, `--gray-text`.
- Description: `Start your language journey with interactive lessons designed to build fluency.`, 13px, `--gray-light`, 1.5 line height.
- Footer: 12px top border and 12px by 16px padding; `12 UNITS` on the left, `START` on the right.
- Footer labels: 12px, bold, uppercase; left uses `--nav-text`, right uses blue and 0.7 opacity on hover.

Card 2:

- Image: `https://images.pexels.com/photos/267669/pexels-photo-267669.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop`.
- Tag: `POPULAR`, blue text and blue background at 10% opacity.
- Title: `French Conversations`.
- Description: `Practice real-world dialogue and improve pronunciation with native speakers.`
- Footer: `8 UNITS` and `CONTINUE`.

#### Panel 6: Dark Theme Cards

- `--dark-blue` background with a two-column grid.
- Cards have `rgba(255, 255, 255, 0.06)` background and `rgba(255, 255, 255, 0.08)` border.
- Titles are white; descriptions use white at 50% opacity.
- Footer border uses white at 8% opacity; footer text uses white at 30% opacity.
- No images.

Card 1:

- Tag: `SUPER`, golden text (`#FFC800`) and golden background at 15% opacity.
- Title: `Unlimited Hearts`.
- Description: `Keep learning without interruption with Super Duolingo benefits.`
- Footer: `PREMIUM` and `UPGRADE`.

Card 2:

- Tag: `PRO`, orange text (`#FF9600`) and orange background at 15% opacity.
- Title: `Mastery Quizzes`.
- Description: `Challenge yourself with advanced assessments to test your skill level.`
- Footer: `ADVANCED` and `TRY NOW`.

#### Panel 7: Components

- Light panel with a vertical stack and 20px gaps.
- Group labels: 10px, bold, uppercase, 1px letter spacing, `--nav-text`.

Badges:

- Flex row with 8px gaps.
- Pill shape: 4px by 10px padding, 20px radius, 12px, bold, uppercase.
- `COMPLETED`: green text and green background at 12% opacity.
- `IN PROGRESS`: blue text and blue background at 12% opacity.
- `FAILED`: red text and red background at 12% opacity.
- `STREAK`: orange text and orange background at 12% opacity.
- `PREMIUM`: `#b8920f` text and golden background at 15% opacity.

Input and button:

- Flex row with a 12px gap.
- Input: `flex: 1`, 48px height, 16px padding, 2px `--border-color` border, 12px radius, 15px font, 600 weight.
- Input focus border changes to blue.
- Placeholder: `--nav-text`, 500 weight.
- Primary button: `SUBSCRIBE`.

Toggle:

- Flex row with two toggles.
- Toggle dimensions: 48px by 28px.
- Track: `--border-color` background, 14px radius.
- Thumb: 22px by 22px, white circle, 3px from edges, `0 1px 3px rgba(0, 0, 0, 0.15)` shadow.
- Checked track is green; thumb moves 20px right.
- Labels: `Sound effects` and `Animations`, 14px, 600 weight.
- The first toggle is checked by default.

Progress:

- Three progress bars in a column with 10px gaps.
- Each row is flex with a 12px gap.
- Bar: `flex: 1`, 12px height, `--border-color` background, 6px radius, overflow hidden.
- Fill: 6px radius and `width 0.6s ease` transition.
- Value: 12px, bold, 32px wide, right aligned.
- Values: 85% green, 60% blue, and 35% orange.

Tooltips and streak:

- Flex row with 16px gaps and centred alignment.
- Tooltip trigger: `Hover me`, 13px, bold, green text, green background at 8% opacity, 8px by 16px padding, 8px radius.
- Hover state shows an upper tooltip: dark-blue background, white 12px, 600 weight text, 6px by 12px padding, 8px radius, and a 5px downward arrow using `::after`.
- Streak counter: inline flex, 6px gap, 6px by 14px padding, orange background at 10% opacity, 20px radius; fire icon at 18px and `42` at 16px, 800 weight, orange.

#### Panel 8: Dark Theme Components

- `--dark-blue` background.
- Labels use white at 30% opacity.

Language pills:

- Flex row with 8px gaps.
- Each pill: inline flex, 6px gap, 6px by 12px padding, 2px border, 12px radius, pointer cursor.
- Hover state: green border with subtle green background.
- Active `Spanish`: green border, green background at 8% opacity, white text, flag `https://d35aaqx5ub95lt.cloudfront.net/vendor/59a90a2cedd48b751a8fd22014768fd7.svg`.
- Inactive `French`: white border at 12% opacity, white text at 70% opacity, flag `https://d35aaqx5ub95lt.cloudfront.net/vendor/482fda142ee4abd728ebf4ccce5d3307.svg`.
- `German` flag: `https://d35aaqx5ub95lt.cloudfront.net/vendor/c71db846ffab7e0a74bc6971e34ad82e.svg`.
- `Japanese` flag: `https://d35aaqx5ub95lt.cloudfront.net/vendor/edea4fa18ff3e7d8c0282de3f102aaed.svg`.
- Flag images: 24px by 18px and `object-fit: contain`.
- Pill text: 13px and bold.

Avatar group:

- Flex row with overlapping circular 36px avatars.
- Avatars have 50% radius, 2px white border, and `-8px` left margin except for the first avatar.
- Image 1: `https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop`.
- Image 2: `https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop`.
- Image 3: `https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop`.
- Count badge: `+5`, same 36px circle, `#f0f0f0` background, 11px, 800 weight, `--gray-light`.
- Accompanying text: `8 learners active`, 13px, 600 weight, white at 50% opacity.

Dark progress:

- Two bars with a white 8% opacity track and values at white 60% opacity.
- 72% golden fill and 45% green fill.

Dark badges:

- `MASTERED`: green background at 15% opacity and `#7ADB2E` text.
- `REVIEW`: blue background at 15% opacity and `#4DC4F8` text.
- `CROWN`: golden background at 15% opacity and `#FFC800` text.

### Responsive Breakpoints

#### 900px and Below

- Main grid becomes a single column with no right borders.
- Hero heading: 36px.
- Hide navigation links.
- Card grids become single column.
- Stack hero buttons vertically with a 280px maximum width.

#### 600px and Below

- Hero padding: 40px 20px 32px.
- Hero heading: 28px.
- Panel padding: 28px 20px.
- Color grid: three columns.
- Hide typography meta column.
- Display type: 32px.
- Hide button labels.
- Input row uses column direction.
