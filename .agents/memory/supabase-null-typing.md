---
name: Supabase null typing pattern
description: Supabase returns null for optional DB columns, but TS interfaces often declare string | undefined. Fix by using | null in interfaces and ?? '' at call sites.
---

## Rule
All optional Supabase DB fields return `string | null` (not `string | undefined`). Local interfaces must use `| null` for these.

`user.email` and `user.id` from Supabase Auth are `string | undefined` — always guard with `?? ''` when passing to `.eq()`.

## Why
TypeScript strict mode rejects `string | null` where `string | undefined` is expected and vice versa. Supabase's generated types use `null` for optional columns; the codebase originally used `?:` (undefined-typed) optional properties causing widespread TS errors after migration.

## How to apply
- When adding a new interface that mirrors a Supabase table, use `field: string | null` for any nullable column.
- At call sites: `.eq('col', user?.email ?? '')` not `.eq('col', user?.email)`.
- When Supabase data doesn't match a local interface type, add `as any` cast at the setState/map call.
