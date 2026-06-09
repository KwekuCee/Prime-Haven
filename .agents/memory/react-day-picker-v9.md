---
name: react-day-picker v9 breaking API changes
description: v9 removed IconLeft/IconRight component slots and changed captionLayout values.
---

## Rule
In react-day-picker v9 (installed as 9.14.0):
- `components={{ IconLeft, IconRight }}` is invalid — use `components={{ Chevron: ({ orientation }) => ... }}`
- `captionLayout="dropdown-buttons"` is invalid — use `captionLayout="dropdown"`

## Why
react-day-picker changed its component slot API between v8 and v9. The Lovable project was originally built against v8 conventions.

## How to apply
calendar.tsx already fixed to use Chevron. Any new date pickers must use `captionLayout="dropdown"`.
