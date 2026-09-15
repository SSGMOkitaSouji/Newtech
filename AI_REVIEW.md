# AI-generated code and human review

## AI-generated code

- React/Vite UI skeleton for the Bếp Nhà food-ordering screen.
- Mock dish data, category filtering, search, favorites, cart quantity controls, and responsive layout.
- Supabase client integration in `src/lib/supabase.js`.
- Checkout form validation and order submission to the `orders` table.
- SQL schema and RLS insert policy in `supabase/schema.sql`.

## Human review checklist

- [ ] Confirm the Supabase URL and anon key are stored only in `.env.local`, never committed.
- [ ] Run `supabase/schema.sql` in the Supabase SQL Editor.
- [ ] If an existing `orders` table is already present, rerun the complete SQL script so the RLS policies are replaced.
- [ ] Test valid and invalid checkout form submissions.
- [ ] Confirm a successful order appears in the Supabase `orders` table.
- [ ] Review the RLS policy before production; add authentication and stricter policies if customer data requires it.
- [ ] Replace mock dishes with a Supabase `dishes` table in the next iteration.
