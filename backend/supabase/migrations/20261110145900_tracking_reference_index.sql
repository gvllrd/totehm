-- [COM] Exact long Habit references must not overflow a B-tree entry on their first check-in.
-- The non-unique fingerprint is an accelerator, never an identity or a substitute for exact equality.
create index tracking_outcomes_reference on public.habit_outcomes(user_id,md5(habit_text),asked_at desc);
drop index public.outcomes_habit;
