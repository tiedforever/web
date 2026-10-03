# 03 – Page Specifications

## Purpose

This document defines the purpose, behaviour, layout and interactions for every page within Tied Forever.

The objective is to remove ambiguity during development by documenting exactly what each page should display, what actions the user can perform and how each page interacts with the rest of the application.

This document should be used alongside the Functional Requirements and Database Schema during implementation.

---

## Standard Page Template

Every page specification should contain the following sections:

- Purpose
- Route
- Primary User
- Description
- Information Displayed
- User Actions
- Navigation
- Data Sources
- Validation
- Empty State
- Error State
- Permissions
- Future Enhancements

---

# Dashboard

## Purpose

Provide users with an overview of their wedding planning progress and highlight the most important information requiring attention.

## Route

`/dashboard`

## Primary User

Wedding member

## Description

The dashboard is the landing page after sign-in. It should summarise the current wedding status and provide direct access to the most commonly used parts of the application.

## Information Displayed

- Wedding countdown
- Planning completion percentage
- Upcoming tasks
- Budget summary
- RSVP summary
- Guest summary
- Supplier summary
- Upcoming payments
- Recent activity
- Quick actions

## User Actions

- View task
- Create task
- View guest list
- Open supplier
- View budget
- Open timeline
- Create note

## Navigation

- Dashboard
- Checklist
- Guests
- Budget
- Suppliers
- Timeline
- Notes

## Data Sources

- Tasks
- Guests
- Suppliers
- Budget entries
- Timeline events
- Notes
- Activity log

## Validation

N/A

## Empty State

Display onboarding guidance for new weddings and explain the core areas users should complete first.

## Error State

Display a retry option with a clear error message if dashboard data cannot be loaded.

## Permissions

Available to all wedding members.

## Future Enhancements

- Weather
- AI suggestions
- Calendar
- Upcoming meetings

---

# Checklist

## Purpose

Manage planning tasks throughout the wedding.

## Route

`/checklist`

## Primary User

Wedding member

## Description

The checklist page provides a task management view grouped by category. It should support planning workflows from early preparation through the wedding day.

## Information Displayed

- Categories
- Tasks
- Status
- Priority
- Due date
- Assignee

## User Actions

- Create category
- Edit category
- Delete category
- Reorder category
- Create task
- Edit task
- Complete task
- Re-open task
- Delete task
- Search
- Filter

## Navigation

- Dashboard
- Task details

## Data Sources

- Task categories
- Tasks
- Users

## Validation

- Task titles are required.
- Task categories must have unique names within a wedding workspace.
- Due dates, when provided, must be valid dates.
- Priority values must use an approved set of levels.

## Empty State

Display a prompt to create the first category and task.

## Error State

Display a retry option and preserve the current filter or search state where possible.

## Permissions

- Owners can create, edit and delete all tasks and categories.
- Collaborators can create and update tasks if permitted.
- Read-only users cannot make changes.

## Future Enhancements

- Task templates
- Recurring tasks
- Dependency tracking
- Advanced reminders

---

# Guests

## Purpose

Manage the guest list for the wedding.

## Route

`/guests`

## Primary User

Wedding member

## Description

The guests page provides a list of all invited guests and households. It should make it easy to track invitation progress and guest details at a glance.

## Information Displayed

- Guest name
- Household
- Invitation status
- RSVP status
- Meal choice
- Dietary requirements
- Plus ones
- Table assignment

## User Actions

- Add guest
- Edit guest
- Delete guest
- Group guests into households
- Assign table
- Search
- Filter

## Navigation

- Dashboard
- Guest details
- RSVP
- Seating plan

## Data Sources

- Guests
- Households
- Tables
- Invitations

## Validation

- Guest names are required.
- Contact details, when provided, must be valid.
- RSVP and invitation statuses must use approved values.
- Table assignments must reference an existing table.

## Empty State

Display guidance for importing or creating the first guests.

## Error State

Display an error message and allow retry when guest data cannot be loaded.

## Permissions

- Owners and collaborators can manage guest records if permitted.
- Read-only users can view guest information only.

## Future Enhancements

- Bulk import
- Guest segmentation
- Relationship mapping
- Automated invitation tracking

---

# Guest Details

## Purpose

Display and manage the full record for a single guest.

## Route

`/guests/[guestId]`

## Primary User

Wedding member

## Description

The guest details page is a focused record view for one guest. It should present all stored information for that guest and allow updates in one place.

## Information Displayed

