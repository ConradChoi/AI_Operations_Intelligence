insert into storage.buckets (id, name, public)
values ('spend-uploads', 'spend-uploads', false)
on conflict (id) do nothing;
