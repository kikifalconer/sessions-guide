-- Replace platform-specific link columns with three generic link slots.
-- Labels are derived at render time from the URL domain; only the raw URL is stored.

alter table practitioners
  add column if not exists link_1 text,
  add column if not exists link_2 text,
  add column if not exists link_3 text;

-- Migrate existing data: website → link_1, instagram → link_2, youtube → link_3.
update practitioners
set
  link_1 = website_url,
  link_2 = instagram_url,
  link_3 = youtube_url
where website_url is not null
   or instagram_url is not null
   or youtube_url is not null;