- Full name
- Household
- Contact information
- Invitation status
- RSVP status
- Meal choice
- Dietary requirements
- Plus one details
- Table assignment
- Notes
- Activity history

## User Actions

- Edit guest
- Delete guest
- Assign table
- Update RSVP status
- Add note
- Return to guest list

## Navigation

- Guests
- RSVP
- Seating plan

## Data Sources

- Guests
- Households
- Tables
- Notes
- Activity log

## Validation

- Required fields must be present before saving.
- Contact fields must use valid formats where supplied.
- Table assignment must exist within the same wedding workspace.

## Empty State

N/A, because this page requires a valid guest record.

## Error State

Display not-found messaging if the guest does not exist and an error state if the record cannot be loaded.

## Permissions

- Owners and collaborators can edit if permitted.
- Read-only users can view only.

## Future Enhancements

- Guest communication history
- Custom tags
- Attachment support
- Guest timeline of changes

---

# RSVP

## Purpose

Show the current response status of all invited guests.

## Route

`/rsvp`

## Primary User

Wedding member

## Description

The RSVP page provides an aggregated view of invitation responses and related summary data. It should help users quickly understand who has replied and what remains outstanding.

## Information Displayed

- Accepted guests
- Declined guests
- Pending guests
- Response percentages
- Meal breakdowns
- Dietary requirement summaries
- Invitation statistics

## User Actions

- Open guest record
- Update RSVP status
- Filter by response status
- Search guest list

## Navigation

- Guests
- Guest details
- Dashboard

## Data Sources

- Guests
- Invitations
- Meal selections
- Dietary requirements

## Validation

- RSVP values must use approved statuses.
- Counts and percentages must be derived from guest records.

## Empty State

Display a waiting-for-responses message when no RSVPs have been recorded.

## Error State

Display an error message with retry if response summaries cannot be calculated.

## Permissions

- Owners and collaborators can update RSVP records if permitted.
- Read-only users can view summary data only.

## Future Enhancements

- RSVP reminders
- Response deadlines
- Guest messaging
- Exportable response reports

---

# Budget

## Purpose

Track planned and actual wedding spending.

## Route

`/budget`

## Primary User

Wedding member

## Description

The budget page provides a detailed view of planned budgets, spend, deposits, balances and payment history. It should make financial tracking straightforward and transparent.

## Information Displayed

- Budget categories
- Planned totals
- Actual spend
- Remaining budget
- Deposits
- Payments due
- Payment history
- Category totals

## User Actions

- Create category
- Edit category
- Delete category
- Record expense
- Record deposit
- Record payment
- Edit payment
- Delete payment
- View category details

## Navigation

- Dashboard
- Supplier details
- Venue

## Data Sources

- Budget categories
- Expenses
- Deposits
- Payments
- Suppliers

## Validation

- Monetary values must be non-negative.
- Budget categories must have unique names within a workspace.
- Payment dates, when present, must be valid.
- Totals must be derived from stored transaction records.

## Empty State

Display setup guidance for creating budget categories and entering the first planned amounts.

## Error State

Display a retry option and preserve entered form data where possible.

## Permissions

- Owners and collaborators can update budget data if permitted.
- Read-only users can view budget summaries only.

## Future Enhancements

- Budget forecasting
- Savings targets
- Category alerts
- Cost comparison reporting

---

# Suppliers

## Purpose

Manage supplier records used throughout the wedding.

## Route

`/suppliers`

## Primary User

Wedding member

## Description

The suppliers page provides a central directory of all external vendors and service providers associated with the wedding.

## Information Displayed

- Supplier name
- Category
- Contact information
- Website
- Social links
- Quote summary
- Deposit status
- Final balance
- Supplier status

## User Actions

- Create supplier category
- Edit supplier category
- Delete supplier category
- Add supplier
- Edit supplier
- Delete supplier
- Search
- Filter

## Navigation

- Dashboard
- Supplier details
- Budget

## Data Sources

- Suppliers
- Supplier categories
- Quotes
- Contracts
- Payments

## Validation

- Supplier names are required.
- Category values must reference an existing category or valid uncategorised state.
- URLs must be valid when provided.
- Money values must be non-negative.

## Empty State

Display a prompt to add the first supplier.

## Error State

Display an error with retry if supplier data cannot be loaded.

## Permissions

- Owners and collaborators can manage supplier data if permitted.
- Read-only users can view supplier data only.

## Future Enhancements

- Supplier communication log
- Contract versioning
- Preferred supplier tagging
- Automated payment reminders

