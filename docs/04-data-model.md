# 04 – Data Model

# Purpose

This document defines the core data model for Tied Forever.

It identifies every entity required by the application, the data each entity stores, how entities relate to one another, and the business rules that govern those relationships.

This document intentionally focuses on the logical model rather than database implementation details. It should remain valid regardless of the underlying database technology.

The data model serves as the foundation for:

- PostgreSQL database design
- Prisma schema
- API design
- Frontend state management
- Validation rules

---

# Design Principles

The data model follows the following principles.

## Single Source of Truth

Every piece of information should exist in only one location.

Derived values should be calculated rather than duplicated.

---

## Ownership

Almost every entity belongs to exactly one Wedding.

This ensures complete separation between different weddings.

---

## Normalisation

Information should be stored once wherever practical.

Duplicate data should be avoided unless required for performance.

---

## Extensibility

The model should allow future features to be introduced without requiring significant redesign.

---

# Core Entities

The application consists of the following domains.

## Authentication

- User
- Wedding
- Wedding Member

---

## Planning

- Task Category
- Task

---

## Guests

- Household
- Guest
- RSVP

---

## Suppliers

- Supplier Category
- Supplier
- Supplier Contact

---

## Budget

- Budget Category
- Expense
- Payment

---

## Timeline

- Timeline Group
- Timeline Event

---

## Seating

- Table
- Seating Assignment

---

## Registry

- Registry Item

---

## Documents

- Document Folder
- Document

---

## Notes

- Note
- Tag

---

## System

- Notification
- Activity Log

---

# Entity Ownership

Wedding

├── Members

├── Task Categories

│ └── Tasks

├── Households

│ └── Guests

│ └── RSVP

├── Supplier Categories

│ └── Suppliers

│ └── Contacts

├── Budget Categories

│ └── Expenses

│ └── Payments

├── Timeline Groups

│ └── Timeline Events

├── Tables

│ └── Seating Assignments

├── Registry Items

├── Documents

├── Notes

└── Activity Log

---

# Relationship Rules

The following relationships must always exist.

## Wedding

A wedding:

- has many members
- has many task categories
- has many households
- has many suppliers
- has many budget categories
- has many timeline groups
- has many tables
- has many registry items
- has many notes
- has many documents

---

## Household

A household:

- belongs to one wedding
- contains one or more guests

---

## Guest

A guest:

- belongs to one household
- belongs to one wedding
- may have one RSVP
- may have one seating assignment

---

## Supplier

A supplier:

- belongs to one category
- belongs to one wedding
- may have many contacts
- may have many documents
- may have many payments

---

## Expense

An expense:

- belongs to one budget category
- may belong to one supplier

---

## Timeline Event

A timeline event:

- belongs to one timeline group
- belongs to one wedding

---

## Table

A table:

- belongs to one wedding
- contains many seating assignments

---

# Derived Data

The following values should NOT be stored.

Instead, they should be calculated.

- Planning progress
- Wedding countdown
- Total guest count
- RSVP percentages
- Budget spent
- Budget remaining
- Supplier totals
- Timeline completion
- Seating completion

---

# Future Expansion

The model should support future additions including:

- Multiple weddings per user
- Email invitations
- Guest portal
- Wedding website
- AI assistant
- Calendar integrations
- File versioning
- Audit history
- Mobile applications

without requiring structural redesign.
