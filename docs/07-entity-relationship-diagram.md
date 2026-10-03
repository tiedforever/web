# 07 – Entity Relationship Diagram

## Purpose

This document provides a visual representation of the logical data model for Tied Forever.

It shows the principal entities, their important attributes and the relationships between them. It should be read alongside:

- `04-data-model.md`
- `05-entity-specifications.md`
- `06-database-schema.md`

This diagram describes the intended business structure. The final PostgreSQL and Prisma implementation may introduce additional join tables, indexes and implementation-specific fields.

---

## Core Ownership Model

A user may belong to multiple weddings, and a wedding may have multiple users.

Access to a wedding is controlled through the `WEDDING_MEMBER` entity.

```mermaid
erDiagram
    USER ||--o{ WEDDING_MEMBER : has
    WEDDING ||--|{ WEDDING_MEMBER : contains

    USER {
        uuid id PK
        string first_name
        string last_name
        string email UK
        string profile_image_url
        datetime created_at
        datetime updated_at
    }

    WEDDING {
        uuid id PK
        string name
        string partner_one_name
        string partner_two_name
        date wedding_date
        string ceremony_location
        string reception_location
        string timezone
        string currency_code
        boolean meal_choices_enabled
        boolean dietary_requirements_enabled
        datetime created_at
        datetime updated_at
    }

    WEDDING_MEMBER {
        uuid id PK
        uuid wedding_id FK
        uuid user_id FK
        string role
        datetime joined_at
        datetime left_at
    }
```

### Membership rules

- A user may belong to more than one wedding.
- A wedding must always have at least one owner.
- A user may only have one active membership per wedding.
- Valid roles are:
  - `OWNER`
  - `EDITOR`
  - `VIEWER`
- A user’s historical activity remains after they leave a wedding.
- The final owner cannot leave until ownership has been transferred.

---

## Planning and Checklist

Each wedding may define its own task categories.

Every task belongs to one category and may optionally be assigned to one wedding member. Tasks may also contain subtasks.

```mermaid
erDiagram
    WEDDING ||--o{ TASK_CATEGORY : defines
    TASK_CATEGORY ||--o{ TASK : contains
    TASK ||--o{ TASK : has_subtasks
    WEDDING_MEMBER o|--o{ TASK : assigned_to
    TASK ||--o{ TASK_ATTACHMENT : has
    TASK ||--o{ TASK_LINK : has
    TASK ||--o| TASK_RECURRENCE : repeats_using

    TASK_CATEGORY {
        uuid id PK
        uuid wedding_id FK
        string name
        string icon
        string colour
        int position
        datetime created_at
        datetime updated_at
    }

    TASK {
        uuid id PK
        uuid wedding_id FK
        uuid category_id FK
        uuid parent_task_id FK
        uuid assigned_member_id FK
        string title
        text description
        string status
        string priority
        date due_date
        datetime completed_at
        int position
        datetime created_at
        datetime updated_at
    }

    TASK_ATTACHMENT {
        uuid id PK
        uuid task_id FK
        uuid document_id FK
        datetime created_at
    }

    TASK_LINK {
        uuid id PK
        uuid task_id FK
        string label
        string url
        datetime created_at
    }

    TASK_RECURRENCE {
        uuid id PK
        uuid task_id FK
        string frequency
        int interval
        date starts_on
        date ends_on
        datetime next_occurrence_at
    }
```

### Task rules

- Every task belongs to exactly one category.
- A task may have no assignee or one assignee.
- The assignee must be an active member of the same wedding.
- Tasks may have nested subtasks.
- Task statuses are:
  - `NOT_STARTED`
  - `IN_PROGRESS`
  - `WAITING`
  - `COMPLETED`
  - `CANCELLED`
- Task priorities are:
  - `LOW`
  - `MEDIUM`
  - `HIGH`
  - `URGENT`
- Completing a task records `completed_at`.
- Deleting a category containing tasks requires the user to:
  - move its tasks to another category,
  - explicitly delete the category and its tasks,
  - or cancel the operation.

---

## Guests, Households and Invitations

Guests may exist independently or belong to a household.

A household may share one address and normally receives one invitation. Individual invitations remain possible where needed.

