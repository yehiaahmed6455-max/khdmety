import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { CATEGORIES, categoryLabel } from "@/lib/constants";
import { uploadImage } from "@/lib/storage";

export const Route = createFileRoute("/_authenticated/dashboard/projects")({
  head: () => ({
    meta: [
      { title: "أعمالي — خِدمتي" },
      { name: "description", content: "أضف وعدّل واحذف مشاريعك في معرض أعمالك." },
      { property: "og:title", content: "أعمالي — خِدمتي" },
      { property: "og:description", content: "أضف وعدّل واحذف مشاريعك في معرض أعمالك." },
    ],
  }),
  component: ProjectsPage,
});

type Project = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  tools_used: string[];
  images: string[];
  external_link: string | null;
};

const field =
  "w-full rounded-xl bg-paper px-3.5 py-3 text-sm outline-none ring-1 ring-ink/10 focus:ring-brand";

function ProjectsPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Project | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const { data: projects, isLoading } = useQuery({
    queryKey: ["my-projects", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, description, category, tools_used, images, external_link")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });

  async function remove(id: string) {
    if (!confirm("هل تريد حذف هذا المشروع؟")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      toast.error("تعذّر حذف المشروع");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["my-projects", user?.id] });
    toast.success("تم حذف المشروع");
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-black">أعمالي</h1>
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            ➕ إضافة مشروع
          </button>
        </div>

        <section className="mt-6">
          {isLoading ? (
            <p className="py-10 text-center text-sm font-bold text-muted-foreground">
              جارٍ التحميل...
            </p>
          ) : !projects || projects.length === 0 ? (
            <div className="rounded-2xl bg-card p-8 text-center ring-1 ring-ink/10">
              <p className="font-display text-lg font-extrabold">لا توجد مشاريع بعد</p>
              <p className="mt-2 text-sm text-muted-foreground">
                أضف أول عمل لك ليظهر في صفحتك العامة.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-2xl bg-card ring-1 ring-ink/10">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.title} className="h-40 w-full object-cover" />
                  ) : (
                    <div className="grid h-40 w-full place-items-center bg-paper text-3xl">🗂️</div>
                  )}
                  <div className="p-3">
                    <p className="truncate text-sm font-extrabold">{p.title}</p>
                    <p className="truncate text-xs font-bold text-ink/50">
                      {categoryLabel(p.category) || "بدون تصنيف"}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          setEditing(p);
                          setFormOpen(true);
                        }}
                        className="flex-1 rounded-lg bg-paper py-2 text-xs font-bold ring-1 ring-ink/10"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => remove(p.id)}
                        className="flex-1 rounded-lg bg-clay/10 py-2 text-xs font-bold text-clay"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {formOpen ? (
        <ProjectForm
          userId={user!.id}
          project={editing}
          onClose={() => setFormOpen(false)}
          onSaved={async () => {
            setFormOpen(false);
            await queryClient.invalidateQueries({ queryKey: ["my-projects", user?.id] });
          }}
        />
      ) : null}
    </div>
  );
}

function ProjectForm({
  userId,
  project,
  onClose,
  onSaved,
}: {
  userId: string;
  project: Project | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(project?.title ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [category, setCategory] = useState(project?.category ?? "");
  const [tools, setTools] = useState((project?.tools_used ?? []).join("، "));
  const [images, setImages] = useState<string[]>(project?.images ?? []);
  const [link, setLink] = useState(project?.external_link ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of files) urls.push(await uploadImage("project-images", userId, f));
      setImages((prev) => [...prev, ...urls].slice(0, 8));
      toast.success("تم رفع الصور");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر رفع الصور");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) {
      toast.error("اكتب اسم المشروع");
      return;
    }
    if (link && !/^https?:\/\//.test(link.trim())) {
      toast.error("الرابط الخارجي يجب أن يبدأ بـ http أو https");
      return;
    }

    const payload = {
      user_id: userId,
      title: title.trim().slice(0, 120),
      description: description.trim().slice(0, 2000),
      category: category || null,
      tools_used: tools
        .split(/[،,]/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12),
      images,
      external_link: link.trim() || null,
    };

    setSaving(true);
    const { error } = project
      ? await supabase.from("projects").update(payload).eq("id", project.id)
      : await supabase.from("projects").insert(payload);
    setSaving(false);

    if (error) {
      toast.error("تعذّر حفظ المشروع");
      return;
    }
    toast.success(project ? "تم تحديث المشروع" : "تمت إضافة المشروع");
    onSaved();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-t-2xl bg-card p-4 sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-black">
            {project ? "تعديل مشروع" : "مشروع جديد"}
          </h2>
          <button type="button" onClick={onClose} className="text-lg font-bold text-ink/40">
            ✕
          </button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold">اسم المشروع</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold">الوصف</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold">التصنيف</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
            <option value="">بدون تصنيف</option>
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold">الأدوات المستخدمة (افصل بفاصلة)</label>
          <input
            value={tools}
            onChange={(e) => setTools(e.target.value)}
            placeholder="Photoshop، Figma"
            className={field}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold">رابط خارجي (اختياري)</label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            dir="ltr"
            placeholder="https://..."
            className={field}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold">صور المشروع</label>
          <div className="flex flex-wrap gap-2">
            {images.map((img) => (
              <div key={img} className="relative">
                <img src={img} alt="صورة المشروع" className="size-20 rounded-xl object-cover" />
                <button
                  type="button"
                  onClick={() => setImages(images.filter((x) => x !== img))}
                  className="absolute -top-1.5 -left-1.5 grid size-6 place-items-center rounded-full bg-ink text-xs text-paper"
                >
                  ✕
                </button>
              </div>
            ))}
            <label className="grid size-20 cursor-pointer place-items-center rounded-xl bg-paper text-2xl ring-1 ring-ink/10">
              {uploading ? "…" : "+"}
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                onChange={onPick}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || uploading}
          className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ المشروع"}
        </button>
      </form>
    </div>
  );
}
