alter table public.profiles
alter column accent_color set default '#8b5cf6';

update public.profiles
set accent_color = '#8b5cf6'
where accent_color = '#f0542d';
