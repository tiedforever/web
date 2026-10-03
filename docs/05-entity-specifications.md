# 05 – Entity Specifications

## Purpose

This document defines every business entity used throughout Tied Forever.

Each entity specification describes:

- The entity's purpose
- Ownership
- Relationships
- Required fields
- Optional fields
- Business rules
- Validation requirements
- Future considerations

These specifications form the foundation for the PostgreSQL database, Prisma models and API design.

---

## Entity Template

Every entity should contain:

- Purpose
- Ownership
- Relationships
- Fields
- Business Rules
- Validation
- Future Considerations

---

# User

## Purpose

Represents a registered application user.

A user can belong to one or more weddings.

Users are responsible for authentication and collaboration.

## Ownership

Global entity.

Does not belong to a wedding.

## Relationships

A User:

- has many Wedding Memberships

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| first_name | String | Yes | User's first name |
| last_name | String | Yes | User's last name |
| email | String | Yes | Unique email address |
| password_hash | String | Yes | Encrypted password |
| profile_image | String | No | Avatar image |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- Email addresses must be unique.
- Passwords are never stored in plain text.
- Users may belong to multiple weddings.

## Validation

- First name and last name are required.
- Email must be valid and unique.
- Password hash must only be set through authentication flows.
- Profile image, when provided, must reference a valid asset.

## Future Considerations

- Social login
- Email verification
- Password reset
- Profile preferences

---

# Wedding

## Purpose

Represents a single wedding workspace.

Every planning feature belongs to one wedding.

## Ownership

Root entity.

## Relationships

A Wedding:

- has many Members
- has many Tasks
- has many Guests
- has many Suppliers
- has many Budget Categories
- has many Timeline Events
- has many Registry Items
- has many Documents
- has many Notes

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| name | String | Yes | Wedding name |
| wedding_date | Date | Yes | Wedding date |
| location | String | No | Ceremony location |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- Every wedding must have at least one owner.
- Deleting a wedding removes all associated planning data.

## Validation

- Wedding name is required.
- Wedding date is required and must be a valid future or planned date.
- Location is optional but must be non-empty if provided.

## Future Considerations

- Multiple events per wedding
- Wedding branding settings
- Public-facing wedding pages
- Subscription entitlements

---

# Wedding Member

## Purpose

Links users to weddings.

Provides collaboration and permissions.

## Ownership

Belongs to one Wedding.

Belongs to one User.

## Relationships

Belongs to:

- User
- Wedding

## Fields

| Name | Type | Required |
|-------|------|----------|
| id | UUID | Yes |
| wedding_id | UUID | Yes |
| user_id | UUID | Yes |
| role | Enum | Yes |
| joined_at | DateTime | Yes |

## Business Rules

- A user may only appear once per wedding.
- Each wedding must have at least one OWNER.

## Validation

- Wedding and user references must exist.
- Role must use an approved enum value.
- joined_at must be set when the membership is created.

## Future Considerations

- Invitation workflow
- Member status
- Invitation acceptance history
- Fine-grained permissions

---

# Task Category

## Purpose

Organises planning tasks into logical groups.

Examples:

- Venue
- Photography
- Entertainment
- Transport

Users may create their own categories.

## Ownership

Belongs to one Wedding.

## Relationships

- has many Tasks

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| wedding_id | UUID | Yes | Owning wedding |
| name | String | Yes | Category name |
| colour | String | No | Display colour |
| icon | String | No | Display icon |
| position | Integer | Yes | Display order |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- Categories are user editable.
- Position controls display order.
- Category names should be unique within a wedding.

## Validation

- Name is required.
- Position must be a non-negative integer.
- Colour, when provided, must be a valid display token.
- Icon, when provided, must reference a supported icon set.

## Future Considerations

- Category templates
- Colour presets
- Archiving
- Smart defaults

---

# Task

## Purpose

Represents an individual planning task.

## Ownership

Belongs to one Wedding through a Task Category.

## Relationships