---

# Supplier Details

## Purpose

Display and manage the full record for a single supplier.

## Route

`/suppliers/[supplierId]`

## Primary User

Wedding member

## Description

The supplier details page should provide a complete view of a supplier record, including commercial, contact and document information.

## Information Displayed

- Supplier name
- Category
- Contact information
- Website and social links
- Quote history
- Deposit and balance status
- Contract files
- Notes
- Activity history

## User Actions

- Edit supplier
- Delete supplier
- Add note
- Upload contract
- Record payment
- Return to suppliers list

## Navigation

- Suppliers
- Budget
- Venue

## Data Sources

- Suppliers
- Supplier categories
- Contracts
- Files
- Notes
- Payments

## Validation

- Required supplier fields must be present before save.
- URLs must be valid where supplied.
- Monetary fields must be valid numbers.

## Empty State

N/A, because this page requires a valid supplier record.

## Error State

Display not-found messaging if the supplier does not exist and an error state if the record cannot be loaded.

## Permissions

- Owners and collaborators can edit if permitted.
- Read-only users can view only.

## Future Enhancements

- Supplier scorecards
- Communication timeline
- Availability tracking
- Reusable supplier templates

---

# Venue

## Purpose

Store all venue-specific wedding information in one place.

## Route

`/venue`

## Primary User

Wedding member

## Description

The venue page should centralise information about the wedding venue, including booking details, contact details, documents and important timings.

## Information Displayed

- Venue name
- Contact information
- Address
- Booking status
- Booking reference
- Notes
- Documents
- Important timings

## User Actions

- Edit venue details
- Upload document
- Delete document
- Add note
- Update booking information

## Navigation

- Dashboard
- Documents
- Timeline

## Data Sources

- Venue
- Documents
- Notes
- Timeline events

## Validation

- Required venue fields must be present if a venue has been created.
- Address fields should be validated for basic completeness.
- Booking dates and times must be valid where provided.

## Empty State

Display guidance for adding the wedding venue.

## Error State

Display an error message with retry if venue data cannot be loaded.

## Permissions

- Owners and collaborators can edit if permitted.
- Read-only users can view venue details only.

## Future Enhancements

- Venue checklist
- Venue access instructions
- Map integration
- Vendor restrictions tracking

---

# Timeline

## Purpose

Manage the running order of the wedding day.

## Route

`/timeline`

## Primary User

Wedding member

## Description

The timeline page provides a structured schedule of wedding-day events. It should support planning by time, sequence and grouping.

## Information Displayed

- Timeline groups
- Timeline events
- Start times
- End times
- Durations
- Colours
- Event order

## User Actions

- Create timeline group
- Edit timeline group
- Delete timeline group
- Create timeline event
- Edit timeline event
- Delete timeline event
- Reorder event
- View schedule

## Navigation

- Dashboard
- Venue
- Checklist

## Data Sources

- Timeline groups
- Timeline events
- Venue timings

## Validation

- Start times and end times must be valid.
- End time must be after start time when both are present.
- Event titles are required.

## Empty State

Display a prompt to create the first timeline event.

## Error State

Display an error message and retry option if the timeline cannot be loaded.

## Permissions

- Owners and collaborators can edit if permitted.
- Read-only users can view only.

## Future Enhancements

- Timeline templates
- Agenda export
- Vendor arrival schedule
- Conflict detection

---

# Seating Plan

## Purpose

Assign guests to tables and manage seating arrangements.

## Route

`/seating-plan`

## Primary User

Wedding member

## Description

The seating plan page should provide a clear view of tables, capacities and guest assignments. It should support efficient table management and visual completion tracking.

## Information Displayed

- Tables
- Table capacities
- Guest assignments
- Unassigned guests
- Seating completion

## User Actions

- Create table
- Edit table
- Delete table
- Assign guest
- Remove guest
- Move guest between tables
- Search guest

## Navigation

- Guests
- Guest details
- Dashboard

## Data Sources

- Tables
- Guests
- Households

## Validation

- Table names or labels must be present.
- Capacity must be a positive number when set.
- A guest may only be assigned to one table at a time.

## Empty State

Display a prompt to create the first table.

## Error State

Display an error state and retry option if seating data cannot be loaded.

## Permissions

- Owners and collaborators can edit if permitted.
- Read-only users can view only.

## Future Enhancements

- Drag-and-drop seating
- Seat conflict warnings
- Table grouping
- Printable seating charts

---

# Registry

## Purpose

Store gift registry items and related links.

