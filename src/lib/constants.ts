export const CATEGORIES = [
  { key: "design", label: "تصميم", icon: "🎨" },
  { key: "dev", label: "برمجة", icon: "⌨️" },
  { key: "engineering", label: "هندسة", icon: "📐" },
  { key: "teaching", label: "تعليم", icon: "📚" },
  { key: "photo", label: "تصوير", icon: "📷" },
  { key: "services", label: "خدمات", icon: "🛠️" },
] as const;

export function categoryLabel(key?: string | null) {
  return CATEGORIES.find((c) => c.key === key)?.label ?? "";
}

export function categoryIcon(key?: string | null) {
  return CATEGORIES.find((c) => c.key === key)?.icon ?? "✦";
}

export const SKILLS_BY_CATEGORY: Record<string, string[]> = {
  design: ["هوية بصرية", "تصميم واجهات", "موشن جرافيك", "سوشيال ميديا", "طباعة", "لوجو"],
  dev: ["React", "Flutter", "Laravel", "WordPress", "Node.js", "قواعد بيانات"],
  engineering: ["AutoCAD", "SketchUp", "3ds Max", "Revit", "مساحة", "إشراف تنفيذ"],
  teaching: ["رياضيات", "لغة إنجليزية", "فيزياء", "لغة عربية", "دروس أونلاين", "تأسيس"],
  photo: ["تصوير منتجات", "تصوير أفراح", "بورتريه", "مونتاج", "تصوير جوي", "ريتاتش"],
  services: ["كهرباء", "سباكة", "نجارة", "تكييف", "دهانات", "صيانة أجهزة"],
};

export const EGYPT_CITIES = [
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "القليوبية",
  "الشرقية",
  "الدقهلية",
  "الغربية",
  "المنوفية",
  "البحيرة",
  "كفر الشيخ",
  "دمياط",
  "بورسعيد",
  "الإسماعيلية",
  "السويس",
  "شمال سيناء",
  "جنوب سيناء",
  "الفيوم",
  "بني سويف",
  "المنيا",
  "أسيوط",
  "سوهاج",
  "قنا",
  "الأقصر",
  "أسوان",
  "البحر الأحمر",
  "الوادي الجديد",
  "مطروح",
];
