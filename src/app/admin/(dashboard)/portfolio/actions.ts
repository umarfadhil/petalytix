"use server";

import {
  createPortfolioItem,
  deletePortfolioItem,
  getPortfolioItemById,
  updatePortfolioItem
} from "@/lib/portfolio";
import { redirect } from "next/navigation";

export type ActionState = { ok: boolean; message: string };
type UploadResult<T> = { value?: T; error?: string };

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getField(formData: FormData, name: string) {
  return String(formData.get(name) || "").trim();
}

function isChecked(formData: FormData, name: string) {
  return Boolean(formData.get(name));
}

async function fileToDataUrl(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const contentType = file.type || "application/octet-stream";
  return `data:${contentType};base64,${base64}`;
}

async function getCoverImage(formData: FormData): Promise<UploadResult<string>> {
  if (isChecked(formData, "coverImageRemove")) {
    return { value: "" };
  }

  const file = formData.get("coverImageFile");
  if (file instanceof File && file.size > 0) {
    return { value: await fileToDataUrl(file) };
  }

  return {};
}

async function getImages(formData: FormData): Promise<UploadResult<string[]>> {
  if (isChecked(formData, "imagesRemove")) {
    return { value: [] as string[] };
  }

  const entries = formData.getAll("imagesFiles");
  const files = entries.filter(
    (entry): entry is File => entry instanceof File && entry.size > 0
  );

  if (files.length === 0) {
    return {};
  }

  if (files.length > 3) {
    return { error: "You can upload up to 3 images." };
  }

  const images = await Promise.all(files.map((file) => fileToDataUrl(file)));
  return { value: images };
}

function isPdfFile(file: File) {
  if (file.type === "application/pdf") {
    return true;
  }
  return file.name.toLowerCase().endsWith(".pdf");
}

async function getAttachment(formData: FormData): Promise<UploadResult<string>> {
  if (isChecked(formData, "attachmentRemove")) {
    return { value: "" };
  }

  const file = formData.get("attachmentFile");
  if (file instanceof File && file.size > 0) {
    if (!isPdfFile(file)) {
      return { error: "Attachment must be a PDF file." };
    }
    return { value: await fileToDataUrl(file) };
  }

  return {};
}

async function buildPayload(formData: FormData) {
  const coverResult = await getCoverImage(formData);
  if (coverResult.error) {
    return { error: coverResult.error };
  }
  const imagesResult = await getImages(formData);
  if (imagesResult.error) {
    return { error: imagesResult.error };
  }
  const attachmentResult = await getAttachment(formData);
  if (attachmentResult.error) {
    return { error: attachmentResult.error };
  }

  const titleEn = getField(formData, "title_en");
  const titleId = getField(formData, "title_id");
  const summaryEn = getField(formData, "summary_en");
  const summaryId = getField(formData, "summary_id");
  const descriptionEn = getField(formData, "description_en");
  const descriptionId = getField(formData, "description_id");
  const year = getField(formData, "year");
  const location = getField(formData, "location");
  const slugInput = getField(formData, "slug");
  const primaryUrl = getField(formData, "primaryUrl");
  const tags = parseList(getField(formData, "tags"));
  const featured = Boolean(formData.get("featured"));

  const slug = slugInput || slugify(titleEn || titleId);

  return {
    payload: {
      slug,
      title: { en: titleEn, id: titleId },
      summary: { en: summaryEn, id: summaryId },
      description: { en: descriptionEn, id: descriptionId },
      year,
      location,
      tags,
      primaryUrl: primaryUrl || undefined,
      coverImage: coverResult.value,
      images: imagesResult.value,
      attachment: attachmentResult.value,
      featured
    }
  };
}

function validatePayload(payload: Awaited<ReturnType<typeof buildPayload>>["payload"]) {
  if (!payload) {
    return "Invalid portfolio payload.";
  }
  if (!payload.title.en || !payload.title.id) {
    return "Title is required in both languages.";
  }
  if (!payload.summary.en || !payload.summary.id) {
    return "Summary is required in both languages.";
  }
  if (!payload.year || !payload.location) {
    return "Year and location are required.";
  }
  if (payload.images && payload.images.length > 3) {
    return "You can upload up to 3 images.";
  }
  return null;
}

export async function createPortfolioAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { payload, error: buildError } = await buildPayload(formData);
  if (buildError || !payload) {
    return { ok: false, message: buildError || "Invalid portfolio payload." };
  }

  const error = validatePayload(payload);
  if (error) {
    return { ok: false, message: error };
  }

  await createPortfolioItem(payload);
  redirect("/admin");
}

export async function updatePortfolioAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { payload, error: buildError } = await buildPayload(formData);
  const id = getField(formData, "id");
  if (buildError || !payload) {
    return { ok: false, message: buildError || "Invalid portfolio payload." };
  }
  const error = validatePayload(payload);
  if (error) {
    return { ok: false, message: error };
  }
  if (!id) {
    return { ok: false, message: "Missing portfolio item id." };
  }

  const needsExisting =
    payload.coverImage === undefined ||
    payload.images === undefined ||
    payload.attachment === undefined;
  if (needsExisting) {
    const existing = await getPortfolioItemById(id);
    if (existing) {
      if (payload.coverImage === undefined) {
        payload.coverImage = existing.coverImage;
      }
      if (payload.images === undefined) {
        payload.images = existing.images;
      }
      if (payload.attachment === undefined) {
        payload.attachment = existing.attachment;
      }
    }
  }

  await updatePortfolioItem(id, payload);
  redirect("/admin");
}

export async function deletePortfolioAction(formData: FormData) {
  const id = getField(formData, "id");
  if (!id) {
    return;
  }
  await deletePortfolioItem(id);
  redirect("/admin");
}
