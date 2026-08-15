-- Add "Integration" to the Journeys category.
--
-- Integration (the sense-making work that follows a journey) sits alongside
-- plant-medicine, breathwork, psychedelic-facilitation, retreat and
-- vision-quest. Every consumer of modalities reads the table at runtime — the
-- join flow's modality picker, /search filters, discovery.ts, and the category
-- page's SEO keyword payload — so this row alone wires it in everywhere.
--
-- is_approved = true matches the 0001 seed: these are first-party modalities,
-- not practitioner suggestions awaiting review (suggested_by stays null).
--
-- Idempotent: modalities.slug is unique, so a re-run is a no-op.

insert into modalities (category_id, name, slug, is_approved)
select c.id, 'Integration', 'integration', true
from categories c
where c.slug = 'journeys'
on conflict (slug) do nothing;
