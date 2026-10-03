export type TranslationDisplayMode = "original" | "deutsch" | "marie";
export type TranslationMode = Exclude<TranslationDisplayMode, "original">;

export type TranslatableFields = {
  title?: string | null;
  description?: string | null;
  location?: string | null;
  name?: string | null;
  quantity?: string | null;
  category?: string | null;
};

export type TranslationItem = {
  id: string;
  fields: TranslatableFields;
};

export type TranslatedItem = {
  id: string;
  fields: TranslatableFields;
};
