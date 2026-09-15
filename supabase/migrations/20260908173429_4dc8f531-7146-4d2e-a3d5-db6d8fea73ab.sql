CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.profiles (
  id uuid primary key,
  name text not null default '',
  title text not null default '',
  city text not null default '',
  bio text not null default '',
  years_of_experience integer not null default 0,
  profile_image_url text,
  username text unique,
  phone text,
  whatsapp text,
  facebook text,
  instagram text,
  contact_email text,
  category text,
  skills text[] not null default '{}',
  page_views integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles public read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles delete own or admin" ON public.profiles FOR DELETE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text,
  tools_used text[] not null default '{}',
  images text[] not null default '{}',
  external_link text,
  created_at timestamptz not null default now()
);
CREATE INDEX projects_user_id_idx ON public.projects(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT ON public.projects TO anon;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects public read" ON public.projects FOR SELECT USING (true);
CREATE POLICY "projects insert own" ON public.projects FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "projects update own" ON public.projects FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "projects delete own or admin" ON public.projects FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.reports (
  id uuid primary key default gen_random_uuid(),
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  reporter_info text,
  reason text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
GRANT INSERT ON public.reports TO anon;
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can report" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "admin reads reports" ON public.reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin updates reports" ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.increment_page_views(_username text)
RETURNS void LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET page_views = page_views + 1 WHERE username = _username;
$$;
GRANT EXECUTE ON FUNCTION public.increment_page_views(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS TABLE(users_count bigint, projects_count bigint, total_views bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT count(*) FROM public.profiles),
         (SELECT count(*) FROM public.projects),
         (SELECT coalesce(sum(page_views),0) FROM public.profiles)
  WHERE public.has_role(auth.uid(),'admin');
$$;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, contact_email)
  VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'name',''), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "public read app images" ON storage.objects FOR SELECT USING (bucket_id IN ('avatars','project-images'));
CREATE POLICY "users upload own images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('avatars','project-images') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users update own images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('avatars','project-images') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users delete own images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('avatars','project-images') AND (storage.foldername(name))[1] = auth.uid()::text);