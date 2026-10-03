# 02 – Functional Requirements

# Purpose

This document defines the functional requirements for Tied Forever.

Each requirement describes behaviour that the application must support in the Minimum Viable Product (MVP). These requirements are implementation independent and should remain valid regardless of the underlying technology stack.

The requirements within this document form the basis for the application's database design, API specification and frontend implementation.

---

# Functional Areas

Tied Forever consists of the following functional areas:

1. Dashboard
2. Checklist
3. Guests
4. RSVP Management
5. Budget
6. Suppliers
7. Venue
8. Timeline
9. Seating Plan
10. Gift Registry
11. Documents
12. Notes
13. Settings

---

# Dashboard

## Overview

The dashboard provides a high-level overview of the current state of wedding planning.

It should present the most important information immediately after a user signs in.

## Requirements

The dashboard shall:

- Display a countdown to the wedding date.
- Display overall planning progress.
- Display upcoming tasks.
- Display recent activity.
- Display budget summary information.
- Display guest statistics.
- Display RSVP statistics.
- Display supplier summary information.
- Display upcoming payments.
- Provide quick access to frequently used actions.

The dashboard must not store its own data.

All information displayed should be calculated from the underlying application data.

---

# Checklist

## Overview

The checklist allows users to manage planning tasks throughout the wedding planning process.

## Requirements

Users shall be able to:

- Create task categories.
- Rename task categories.
- Delete task categories.
- Reorder task categories.
- Create tasks.
- Edit tasks.
- Delete tasks.
- Assign priorities.
- Assign due dates.
- Mark tasks as completed.
- Re-open completed tasks.
- Attach notes to tasks.
- Search tasks.
- Filter tasks.
- Sort tasks.

Each task shall belong to one category.

---

# Guests

## Overview

The guest module stores and manages all invited guests.

## Requirements

Users shall be able to:

- Add guests.
- Edit guests.
- Delete guests.
- Group guests into households.
- Store contact information.
- Record invitation status.
- Record RSVP status.
- Record meal choices.
- Record dietary requirements.
- Record plus ones.
- Assign guests to tables.
- Search guests.
- Filter guests.

---

# RSVP Management

## Overview

The RSVP module provides an overview of guest responses.

## Requirements

The system shall:

- Display accepted guests.
- Display declined guests.
- Display pending responses.
- Display response percentages.
- Display meal breakdowns.
- Display dietary requirement summaries.
- Display invitation statistics.

The RSVP dashboard shall be generated from guest data.

---

# Budget

## Overview

The budget module tracks planned and actual spending.

## Requirements

Users shall be able to:

- Create budget categories.
- Record planned budgets.
- Record expenses.
- Record deposits.
- Record payments.
- Record payment due dates.
- View remaining budget.
- View total spend.
- View category totals.
- View payment history.

Totals should be calculated automatically.

---

# Suppliers

## Overview

The supplier module stores all suppliers used throughout the wedding.

## Requirements

Users shall be able to:

- Create supplier categories.
- Rename supplier categories.
- Delete supplier categories.
- Add suppliers.
- Edit suppliers.
- Delete suppliers.
- Store contact information.
- Store websites.
- Store social media links.
- Record quotations.
- Record deposits.
- Record final balances.
- Store contracts.
- Store notes.
- Record supplier status.
- Search suppliers.
- Filter suppliers.

---

# Venue

## Overview

The venue module stores venue-specific information.

## Requirements

Users shall be able to:

- Store venue details.
- Store contact information.
- Store addresses.
- Store booking information.
- Store venue notes.
- Store venue documents.
- Store important timings.

---

# Timeline

## Overview

The timeline module manages the running order of the wedding day.

## Requirements

Users shall be able to:

- Create timeline events.
- Edit timeline events.
- Delete timeline events.
- Set start times.
- Set end times.
- Set durations.
- Assign colours.
- Reorder events.
- Create timeline groups.
- View the full wedding schedule.

---

# Seating Plan

## Overview

The seating module manages guest table assignments.

## Requirements

Users shall be able to:

- Create tables.
- Edit tables.
- Delete tables.
- Set table capacity.
- Assign guests.
- Remove guests.
- Move guests between tables.
- Search guests.
- View seating completion.

---

# Gift Registry

## Overview

The registry module stores gift ideas and registry links.

## Requirements

Users shall be able to:

- Add registry items.
- Edit registry items.
- Delete registry items.
- Store retailer links.
- Store prices.
- Store images.
- Record purchase status.
- Categorise registry items.

---

# Documents

## Overview

The documents module provides centralised file storage.

## Requirements

Users shall be able to:

- Create folders.
- Rename folders.
- Delete folders.
- Upload files.
- Download files.
- Preview files.
- Delete files.
- Search documents.

---

# Notes

## Overview

The notes module stores planning information that does not naturally belong elsewhere.

## Requirements

Users shall be able to:

- Create notes.
- Edit notes.
- Delete notes.
- Pin notes.
- Tag notes.
- Search notes.
- Attach files.
- Organise notes into folders.

---

# Settings

## Overview

The settings module manages application configuration.

## Requirements

Users shall be able to:

- Edit wedding information.
- Manage wedding members.
- Configure notification preferences.
- Configure appearance settings.
- Manage account information.
- Export application data.

---

# Cross-Module Requirements

The application shall:

- Support multiple users within a wedding workspace.
- Maintain a single source of truth for all information.
- Automatically update calculated values.
- Provide global search.
- Support responsive layouts.
- Maintain a complete activity history.
- Validate all user input.
- Protect user data through authentication and authorisation.

---

# Non-Functional Considerations

The application should:

- Be intuitive for first-time users.
- Load pages quickly.
- Be accessible.
- Be responsive.
- Be maintainable.
- Be scalable.
- Be secure.