## Route

`/registry`

## Primary User

Wedding member

## Description

The registry page should let users track gift ideas, retailer links and purchase progress in a single view.

## Information Displayed

- Registry items
- Retailer links
- Prices
- Images
- Purchase status
- Categories

## User Actions

- Add registry item
- Edit registry item
- Delete registry item
- Mark as purchased
- Open retailer link
- Categorise item

## Navigation

- Dashboard
- Notes
- Documents

## Data Sources

- Registry items
- Files
- Notes

## Validation

- Item names are required.
- Retailer links must be valid when provided.
- Prices must be non-negative.

## Empty State

Display a prompt to add the first registry item.

## Error State

Display an error message and retry option if registry data cannot be loaded.

## Permissions

- Owners and collaborators can edit if permitted.
- Read-only users can view only.

## Future Enhancements

- Registry import
- Gift reservation tracking
- Wishlist sharing
- Purchase reminders

---

# Documents

## Purpose

Provide centralised storage for wedding-related files.

## Route

`/documents`

## Primary User

Wedding member

## Description

The documents page should organize uploaded files into folders and provide a simple way to find, preview and download relevant documents.

## Information Displayed

- Folders
- Files
- File types
- File sizes
- Upload dates
- Related tags or categories

## User Actions

- Create folder
- Rename folder
- Delete folder
- Upload file
- Download file
- Preview file
- Delete file
- Search

## Navigation

- Dashboard
- Venue
- Supplier details
- Notes

## Data Sources

- Folders
- Files
- Venue records
- Suppliers
- Notes

## Validation

- Folder names must be provided.
- File uploads must use supported file types.
- File size limits must be enforced.

## Empty State

Display upload guidance for the first document.

## Error State

Display an error message and retry option if documents cannot be loaded or uploaded.

## Permissions

- Owners and collaborators can manage files if permitted.
- Read-only users can view and download only where allowed.

## Future Enhancements

- Advanced tagging
- OCR search
- File versioning
- Shared document templates

---

# Notes

## Purpose

Capture planning information that does not belong in a dedicated module.

## Route

`/notes`

## Primary User

Wedding member

## Description

The notes page should act as a flexible space for freeform planning content, reminders and reference material.

## Information Displayed

- Note title
- Pinned status
- Tags
- Folder
- Attachments
- Last updated time

## User Actions

- Create note
- Edit note
- Delete note
- Pin note
- Tag note
- Move note to folder
- Attach file
- Search

## Navigation

- Dashboard
- Documents
- Checklist

## Data Sources

- Notes
- Folders
- Files

## Validation

- Note titles are required when title is used.
- Attached files must meet supported type and size rules.
- Tags should be sanitized and limited to approved lengths.

## Empty State

Display guidance for creating the first note.

## Error State

Display an error message and retry option if notes cannot be loaded.

## Permissions

- Owners and collaborators can edit if permitted.
- Read-only users can view only.

## Future Enhancements

- Rich text formatting
- Note templates
- Shared note assignments
- Cross-linking to tasks and suppliers

---

# Settings

## Purpose

Manage wedding and account configuration.

## Route

`/settings`

## Primary User

Wedding owner

## Description

The settings page should provide controls for wedding setup, workspace membership, account details, preferences and data export.

## Information Displayed

- Wedding information
- Member list
- Notification settings
- Appearance settings
- Account settings
- Export options

## User Actions

- Edit wedding information
- Manage wedding members
- Update notification preferences
- Update appearance settings
- Manage account information
- Export application data

## Navigation

- Dashboard
- All major workspace areas where relevant

## Data Sources

- Wedding
- Users
- Invitations or membership records
- Notification preferences
- Account profile

## Validation

- Wedding names and core profile fields must be valid.
- Member changes must respect permission rules.
- Export requests must be authorised.

## Empty State

N/A, although missing settings values should be presented with sensible defaults.

## Error State

Display a clear error message and retry option if settings cannot be loaded or saved.

## Permissions

- Owners can manage all settings.
- Collaborators may view or update limited preferences where permitted.
- Read-only users have no access to modify settings.

## Future Enhancements

- Subscription management
- Role-based permission editor
- Theme presets
- Data import tools

---

# General Rules

Every page should document:

- Route
- Layout
- Components
- Displayed information
- Available actions
- Required permissions
- Related entities
- Database tables used
- Validation requirements
- Empty states
- Loading states
- Error states
- Future improvements

Do not include implementation code.

Write this document to production software documentation standards.