```mermaid
erDiagram
    WEDDING ||--o{ HOUSEHOLD : contains
    WEDDING ||--o{ GUEST : contains
    HOUSEHOLD o|--o{ GUEST : groups

    WEDDING ||--o{ INVITATION : issues
    HOUSEHOLD o|--o{ INVITATION : receives
    GUEST o|--o{ INVITATION : receives
    INVITATION ||--o{ INVITATION_EVENT : records

    GUEST o|--o| GUEST : plus_one_of
    GUEST ||--o| RSVP : has

    WEDDING ||--o{ WEDDING_SECTION : defines
    INVITATION ||--o{ INVITATION_SECTION : grants
    WEDDING_SECTION ||--o{ INVITATION_SECTION : included_in
    RSVP ||--o{ RSVP_SECTION_RESPONSE : contains
    WEDDING_SECTION ||--o{ RSVP_SECTION_RESPONSE : answered_for

    WEDDING ||--o{ MEAL_OPTION : defines
    MEAL_OPTION o|--o{ RSVP : selected_by

    WEDDING ||--o{ GUEST_TAG : defines
    GUEST }o--o{ GUEST_TAG : tagged_with

    HOUSEHOLD {
        uuid id PK
        uuid wedding_id FK
        string name
        string address_line_one
        string address_line_two
        string town_city
        string postcode
        string country
        text notes
        datetime created_at
        datetime updated_at
    }

    GUEST {
        uuid id PK
        uuid wedding_id FK
        uuid household_id FK
        uuid plus_one_for_guest_id FK
        string title
        string first_name
        string last_name
        string email
        string phone
        string age_group
        text dietary_requirements
        text notes
        datetime created_at
        datetime updated_at
    }

    INVITATION {
        uuid id PK
        uuid wedding_id FK
        uuid household_id FK
        uuid guest_id FK
        string delivery_method
        string status
        datetime sent_at
        datetime created_at
        datetime updated_at
    }

    INVITATION_EVENT {
        uuid id PK
        uuid invitation_id FK
        string event_type
        datetime occurred_at
        json metadata
    }

    WEDDING_SECTION {
        uuid id PK
        uuid wedding_id FK
        string name
        string description
        int position
    }

    INVITATION_SECTION {
        uuid id PK
        uuid invitation_id FK
        uuid wedding_section_id FK
    }

    RSVP {
        uuid id PK
        uuid guest_id FK
        uuid meal_option_id FK
        string status
        string response_source
        text message
        datetime responded_at
        uuid last_updated_by_member_id FK
        datetime created_at
        datetime updated_at
    }

    RSVP_SECTION_RESPONSE {
        uuid id PK
        uuid rsvp_id FK
        uuid wedding_section_id FK
        string attendance_status
    }

    MEAL_OPTION {
        uuid id PK
        uuid wedding_id FK
        string name
        text description
        int position
        boolean active
    }

    GUEST_TAG {
        uuid id PK
        uuid wedding_id FK
        string name
        string colour
    }
```

### Guest and invitation rules

- Household membership is optional.
- A household may contain one or more guests.
- Guests in a household normally share one postal address.
- Invitations may be addressed to:
  - one household, or
  - one individual guest.
- An invitation must reference either a household or a guest, but not both.
- A plus-one is represented as a real guest.
- Guest age groups are:
  - `ADULT`
  - `CHILD`
  - `INFANT`
- Wedding sections are configurable and may include:
  - Ceremony
  - Drinks reception
  - Wedding breakfast
  - Evening reception
- Invitations grant access to one or more wedding sections.
- Each guest can respond separately for each section they were invited to.
- RSVP statuses are:
  - `NOT_INVITED`
  - `INVITED`
  - `ACCEPTED`
  - `DECLINED`
  - `NO_RESPONSE`
- RSVP responses may be entered:
  - by the guest,
  - manually by a wedding member,
  - or eventually through an integration.
- Manual changes must be recorded in the activity log.
- Meal selection is optional and controlled through wedding settings.

---

## Custom RSVP Questions

Each wedding may create custom questions for its RSVP form.

```mermaid
erDiagram
    WEDDING ||--o{ RSVP_QUESTION : defines
    RSVP_QUESTION ||--o{ RSVP_QUESTION_OPTION : provides
    RSVP ||--o{ RSVP_ANSWER : contains
    RSVP_QUESTION ||--o{ RSVP_ANSWER : answered_by
    RSVP_QUESTION_OPTION o|--o{ RSVP_ANSWER : selected_in

    RSVP_QUESTION {
        uuid id PK
        uuid wedding_id FK
        string label
        text help_text
        string question_type
        boolean required
        boolean active
        int position
    }

    RSVP_QUESTION_OPTION {
        uuid id PK
        uuid question_id FK
        string label
        int position
    }

    RSVP_ANSWER {
        uuid id PK
        uuid rsvp_id FK
        uuid question_id FK
        uuid selected_option_id FK
        text text_value
        boolean boolean_value
        datetime created_at
        datetime updated_at
    }
```

Supported question types may include:

- Short text
- Long text
- Yes or no
- Single choice
- Multiple choice

Examples include:

- Do you require accommodation?
- Do you require transport?
- Would you like a children’s meal?
- Do you need a high chair?
- What song would you like to hear?

---

## Suppliers

Supplier categories are defined by each wedding rather than hard-coded by the application.

```mermaid
erDiagram
    WEDDING ||--o{ SUPPLIER_CATEGORY : defines
    SUPPLIER_CATEGORY ||--o{ SUPPLIER : contains
    SUPPLIER ||--o{ SUPPLIER_CONTACT : has
    SUPPLIER ||--o{ SUPPLIER_LINK : has
    SUPPLIER ||--o{ SUPPLIER_IMAGE : has
    SUPPLIER ||--o{ EXPENSE : relates_to
    SUPPLIER ||--o{ DOCUMENT_ASSOCIATION : has

    SUPPLIER_CATEGORY {
        uuid id PK
        uuid wedding_id FK
        string name
        string icon
        string colour
        int position
    }

    SUPPLIER {
        uuid id PK
        uuid wedding_id FK
        uuid category_id FK
        string name
        text description
        string status
        bigint quoted_amount_minor
        bigint agreed_amount_minor
        int rating
        boolean selected
        text pros
        text cons
        text notes
        datetime created_at
        datetime updated_at
    }

    SUPPLIER_CONTACT {
        uuid id PK
        uuid supplier_id FK
        string name
        string role
        string email
        string phone
        boolean primary_contact
    }

    SUPPLIER_LINK {
        uuid id PK
        uuid supplier_id FK
        string link_type
        string label
        string url
    }

    SUPPLIER_IMAGE {
        uuid id PK
        uuid supplier_id FK
        string storage_key
        string alt_text
        int position
    }
```

Suggested supplier statuses:

- `RESEARCHING`
- `CONTACTED`
- `AWAITING_RESPONSE`
- `SHORTLISTED`
- `CONFIRMED`
- `REJECTED`
- `CANCELLED`

The venue may use the supplier model while storing additional venue-specific details separately.

---

## Venue

The selected venue may reference an existing supplier and contain venue-specific operational information.

```mermaid
erDiagram
    WEDDING ||--o| VENUE_DETAILS : has
    SUPPLIER ||--o| VENUE_DETAILS : represents
    VENUE_DETAILS ||--o{ VENUE_SPACE : contains
    VENUE_DETAILS ||--o{ VENUE_CONTACT : has

    VENUE_DETAILS {
        uuid id PK
        uuid wedding_id FK
        uuid supplier_id FK
        string address
        string map_url
        int capacity
        text parking_information
        text accommodation_information
        text access_information
        text restrictions
        text notes
    }

    VENUE_SPACE {
        uuid id PK
        uuid venue_details_id FK
        string name
        int capacity
        text description
    }

    VENUE_CONTACT {
        uuid id PK
        uuid venue_details_id FK
        string name
        string role
        string email
        string phone
        boolean emergency_contact
    }
```

---

## Budget, Expenses and Payments

Budget totals are derived from category allocations, expenses and payments.

```mermaid
erDiagram
    WEDDING ||--o{ BUDGET_CATEGORY : defines
    BUDGET_CATEGORY ||--o{ EXPENSE : contains
    SUPPLIER o|--o{ EXPENSE : relates_to
    EXPENSE ||--o{ PAYMENT : paid_through
    WEDDING_MEMBER o|--o{ PAYMENT : recorded_by

    BUDGET_CATEGORY {
        uuid id PK
        uuid wedding_id FK
        string name
        string colour
        bigint allocated_amount_minor
        int position
        datetime created_at
        datetime updated_at
    }

    EXPENSE {
        uuid id PK
        uuid wedding_id FK
        uuid category_id FK
        uuid supplier_id FK
        string description
        bigint estimated_amount_minor
        bigint final_amount_minor
        string status
        date due_date
        text notes
        datetime created_at
        datetime updated_at
    }

    PAYMENT {
        uuid id PK
        uuid expense_id FK
        uuid recorded_by_member_id FK
        bigint amount_minor
        string payment_type
        string status
        date due_date
        datetime paid_at
        string payment_method
        text notes
        datetime created_at
        datetime updated_at
    }
```

### Budget rules

- Monetary values are stored in the smallest currency unit, such as pence.
- Floating-point values must not be used for money.
- An expense belongs to one budget category.
- An expense may optionally relate to a supplier.
- Payments belong to an expense.
- Deposits and final balances are represented as payment records.
- Total spent, remaining budget and outstanding balances are calculated rather than stored.