- belongs to one Task Category
- may be assigned to one Wedding Member

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| category_id | UUID | Yes | Parent category |
| title | String | Yes | Task title |
| description | Text | No | Additional context |
| status | Enum | Yes | Task status |
| priority | Enum | Yes | Task priority |
| due_date | Date | No | Deadline |
| completed_at | DateTime | No | Completion timestamp |
| assigned_to | UUID | No | Assigned member |
| position | Integer | Yes | Sort order |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- Every task belongs to one category.
- Completed tasks record completed_at.
- Re-opening a task clears completed_at.

## Validation

- Title is required.
- Status and priority must use approved enum values.
- due_date, when provided, must be a valid date.
- assigned_to, when provided, must reference a valid wedding member.

## Future Considerations

- Recurring tasks
- Dependencies
- Checklist templates
- Task comments

---

# Household

## Purpose

Groups guests living together.

Allows invitations and addresses to be managed together.

## Ownership

Belongs to one Wedding.

## Relationships

- has many Guests

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| wedding_id | UUID | Yes | Owning wedding |
| surname | String | No | Household surname |
| address | String | No | Postal address |
| notes | Text | No | Household notes |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- A household belongs to exactly one wedding.
- A household may contain one or more guests.

## Validation

- wedding_id must reference an existing wedding.
- surname, address and notes are optional but should be validated for length.

## Future Considerations

- Household address normalisation
- Mailing labels
- Address history

---

# Guest

## Purpose

Represents an invited guest.

## Ownership

Belongs to one Wedding through a Household.

## Relationships

- belongs to one Household
- may have one RSVP
- may have one Seating Assignment

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| household_id | UUID | Yes | Parent household |
| first_name | String | Yes | Guest first name |
| last_name | String | Yes | Guest last name |
| email | String | No | Contact email |
| phone | String | No | Contact phone |
| side | Enum | No | Wedding side |
| plus_one | Boolean | Yes | Plus-one flag |
| meal_choice | String | No | Meal selection |
| dietary_requirements | Text | No | Dietary notes |
| notes | Text | No | Guest notes |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- Guest belongs to one household.
- Guest may have one RSVP.
- Guest may have one seating assignment.
- A guest can represent an invited individual or plus-one placeholder depending on planning workflow.

## Validation

- First name and last name are required.
- Contact fields, when provided, must be valid.
- side and meal_choice, when provided, must use approved values or configured options.

## Future Considerations

- Guest tags
- Relationship labels
- Dietary preference catalogue
- Invite tracking metadata

---

# RSVP

## Purpose

Stores a guest's attendance response.

## Ownership

Belongs to one Guest.

## Relationships

- belongs to one Guest

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| guest_id | UUID | Yes | Related guest |
| status | Enum | Yes | RSVP response |
| responded_at | DateTime | No | Response time |
| message | Text | No | Guest message |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- A guest may have one RSVP.
- RSVP status should drive summary metrics.

## Validation

- guest_id must reference an existing guest.
- status must use an approved enum value.
- responded_at, when present, must be a valid timestamp.

## Future Considerations

- RSVP source tracking
- Reminder history
- Meal preference capture

---

# Supplier Category

## Purpose

Organises suppliers.

Categories are user configurable.

Examples:

- Photography
- Music
- Venue
- Flowers

## Ownership

Belongs to one Wedding.

## Relationships

- has many Suppliers

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| wedding_id | UUID | Yes | Owning wedding |
| name | String | Yes | Category name |
| position | Integer | Yes | Sort order |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- Categories are user configurable.
- Category names should be unique within a wedding.

## Validation

- Name is required.
- Position must be a non-negative integer.

## Future Considerations

- Default categories
- Category icons
- Category colours

---

# Supplier

## Purpose

Stores supplier information.

## Ownership

Belongs to one Wedding.

## Relationships

