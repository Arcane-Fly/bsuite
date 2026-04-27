# BSU: Idea Hub Feature

**Date:** 2026-03-16
**Status:** W (Working)
**Version:** 1.00
**Project:** business-suite-unified

## Overview

The Idea Hub is a dedicated space within Business Suite Unified for capturing, organising, and tracking ideas and feature requests across the BSuite platform. It provides a lightweight way for users to submit and vote on ideas.

## Implementation

### Route
```
/ideas
```
Accessible from the BSU main navigation.

### Data Storage
- **Table:** `ideas`
- Ideas are stored in the Supabase `ideas` table
- Navigation entry added to BSU nav config

### Status
- **Implemented:** 2026-03-16 (P0/P1 sweep)
- Route live, nav entry active

## Usage

Navigate to `/ideas` in Business Suite Unified to:
- Submit new ideas
- View existing ideas
- Manage and vote on ideas

## Related

- `ideas` table (Supabase)
- BSU navigation config
- `business-suite-unified/docs/README.md`
