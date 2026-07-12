# Moderato Art

## Project Goal

The goal is to create a professional, minimalist, and modern website for Moderato Art.

The website will be available at:

`moderato-art.pl`

Business owner:

`Magdalena Warzecha`

The website will act as a business profile, portfolio, and contact point for parents and guardians who want to enrol a child in music classes.

## Website Characteristics

The website should be:

- professional
- minimalist
- elegant
- fast
- easy to understand
- mobile-friendly
- easy for parents and guardians to use
- focused on phone contact and the contact form
- ready for photos, banners, and promotional materials
- runnable with Docker Compose

## Target Audience

The classes are intended for children, especially preschool-aged children.

The website communication is aimed at parents and guardians because they make the decision to contact the business, enrol a child, and arrange organisational details.

The website must not imply that the offer includes classes for parents. Parents and guardians are the audience for the information, while children are the class participants.

## Website Language

The public website must be written in Polish, including the interface, marketing copy, form labels and messages, legal pages, and SEO metadata.

Project documentation and source code will remain in English unless a Polish user-facing value is required.

## Primary Website Goal

The primary goal is to encourage a parent or guardian to make contact.

Primary user actions:

- make a phone call
- submit the contact form
- ask about available dates
- reserve classes for a child

## Content Scope

### 1. Hero Section

The first screen should clearly explain what Moderato Art is.

It should include:

- the Moderato Art name
- information that the classes are led by Magdalena Warzecha
- a short message about singing and music classes for children
- information that the offer is for preschool and school-aged children
- a "Book a Class" button
- a "Call Now" button
- a photo or banner related to music, singing, or children's activities

Suggested message direction:

"Music and singing classes for children, delivered in a calm and welcoming environment."

### 2. About Moderato Art

This section should introduce the business and its owner.

It should include:

- a short introduction to Magdalena Warzecha
- the Moderato Art idea and mission
- the approach to working with children
- information about developing musicality, rhythm, and confidence in singing
- an emphasis on a calm and safe atmosphere
- information that class details are arranged individually by contact

The website must not publish a private home address or location details that the client wants to share only after contact.

### 3. Offer

Core services:

- individual singing lessons for children
- group music classes for children
- rhythm classes for children
- music classes for preschool-aged children

Each offer item should include:

- a short description
- a simple icon or photo
- information about who the class is for
- a button leading to contact or the contact form

The offer must not include classes for parents.

### 4. Why Choose Moderato Art

This section should build trust and help parents make a decision.

Potential points:

- an individual approach to each child
- learning through play
- musical development
- rhythm development
- helping children become comfortable with singing
- a welcoming atmosphere
- classes matched to the child's age
- the option to arrange details directly with the instructor

### 5. Gallery

The website should include a space for photos and banners.

The gallery may include:

- photos from classes
- thematic photos
- photos showing the atmosphere of the classes
- music-related illustrations
- promotional banners

Images should be optimised for fast loading, especially on mobile devices.

### 6. Testimonials

A testimonials section may be added as an optional element.

If the client has testimonials from parents, they can be displayed on the website.

If no testimonials are available at launch, this section can be added later.

### 7. Contact Form

The form will allow parents and guardians to submit enquiries.

Planned form fields:

- parent or guardian's full name
- email address
- phone number
- class type
- child's age
- message
- required acknowledgement of the Privacy Policy

The form should save submissions to the database.

The form must link to the Privacy Policy and state the purpose and retention period for submitted data. Separate consent should be requested only if it is legally required, for example for marketing communication.

In the future, it can be connected to a mobile application or an administration panel.

### 8. Contact

The contact section should include:

- phone number
- email address
- contact form
- optional social media links
- information that class details are arranged individually

The private home address must not be published.

## Visual Requirements

The website should use a professional and minimalist visual style.

Details such as colours, fonts, photography, and the final visual direction will be decided later.

Current visual principles:

- a bright and calm layout
- generous whitespace
- readable typography
- a limited colour palette
- prominent contact buttons
- simple sections
- subtle animations
- a mobile-first layout
- an aesthetic suitable for children's music education

## Mobile-First Design

The website should be designed primarily for mobile devices.

Key requirements for the mobile view:

- highly readable headings
- short blocks of text
- large buttons
- quick access to the phone number
- quick access to the contact form
- no content overload
- lightweight images
- smooth scrolling
- no heavy visual effects

The desktop version should extend the mobile experience, not the other way around.

## Animations

The website should include animations that start only when the user scrolls to a section.

Planned animations:

- gentle section fade-ins
- subtle bottom-to-top movement
- offer card animations
- smooth image reveals
- lightweight button animations
- an optional subtle banner effect

Animations must not slow down the website or interfere with usability.

The implementation must respect the system setting:

`prefers-reduced-motion`

When a user has reduced motion enabled, the website should reduce or disable motion effects.

## Recommended Technology Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Prisma
- PostgreSQL
- Docker
- Docker Compose

## Technology Rationale

Next.js is well suited for professional business websites, portfolios, and landing pages.

React makes it convenient to build individual website sections as components.

TypeScript reduces the risk of errors during development.

Tailwind CSS speeds up the implementation of a minimalist and responsive interface.

Framer Motion supports scroll-triggered animations.

Prisma simplifies database access.

PostgreSQL is a good choice for the contact form, a future administration panel, and a potential mobile application.

Docker Compose enables the complete application to be run with a single command.

## Docker

The project should be runnable with:

```bash
docker compose up
```