- belongs to one Supplier Category
- may have many Supplier Contacts
- may have many Documents
- may have many Payments
- may have many Expenses

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| category_id | UUID | Yes | Parent category |
| name | String | Yes | Supplier name |
| status | Enum | Yes | Supplier status |
| website | String | No | Website URL |
| instagram | String | No | Social link |
| phone | String | No | Main phone number |
| email | String | No | Main email address |
| quote | Decimal | No | Quoted amount |
| deposit | Decimal | No | Deposit amount |
| balance | Decimal | No | Remaining balance |
| notes | Text | No | Supplier notes |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- Suppliers belong to one wedding through a category.
- Quote, deposit and balance should support financial tracking.
- Status should reflect current engagement with the supplier.

## Validation

- Name is required.
- category_id must reference an existing supplier category.
- URLs must be valid when provided.
- Financial fields must be non-negative.

## Future Considerations

- Supplier workflow stages
- Contract lifecycle
- Communication log
- Availability calendar

---

# Supplier Contact

## Purpose

Stores contacts belonging to a supplier.

Useful for venues with multiple coordinators.

## Ownership

Belongs to one Supplier.

## Relationships

- belongs to one Supplier

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| supplier_id | UUID | Yes | Related supplier |
| first_name | String | No | Contact first name |
| last_name | String | No | Contact last name |
| role | String | No | Contact role |
| email | String | No | Contact email |
| phone | String | No | Contact phone |
| notes | Text | No | Contact notes |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- A supplier may have multiple contacts.
- Contact records should be scoped to a single supplier.

## Validation

- supplier_id must reference an existing supplier.
- Contact details, when provided, must be valid.

## Future Considerations

- Primary contact flag
- Contact preferences
- Communication history

---

# Budget Category

## Purpose

Organises spending.

## Ownership

Belongs to one Wedding.

## Relationships

- has many Expenses
- has many Payments

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| wedding_id | UUID | Yes | Owning wedding |
| name | String | Yes | Category name |
| planned_amount | Decimal | No | Planned budget |
| position | Integer | Yes | Sort order |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- Budget categories should be unique within a wedding.
- Planned amount, when set, represents the intended budget cap.

## Validation

- Name is required.
- planned_amount must be non-negative when provided.
- position must be a non-negative integer.

## Future Considerations

- Budget templates
- Category warnings
- Budget allocation rules

---

# Expense

## Purpose

Represents planned or actual spending.

## Ownership

Belongs to one Budget Category.

## Relationships

- belongs to one Budget Category
- may belong to one Supplier

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| budget_category_id | UUID | Yes | Parent budget category |
| supplier_id | UUID | No | Related supplier |
| name | String | Yes | Expense name |
| amount | Decimal | Yes | Expense amount |
| type | Enum | Yes | Planned or actual |
| incurred_at | Date | No | When expense occurred |
| notes | Text | No | Expense notes |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- An expense belongs to one budget category.
- An expense may be linked to one supplier.
- Expense totals should contribute to derived budget calculations.

## Validation

- name and amount are required.
- amount must be non-negative.
- budget_category_id must be valid.
- supplier_id, when present, must reference a supplier in the same wedding.

## Future Considerations

- Recurring expenses
- Receipt attachments
- Tax or fee tracking

---

# Payment

## Purpose

Tracks deposits and balances.

## Ownership

Belongs to one Budget Category.

## Relationships

- belongs to one Budget Category
- may belong to one Supplier

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| budget_category_id | UUID | Yes | Parent budget category |
| supplier_id | UUID | No | Related supplier |
| amount | Decimal | Yes | Payment amount |
| due_date | Date | No | Due date |
| paid_at | Date | No | Payment date |
| status | Enum | Yes | Payment status |
| notes | Text | No | Payment notes |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- Payments contribute to budget totals.
- A payment may represent a deposit or final balance.
- Payment status should reflect due, scheduled or completed states.

## Validation

- amount is required and must be non-negative.
- budget_category_id must be valid.
- due_date and paid_at, when provided, must be valid dates.

## Future Considerations

- Payment reminders
- Payment receipts
- Supplier-linked payment schedules

---

# Timeline Group

## Purpose

Organises wedding timeline sections.

Examples:

- Bride
- Groom
- Ceremony
- Reception

## Ownership

