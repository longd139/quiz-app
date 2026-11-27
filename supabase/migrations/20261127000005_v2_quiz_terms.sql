-- =============================================================================
-- Quiz App V2.0 — Add `term` (Kỳ học) grouping to quiz_collections
-- =============================================================================
alter table public.quiz_collections
  add column if not exists term text not null default '';

create index if not exists idx_quiz_collections_term on public.quiz_collections(term);