---

## Timeline

Timeline groups and events are configurable per wedding.

```mermaid
erDiagram
    WEDDING ||--o{ TIMELINE_GROUP : defines
    TIMELINE_GROUP ||--o{ TIMELINE_EVENT : contains

    TIMELINE_GROUP {
        uuid id PK
        uuid wedding_id FK
        string name
        string colour
        int position
    }

    TIMELINE_EVENT {
        uuid id PK
        uuid wedding_id FK
        uuid group_id FK
        string title
        text description
        datetime starts_at
        datetime ends_at
        string location
        string colour
        int position
        datetime created_at
        datetime updated_at
    }
```

Timeline duration should normally be calculated from `starts_at` and `ends_at`.

---

## Seating Plan

Each wedding may create multiple tables and assign guests to them.

```mermaid
erDiagram
    WEDDING ||--o{ SEATING_LAYOUT : contains
    SEATING_LAYOUT ||--o{ SEATING_TABLE : contains
    SEATING_TABLE ||--o{ SEATING_ASSIGNMENT : has
    GUEST ||--o| SEATING_ASSIGNMENT : receives

    SEATING_LAYOUT {
        uuid id PK
        uuid wedding_id FK
        string name
        boolean active
        datetime created_at
        datetime updated_at
    }

    SEATING_TABLE {
        uuid id PK
        uuid seating_layout_id FK
        string name
        string shape
        int capacity
        decimal position_x
        decimal position_y
        decimal rotation
        text notes
    }

    SEATING_ASSIGNMENT {
        uuid id PK
        uuid table_id FK
        uuid guest_id FK
        int seat_number
        datetime created_at
        datetime updated_at
    }
```

### Seating rules

- A guest may have at most one seating assignment within a seating layout.
- A table must not exceed its capacity.
- Seat numbers are optional in the first version.
- Deleting a table must first remove or reassign its guests.

---

## Gift Registry

Registry items link guests to external retailers. Tied Forever does not process purchases directly.

```mermaid
erDiagram
    WEDDING ||--o{ REGISTRY_CATEGORY : defines
    REGISTRY_CATEGORY ||--o{ REGISTRY_ITEM : contains
    REGISTRY_ITEM ||--o{ REGISTRY_RESERVATION : has

    REGISTRY_CATEGORY {
        uuid id PK
        uuid wedding_id FK
        string name
        int position
    }

    REGISTRY_ITEM {
        uuid id PK
        uuid wedding_id FK
        uuid category_id FK
        string name
        text description
        string retailer
        string retailer_url
        string image_url
        bigint price_minor
        int quantity_requested
        int priority
        string status
        datetime created_at
        datetime updated_at
    }

    REGISTRY_RESERVATION {
        uuid id PK
        uuid registry_item_id FK
        int quantity
        string purchaser_reference
        datetime reserved_at
        datetime purchased_at
    }
```

The registry redirects users to the retailer. Payment information is never handled by Tied Forever.

---

## Documents and Attachments

Files are stored in external object storage. PostgreSQL stores metadata and relationships.

```mermaid
erDiagram
    WEDDING ||--o{ DOCUMENT_FOLDER : contains
    DOCUMENT_FOLDER o|--o{ DOCUMENT : contains
    USER ||--o{ DOCUMENT : uploads
    DOCUMENT ||--o{ DOCUMENT_ASSOCIATION : linked_through

    DOCUMENT_FOLDER {
        uuid id PK
        uuid wedding_id FK
        uuid parent_folder_id FK
        string name
        int position
        datetime created_at
        datetime updated_at
    }

    DOCUMENT {
        uuid id PK
        uuid wedding_id FK
        uuid folder_id FK
        uuid uploaded_by_user_id FK
        string original_filename
        string storage_key
        string mime_type
        bigint file_size_bytes
        datetime created_at
        datetime updated_at
    }

    DOCUMENT_ASSOCIATION {
        uuid id PK
        uuid document_id FK
        string entity_type
        uuid entity_id
        datetime created_at
    }
```

A document may be associated with entities such as:

- Task
- Supplier
- Venue
- Expense
- Note
- Guest

The implementation must validate that the associated entity belongs to the same wedding as the document.

---

## Notes and Tags

Notes belong to a wedding and may be organised, pinned and tagged.