Belongs to one Wedding.

## Relationships

- has many Timeline Events

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| wedding_id | UUID | Yes | Owning wedding |
| name | String | Yes | Group name |
| position | Integer | Yes | Sort order |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- Timeline groups should be user editable.
- Position controls display order.

## Validation

- name is required.
- position must be a non-negative integer.

## Future Considerations

- Template groups
- Colour coding
- Section notes

---

# Timeline Event

## Purpose

Represents one event on the wedding timeline.

## Ownership

Belongs to one Wedding through a Timeline Group.

## Relationships

- belongs to one Timeline Group

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| timeline_group_id | UUID | Yes | Parent group |
| title | String | Yes | Event title |
| start_time | DateTime | No | Start time |
| end_time | DateTime | No | End time |
| duration_minutes | Integer | No | Duration |
| colour | String | No | Display colour |
| position | Integer | Yes | Sort order |
| notes | Text | No | Event notes |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- Timeline events belong to one timeline group.
- Time fields should support ordering and conflict detection.

## Validation

- title is required.
- start_time and end_time, when both present, must form a valid range.
- duration_minutes, when provided, must be non-negative.

## Future Considerations

- Conflict warnings
- Venue-based scheduling
- Printable schedules

---

# Table

## Purpose

Represents one seating table.

## Ownership

Belongs to one Wedding.

## Relationships

- has many Seating Assignments

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| wedding_id | UUID | Yes | Owning wedding |
| label | String | Yes | Table label |
| capacity | Integer | No | Maximum guests |
| position | Integer | Yes | Sort order |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- Tables belong to one wedding.
- Capacity, when set, limits the number of assigned guests.

## Validation

- label is required.
- capacity, when provided, must be a positive integer.
- position must be a non-negative integer.

## Future Considerations

- Table shapes
- Layout coordinates
- Print-ready seating charts

---

# Seating Assignment

## Purpose

Assigns guests to tables.

## Ownership

Belongs to one Table and one Guest.

## Relationships

- belongs to one Table
- belongs to one Guest

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| table_id | UUID | Yes | Related table |
| guest_id | UUID | Yes | Related guest |
| position | Integer | No | Guest order within table |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- A guest may only have one seating assignment.
- A table may contain many seating assignments.
- Seating assignments must remain within the same wedding.

## Validation

- table_id and guest_id must reference valid records.
- Guest and table must belong to the same wedding.

## Future Considerations

- Drag and drop reordering
- Table layout coordinates
- Seat-level assignments

---

# Registry Item

## Purpose

Represents one registry gift.

## Ownership

Belongs to one Wedding.

## Relationships

- may be grouped with other registry items by category or tag

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| wedding_id | UUID | Yes | Owning wedding |
| title | String | Yes | Item name |
| retailer_link | String | No | Product URL |
| price | Decimal | No | Item price |
| image_url | String | No | Image URL |
| purchase_status | Enum | Yes | Purchase state |
| category | String | No | Item category |
| notes | Text | No | Item notes |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- Registry items belong to one wedding.
- Purchase status should support tracking whether an item is desired, reserved or purchased.

## Validation

- title is required.
- retailer_link, when present, must be valid.
- price, when present, must be non-negative.

## Future Considerations

- Registry provider integrations
- Duplicate item detection
- Gift reservation tracking

---

# Document Folder

## Purpose

Groups uploaded files.

## Ownership

Belongs to one Wedding.

## Relationships

- has many Documents

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| wedding_id | UUID | Yes | Owning wedding |
| name | String | Yes | Folder name |
| parent_folder_id | UUID | No | Nested folder |
| position | Integer | Yes | Sort order |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- Folders belong to one wedding.
- Nested folders are optional.

## Validation

- name is required.
- parent_folder_id, when present, must reference a folder in the same wedding.

## Future Considerations

- Folder permissions
- Folder templates
- Smart folder grouping

---

# Document

## Purpose

Stores metadata for uploaded files.

## Ownership

Belongs to one Wedding and optionally one Document Folder.