Planned containers:

- Next.js application
- PostgreSQL database
- optional Adminer or pgAdmin for local development

## Planned Project Structure

```text
moderato-art/
  app/
    api/
      contact/
        route.ts
    layout.tsx
    page.tsx
  components/
    About.tsx
    Contact.tsx
    ContactForm.tsx
    Footer.tsx
    Gallery.tsx
    Hero.tsx
    Offer.tsx
    SectionReveal.tsx
  lib/
    prisma.ts
    validations.ts
  prisma/
    schema.prisma
    migrations/
  public/
    images/
  Dockerfile
  docker-compose.yml
  .env.example
  .gitignore
  README.md
  PLAN.md
```

## Database

The database will store contact form submissions.

Planned model:

```text
ContactSubmission
```

Planned fields:

- id
- parentName
- email
- phone
- lessonType
- childAge
- message
- privacyPolicyAccepted
- privacyPolicyVersion
- privacyPolicyAcceptedAt
- status
- createdAt
- updatedAt

Planned submission statuses:

- new
- contacted
- archived

The first version only needs to save submissions to the database.

An administration panel can be added later.

## API

The initial implementation requires an endpoint for the contact form.

Planned endpoint:

```text
POST /api/contact
```

The endpoint should:

- receive form data
- validate data on the server
- save the submission to the database
- return a clear success or error message
- avoid exposing technical details to the user

The API can later be extended for a mobile application.

## Security

The contact form should include:

- client-side validation
- server-side validation
- spam protection
- submission rate limiting
- a Privacy Policy link and acknowledgement
- a documented data-retention period
- secure database storage
- no public access to submissions

The client's private information must not be published on the website.

## SEO

The website should be prepared for search engines.

Required elements:

- an appropriate page title
- a meta description
- Open Graph metadata
- semantic headings
- responsive images
- fast loading
- `sitemap.xml`
- `robots.txt`
- meaningful URLs
- content that describes the offer

Example Polish SEO phrases:

- nauka śpiewu dla dzieci
- zajęcia muzyczne dla dzieci
- rytmika dla dzieci
- rytmika dla przedszkolaków
- lekcje śpiewu dla dzieci
- Moderato Art
- Magdalena Warzecha

## Accessibility

The website should be accessible and convenient to use.

Requirements:

- sufficient colour contrast
- readable fonts
- alternative text for images
- correct heading order
- keyboard support
- clear form validation messages
- visible button and link states
- reduced animation for users with `prefers-reduced-motion`

## Implementation Plan

### Phase 1: Repository Setup

Tasks:

- create the GitHub repository
- create the Next.js project
- configure TypeScript
- configure Tailwind CSS
- add the base directory structure
- add `README.md`
- add `PLAN.md`
- add `.env.example`
- add `.gitignore`

### Phase 2: Docker and Local Environment

Tasks:

- add a `Dockerfile`
- add `docker-compose.yml`
- configure the application container
- configure the PostgreSQL container
- verify startup with `docker compose up`
- prepare environment variables

### Phase 3: Base Website Layout

Tasks:

- create the main layout
- add the Hero section
- add the About Moderato Art section
- add the Offer section
- add the Why Choose Moderato Art section
- add the Gallery section
- add the Contact section
- add the footer

### Phase 4: Mobile-First Styling

Tasks:

- implement the mobile view
- refine call-to-action buttons
- refine spacing
- refine typography
- create a responsive tablet layout
- create a responsive desktop layout

### Phase 5: Animations

Tasks:

- add a component for scroll-triggered section animations
- add section entrance animations
- add offer card animations
- add image animations
- support `prefers-reduced-motion`
- verify animation performance on mobile devices

### Phase 6: Contact Form

Tasks:

- create the contact form
- add client-side validation
- add error messages
- add a success message
- add Privacy Policy acknowledgement
- add a Privacy Policy link
- create the API endpoint

### Phase 7: Database

Tasks:

- configure Prisma
- configure PostgreSQL
- create the `ContactSubmission` model
- prepare a migration
- connect the form to the database
- test data persistence

### Phase 8: Preparation for a Future Mobile Application

Tasks:

- maintain a clear API structure
- separate form logic from the user interface
- prepare submission statuses
- preserve the option to add authentication
- preserve the option to add an administration panel

### Phase 9: Testing and Verification

Tasks:

- test the website on mobile devices
- test the website on desktop browsers
- test the contact form
- test database persistence
- test form error states
- verify SEO
- verify performance
- verify startup with Docker Compose

### Phase 10: Deployment

Tasks:

- choose hosting
- configure the `moderato-art.pl` domain
- configure SSL
- configure environment variables
- configure the production database
- deploy the website
- perform final contact form testing

## MVP

The first website version should include:

- the home page
- the Hero section
- the About Moderato Art section
- the Offer section
- the Why Choose Moderato Art section
- a gallery placeholder
- the contact form
- the Contact section
- scroll-triggered animations
- a PostgreSQL database
- Docker Compose startup

## Future Features

Potential extensions:

- administration panel
- email notifications
- mobile application integration
- booking calendar
- parent testimonials
- blog or news section
- photo management system
- social media integration
- multilingual version

## Open Decisions

To be decided later:

- detailed visual direction
- colour palette
- fonts
- final photos
- final banners
- final marketing copy
- phone number
- email address
- social media links
- Privacy Policy content
- data-retention period
- whether marketing communication consent is required
- production hosting
- whether the form should send email notifications
- whether an administration panel is required
