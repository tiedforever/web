# 06 – Database Schema

## Purpose

This document defines the logical database schema for Tied Forever.

It describes how data is stored, how entities relate to one another, and the constraints required to ensure data integrity.

This document is database-agnostic and serves as the blueprint for the PostgreSQL database and Prisma ORM models.

---

## Design Principles

The database should follow these principles:

- Every entity belongs to a single wedding unless explicitly global.
- Minimise duplicated data.
- Calculate derived values rather than storing them.
- Support future expansion without requiring structural redesign.
- Enforce referential integrity.
- Use UUID primary keys throughout.
- Store timestamps on all entities.
- Soft delete only where business requirements justify it.

---

## Core Ownership Model

```text
User
    │
    └── WeddingMember
            │
            └── Wedding
                    │
                    ├── Tasks
                    ├── Guests
                    ├── Suppliers
                    ├── Budget
                    ├── Timeline
                    ├── Seating
                    ├── Registry
                    ├── Documents
                    └── Notes
```

Every entity below the Wedding level must reference a `wedding_id`.

---

## Authentication Domain

### User

Stores application users.

Primary Key

- `id`

Relationships

- One User has many Wedding Memberships.

---

### Wedding

Stores a single wedding workspace.

Primary Key

- `id`

Relationships

- One Wedding has many Wedding Members.
- One Wedding has many Guests.
- One Wedding has many Suppliers.
- One Wedding has many Tasks.
- One Wedding has many Documents.
- One Wedding has many Notes.

---

### Wedding Member

Links users to weddings.

Relationships

- User → Wedding
- Wedding → User

Stores:

- `role`
- `joined_at`
- `invitation status`

---

## Planning Domain

### Task Category

Relationships

Wedding

↓

Many Task Categories

↓

Many Tasks

Stores:

- `name`
- `icon`
- `colour`
- `display order`

---

### Task

Relationships

Task Category

↓

Many Tasks

Stores:

- `title`
- `description`
- `status`
- `priority`
- `assignee`
- `due date`
- `recurring configuration`
- `parent task`
- `completion date`

Supports:

- attachments
- links
- subtasks

---

## Guest Domain

### Household

Optional grouping of guests.

Stores:

- `address`
- `household name`

One Household

↓

Many Guests

---

### Guest

Stores:

- `personal information`
- `invitation type`
- `RSVP`
- `meal choice`
- `dietary requirements`
- `attendance`
- `plus one`
- `seating assignment`

---

### RSVP

Stores:

- `response`
- `response date`
- `message`

Supports:

- manual overrides
- online responses

---

### Meal Option

Wedding configurable.

Stores:

- `name`
- `display order`

---

### RSVP Question

Wedding configurable.

Allows custom RSVP questions.

Supports:

- text
- choice
- boolean

---

## Supplier Domain

### Supplier Category

Stores:

- `name`
- `icon`
- `colour`

User configurable.

---

### Supplier

Stores:

- `contact information`
- `status`
- `quote`
- `deposit`
- `final payment`
- `notes`

Supports:

- documents
- images
- website
- social links

---

### Supplier Contact

Stores individual contacts belonging to suppliers.

---

## Budget Domain

### Budget Category

User configurable.

---

### Expense

Stores:

- `planned amount`
- `actual amount`
- `supplier`
- `notes`

---

### Payment

Stores:

- `amount`
- `due date`
- `payment date`
- `payment status`

Supports:

- deposits
- final balances

---

## Timeline Domain

### Timeline Group

User configurable.

Examples:

- Bride
- Groom
- Ceremony
- Reception

---

### Timeline Event

Stores:

- `title`
- `description`
- `start time`
- `end time`
- `duration`
- `colour`
- `location`

---

## Seating Domain

### Table

Stores:

- `name`
- `capacity`
- `shape`
- `position`

---

### Seating Assignment

Links:

Guest

↓

Table

Stores:

- `seat number` (optional)

---

## Registry Domain

### Registry Item

Stores:

- `retailer`
- `link`
- `image`
- `price`
- `purchased status`

---

## Documents Domain

### Document Folder

User configurable.

---

### Document

Stores metadata only.

Actual files are stored externally.

Metadata includes:

- `filename`
- `storage key`
- `mime type`
- `uploaded by`

---

## Notes Domain

### Note

Supports:

- markdown
- attachments
- tags

---

### Tag

Reusable across:

- notes
- documents
- suppliers
- guests (future)

---

## Notifications

Stores:

- `recipient`
- `title`
- `message`
- `read state`

---

## Activity Log

Append-only.

Stores:

- `actor`
- `action`
- `affected entity`
- `timestamp`
- `metadata`

---

## Derived Data

The following values should never be stored:

- Planning progress
- Budget totals
- Guest counts
- RSVP percentages
- Supplier totals
- Dashboard statistics
- Timeline completion
- Seating completion

These values should always be calculated.

---

## Database Constraints

The application should enforce the following rules:

- Every wedding must have at least one Owner.
- A user may belong to multiple weddings.
- A guest belongs to at most one household.
- A guest may only have one seating assignment.
- A task belongs to exactly one category.
- Categories may not be deleted while containing data unless the user explicitly chooses how to handle existing records.
- Every supplier belongs to one category.
- Every payment references either a supplier or an expense.
- Every document belongs to one folder.
- Every note belongs to one wedding.

---

## Future Expansion

The schema should support:

- Wedding websites
- Email invitations
- SMS invitations
- AI planning assistant
- Planner accounts
- Multiple ceremonies
- Multiple venues
- Calendar integrations
- Mobile applications

without structural redesign.
