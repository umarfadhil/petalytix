"use server";

import { revalidatePath } from "next/cache";
import { SiteSettings, getSiteSettings, updateSiteSettings } from "@/lib/site-settings";

export type SettingsState = { ok: boolean; message: string };

function getField(formData: FormData, name: string) {
  return String(formData.get(name) || "").trim();
}

function getLocalized(formData: FormData, name: string) {
  return {
    en: getField(formData, `${name}_en`),
    id: getField(formData, `${name}_id`)
  };
}

function buildList<T>(count: number, builder: (index: number) => T): T[] {
  return Array.from({ length: count }, (_, index) => builder(index));
}

async function fileToDataUrl(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const contentType = file.type || "application/octet-stream";
  return `data:${contentType};base64,${base64}`;
}

async function resolveAboutPhoto(formData: FormData) {
  const file = formData.get("about_photo_file");
  if (file instanceof File && file.size > 0) {
    return await fileToDataUrl(file);
  }

  const removePhoto = Boolean(formData.get("about_photo_remove"));
  if (removePhoto) {
    return "";
  }

  const existing = await getSiteSettings();
  return existing.about.photo || "";
}

const HOME_SECTIONS = [
  "hero",
  "metrics",
  "capabilities",
  "projects",
  "process",
  "contact"
];
const ABOUT_SECTIONS = ["about"];
const PORTFOLIO_SECTIONS = ["intro", "list"];
const CONTACT_SECTIONS = ["intro", "details", "form"];

function getSectionOrder(formData: FormData, name: string, fallback: number) {
  const value = Number(formData.get(name));
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
}

function buildPageSections(
  formData: FormData,
  prefix: string,
  ids: string[]
) {
  return ids.map((id, index) => ({
    id,
    enabled: Boolean(formData.get(`${prefix}_section_${id}_enabled`)),
    order: getSectionOrder(
      formData,
      `${prefix}_section_${id}_order`,
      index + 1
    )
  }));
}

export async function updateSettingsAction(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const metricCount = Number(formData.get("metric_count") || 0);
  const capabilityCount = Number(formData.get("capability_count") || 0);
  const processCount = Number(formData.get("process_count") || 0);
  const aboutPhoto = await resolveAboutPhoto(formData);

  const settings: SiteSettings = {
    pageSections: {
      home: buildPageSections(formData, "home", HOME_SECTIONS),
      about: buildPageSections(formData, "about", ABOUT_SECTIONS),
      portfolio: buildPageSections(formData, "portfolio", PORTFOLIO_SECTIONS),
      contact: buildPageSections(formData, "contact", CONTACT_SECTIONS)
    },
    hero: {
      eyebrow: getLocalized(formData, "hero_eyebrow"),
      title: getLocalized(formData, "hero_title"),
      subtitle: getLocalized(formData, "hero_subtitle"),
      badge: getLocalized(formData, "hero_badge"),
      ctaPrimary: getLocalized(formData, "hero_cta_primary"),
      ctaSecondary: getLocalized(formData, "hero_cta_secondary")
    },
    sections: {
      metricsTitle: getLocalized(formData, "section_metrics_title"),
      metricsSubtitle: getLocalized(formData, "section_metrics_subtitle"),
      capabilitiesTitle: getLocalized(formData, "section_capabilities_title"),
      capabilitiesSubtitle: getLocalized(formData, "section_capabilities_subtitle"),
      projectsTitle: getLocalized(formData, "section_projects_title"),
      projectsSubtitle: getLocalized(formData, "section_projects_subtitle"),
      processTitle: getLocalized(formData, "section_process_title"),
      processSubtitle: getLocalized(formData, "section_process_subtitle")
    },
    metrics: buildList(metricCount, (index) => ({
      value: getField(formData, `metric_${index}_value`),
      label: getLocalized(formData, `metric_${index}_label`)
    })),
    capabilities: buildList(capabilityCount, (index) => ({
      title: getLocalized(formData, `capability_${index}_title`),
      description: getLocalized(formData, `capability_${index}_description`)
    })),
    process: buildList(processCount, (index) => ({
      title: getLocalized(formData, `process_${index}_title`),
      description: getLocalized(formData, `process_${index}_description`)
    })),
    about: {
      title: getLocalized(formData, "about_title"),
      subtitle: getLocalized(formData, "about_subtitle"),
      story: getLocalized(formData, "about_story"),
      invite: getLocalized(formData, "about_invite"),
      photo: aboutPhoto
    },
    contact: {
      title: getLocalized(formData, "contact_title"),
      subtitle: getLocalized(formData, "contact_subtitle"),
      responseNote: getLocalized(formData, "contact_response")
    },
    contactInfo: {
      email: getField(formData, "contact_email"),
      phone: getField(formData, "contact_phone"),
      city: getField(formData, "contact_city"),
      country: getField(formData, "contact_country"),
      coordinates: getField(formData, "contact_coordinates")
    }
  };

  try {
    await updateSiteSettings(settings);
    revalidatePath("/en");
    revalidatePath("/id");
    revalidatePath("/en/about");
    revalidatePath("/id/about");
    revalidatePath("/en/contact");
    revalidatePath("/id/contact");
    revalidatePath("/en/portfolio");
    revalidatePath("/id/portfolio");
  } catch (error) {
    return { ok: false, message: "Failed to update site settings." };
  }

  return { ok: true, message: "Site settings updated." };
}