```mermaid
erDiagram
    WEDDING ||--o{ NOTE_FOLDER : contains
    NOTE_FOLDER o|--o{ NOTE : contains
    WEDDING ||--o{ NOTE : owns
    NOTE }o--o{ TAG : tagged_with
    NOTE ||--o{ NOTE_CHECKLIST_ITEM : contains

    NOTE_FOLDER {
        uuid id PK
        uuid wedding_id FK
        string name
        int position
    }

    NOTE {
        uuid id PK
        uuid wedding_id FK
        uuid folder_id FK
        string title
        text content
        string content_format
        boolean pinned
        datetime created_at
        datetime updated_at
    }

    TAG {
        uuid id PK
        uuid wedding_id FK
        string name
        string colour
    }

    NOTE_CHECKLIST_ITEM {
        uuid id PK
        uuid note_id FK
        string text
        boolean completed
        int position
    }
```

The initial note format may be Markdown. Rich-text JSON may be introduced later if required.

---

## Notifications and User Preferences

Notifications are user-specific, while most wedding data is shared.

```mermaid
erDiagram
    USER ||--o| USER_PREFERENCE : configures
    USER ||--o{ NOTIFICATION : receives
    WEDDING o|--o{ NOTIFICATION : relates_to

    USER_PREFERENCE {
        uuid id PK
        uuid user_id FK
        string theme
        string timezone
        boolean email_notifications_enabled
        boolean task_notifications_enabled
        boolean payment_notifications_enabled
        json additional_preferences
        datetime updated_at
    }

    NOTIFICATION {
        uuid id PK
        uuid user_id FK
        uuid wedding_id FK
        string type
        string title
        text message
        string entity_type
        uuid entity_id
        datetime read_at
        datetime created_at
    }
```

---

## Activity Log

Significant actions are recorded for visibility and auditing.

```mermaid
erDiagram
    WEDDING ||--o{ ACTIVITY_LOG : records
    USER o|--o{ ACTIVITY_LOG : performs
    WEDDING_MEMBER o|--o{ ACTIVITY_LOG : performed_as

    ACTIVITY_LOG {
        uuid id PK
        uuid wedding_id FK
        uuid actor_user_id FK
        uuid actor_member_id FK
        string action
        string entity_type
        uuid entity_id
        string entity_display_name
        json metadata
        datetime created_at
    }
```

### Activity rules

- Activity records are append-only.
- Historical activity remains when a user leaves a wedding.
- Activity records should not depend on an active membership remaining.
- Important tracked actions include:
  - Task created or completed
  - Guest added or updated
  - RSVP manually changed
  - Invitation sent
  - Supplier updated
  - Payment recorded
  - Timeline edited
  - Seating assignment changed
  - Document uploaded
  - Wedding member added or removed

---

## Derived Dashboard Data

The dashboard does not require a dedicated database table.

The following values are calculated from underlying records:

- Days until the wedding
- Planning completion percentage
- Upcoming tasks
- Overdue tasks
- Total invited guests
- Accepted, declined and pending RSVPs
- Meal totals
- Dietary requirement summaries
- Total budget
- Total committed spend
- Total paid
- Remaining budget
- Upcoming and overdue payments
- Supplier status totals
- Seating completion
- Registry completion
- Recent activity

Derived data must not be duplicated in persistent tables unless a later performance requirement justifies caching it.

---

## Cross-Wedding Data Isolation

Every wedding-owned entity must include a direct or safely traceable relationship to a wedding.

The application must verify that:

- users can only access weddings where they hold an active membership;
- foreign-key relationships never connect records from different weddings;
- assigned members belong to the relevant wedding;
- guests, suppliers, expenses, documents and categories belong to the same wedding when linked;
- all API operations apply wedding-scoped authorisation.

---

## Deletion Behaviour

The detailed deletion rules will be finalised in the Prisma schema, but the logical behaviour is:

- Deleting a wedding removes its associated planning data after explicit confirmation.
- The final wedding owner cannot leave or be removed.
- User activity history remains after membership removal.
- Task categories containing tasks require a move, delete or cancel decision.
- Supplier categories containing suppliers follow the same protected deletion approach.
- Budget categories containing expenses cannot be silently deleted.
- Deleting a household does not automatically delete its guests.
- Deleting a table requires its guests to be unassigned or moved.
- Deleting a folder should require its contents to be moved or explicitly deleted.
- Activity records are retained unless the entire wedding is permanently deleted.

---

## Implementation Notes

When this model is translated into Prisma:

- Use UUID primary keys.
- Add `created_at` and `updated_at` fields to mutable entities.
- Add compound unique constraints where required.
- Add indexes to commonly filtered foreign keys and status fields.
- Use explicit join models when relationships require metadata.
- Define relation deletion behaviour deliberately rather than relying on defaults.
- Store money as integer minor units.
- Store uploaded files in object storage rather than PostgreSQL.
- Validate wedding ownership at both the service and database-access layers.