## Relationships

- belongs to one Document Folder optionally
- may be linked to other entities such as Venue, Supplier or Note

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| wedding_id | UUID | Yes | Owning wedding |
| folder_id | UUID | No | Parent folder |
| file_name | String | Yes | Display name |
| file_url | String | Yes | File storage reference |
| file_type | String | Yes | MIME or type label |
| file_size | Integer | Yes | File size in bytes |
| notes | Text | No | File notes |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- Documents belong to one wedding.
- Folder assignment is optional.
- File metadata must align with the stored asset.

## Validation

- file_name, file_url and file_type are required.
- file_size must be a non-negative integer.
- folder_id, when present, must reference a valid folder in the same wedding.

## Future Considerations

- File versioning
- Previews and OCR
- Shared annotations

---

# Note

## Purpose

Represents free-form planning notes.

## Ownership

Belongs to one Wedding.

## Relationships

- may be tagged by many Tags
- may have many Documents attached

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| wedding_id | UUID | Yes | Owning wedding |
| title | String | Yes | Note title |
| content | Text | No | Note body |
| pinned | Boolean | Yes | Pin state |
| folder | String | No | Logical folder name |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- Notes belong to one wedding.
- Pinned notes should sort ahead of unpinned notes where appropriate.

## Validation

- title is required.
- content, when provided, should be within supported size limits.

## Future Considerations

- Rich text content
- Shared note linking
- Note templates

---

# Tag

## Purpose

Allows notes and documents to be categorised.

## Ownership

Belongs to one Wedding.

## Relationships

- may be applied to many Notes
- may be applied to many Documents

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| wedding_id | UUID | Yes | Owning wedding |
| name | String | Yes | Tag name |
| colour | String | No | Display colour |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- Tags should be unique within a wedding.
- Tags are reusable across notes and documents.

## Validation

- name is required.
- colour, when provided, must be a valid display token.

## Future Considerations

- Tag suggestions
- Tag filtering
- Cross-entity tagging rules

---

# Notification

## Purpose

Stores notifications generated by the system.

## Ownership

Belongs to one Wedding Member or User depending on delivery model.

## Relationships

- belongs to one recipient
- may reference one originating entity

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| recipient_id | UUID | Yes | Notification recipient |
| type | String | Yes | Notification type |
| title | String | Yes | Notification title |
| body | Text | Yes | Notification message |
| read_at | DateTime | No | Read timestamp |
| created_at | DateTime | Yes | Creation date |
| updated_at | DateTime | Yes | Last modification |

## Business Rules

- Notifications should be generated by meaningful system events.
- Read state should be tracked independently.

## Validation

- type, title and body are required.
- recipient_id must reference a valid recipient.

## Future Considerations

- Push delivery
- Email delivery
- Notification preferences

---

# Activity Log

## Purpose

Stores an audit trail of significant actions performed within the application.

Examples include:

- Guest created
- Supplier updated
- Payment recorded
- Task completed
- Timeline edited

## Ownership

Belongs to one Wedding.

## Relationships

- references one actor
- may reference one affected entity

## Fields

| Name | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary identifier |
| wedding_id | UUID | Yes | Owning wedding |
| actor_id | UUID | No | User who performed the action |
| action | String | Yes | Action name |
| entity_type | String | Yes | Related entity type |
| entity_id | UUID | No | Related entity identifier |
| metadata | JSON | No | Context payload |
| created_at | DateTime | Yes | Event time |

## Business Rules

- Activity logs should be append-only.
- Logs should not be edited in normal application flows.
- Important user actions should be recorded consistently.

## Validation

- wedding_id and action are required.
- entity_type should match a known entity where applicable.
- metadata, when present, should be serialisable.

## Future Considerations

- Advanced audit reporting
- Exportable logs
- Admin review tools

---

# General Notes

- Entity names should remain stable to preserve schema and API continuity.
- Derived values such as counts, progress and summaries should not be duplicated as entity fields.
- Each entity should be represented with clear ownership boundaries to prevent cross-wedding data leakage.
