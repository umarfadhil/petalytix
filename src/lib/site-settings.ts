import clientPromise from "./mongodb";
import { contactInfo, Locale, siteCopy } from "./content";

const DB_NAME = process.env.MONGODB_DB || "petalytix";
const COLLECTION = "site_settings";
const SETTINGS_ID = "global";

export type LocalizedText = {
  en: string;
  id: string;
};

export type MetricItem = {
  value: string;
  label: LocalizedText;
};

export type CapabilityItem = {
  title: LocalizedText;
  description: LocalizedText;
};

export type ProcessItem = {
  title: LocalizedText;
  description: LocalizedText;
};

export type SectionConfig = {
  id: string;
  enabled: boolean;
  order: number;
};

export type PageSections = {
  home: SectionConfig[];
  about: SectionConfig[];
  portfolio: SectionConfig[];
  contact: SectionConfig[];
};

export type SiteSettings = {
  hero: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    subtitle: LocalizedText;
    badge: LocalizedText;
    ctaPrimary: LocalizedText;
    ctaSecondary: LocalizedText;
  };
  sections: {
    metricsTitle: LocalizedText;
    metricsSubtitle: LocalizedText;
    capabilitiesTitle: LocalizedText;
    capabilitiesSubtitle: LocalizedText;
    projectsTitle: LocalizedText;
    projectsSubtitle: LocalizedText;
    processTitle: LocalizedText;
    processSubtitle: LocalizedText;
  };
  metrics: MetricItem[];
  capabilities: CapabilityItem[];
  process: ProcessItem[];
  about: {
    title: LocalizedText;
    subtitle: LocalizedText;
    story: LocalizedText;
    invite: LocalizedText;
    photo: string;
  };
  contact: {
    title: LocalizedText;
    subtitle: LocalizedText;
    responseNote: LocalizedText;
  };
  contactInfo: {
    email: string;
    phone: string;
    city: string;
    country: string;
    coordinates: string;
  };
  pageSections: PageSections;
};

type SettingsRecord = {
  _id: string;
  settings: SiteSettings;
  createdAt: Date;
  updatedAt: Date;
};

export function getDefaultSiteSettings(): SiteSettings {
  const metrics: MetricItem[] = siteCopy.en.metrics.map((metric, index) => ({
    value: metric.value,
    label: {
      en: metric.label,
      id: siteCopy.id.metrics[index]?.label || metric.label
    }
  }));

  const capabilities: CapabilityItem[] = siteCopy.en.capabilities.map(
    (capability, index) => ({
      title: {
        en: capability.title,
        id: siteCopy.id.capabilities[index]?.title || capability.title
      },
      description: {
        en: capability.description,
        id:
          siteCopy.id.capabilities[index]?.description || capability.description
      }
    })
  );

  const process: ProcessItem[] = siteCopy.en.process.map((step, index) => ({
    title: {
      en: step.title,
      id: siteCopy.id.process[index]?.title || step.title
    },
    description: {
      en: step.description,
      id: siteCopy.id.process[index]?.description || step.description
    }
  }));

  return {
    pageSections: {
      home: [
        { id: "hero", enabled: true, order: 1 },
        { id: "metrics", enabled: true, order: 2 },
        { id: "capabilities", enabled: true, order: 3 },
        { id: "projects", enabled: true, order: 4 },
        { id: "process", enabled: true, order: 5 },
        { id: "contact", enabled: true, order: 6 }
      ],
      about: [{ id: "about", enabled: true, order: 1 }],
      portfolio: [
        { id: "intro", enabled: true, order: 1 },
        { id: "list", enabled: true, order: 2 }
      ],
      contact: [
        { id: "intro", enabled: true, order: 1 },
        { id: "details", enabled: true, order: 2 },
        { id: "form", enabled: true, order: 3 }
      ]
    },
    hero: {
      eyebrow: { en: siteCopy.en.hero.eyebrow, id: siteCopy.id.hero.eyebrow },
      title: { en: siteCopy.en.hero.title, id: siteCopy.id.hero.title },
      subtitle: { en: siteCopy.en.hero.subtitle, id: siteCopy.id.hero.subtitle },
      badge: { en: siteCopy.en.hero.badge, id: siteCopy.id.hero.badge },
      ctaPrimary: {
        en: siteCopy.en.hero.ctaPrimary,
        id: siteCopy.id.hero.ctaPrimary
      },
      ctaSecondary: {
        en: siteCopy.en.hero.ctaSecondary,
        id: siteCopy.id.hero.ctaSecondary
      }
    },
    sections: {
      metricsTitle: {
        en: siteCopy.en.sections.metricsTitle,
        id: siteCopy.id.sections.metricsTitle
      },
      metricsSubtitle: {
        en: siteCopy.en.sections.metricsSubtitle,
        id: siteCopy.id.sections.metricsSubtitle
      },
      capabilitiesTitle: {
        en: siteCopy.en.sections.capabilitiesTitle,
        id: siteCopy.id.sections.capabilitiesTitle
      },
      capabilitiesSubtitle: {
        en: siteCopy.en.sections.capabilitiesSubtitle,
        id: siteCopy.id.sections.capabilitiesSubtitle
      },
      projectsTitle: {
        en: siteCopy.en.sections.projectsTitle,
        id: siteCopy.id.sections.projectsTitle
      },
      projectsSubtitle: {
        en: siteCopy.en.sections.projectsSubtitle,
        id: siteCopy.id.sections.projectsSubtitle
      },
      processTitle: {
        en: siteCopy.en.sections.processTitle,
        id: siteCopy.id.sections.processTitle
      },
      processSubtitle: {
        en: siteCopy.en.sections.processSubtitle,
        id: siteCopy.id.sections.processSubtitle
      }
    },
    metrics,
    capabilities,
    process,
    about: {
      title: { en: siteCopy.en.about.title, id: siteCopy.id.about.title },
      subtitle: {
        en: siteCopy.en.about.subtitle,
        id: siteCopy.id.about.subtitle
      },
      story: { en: siteCopy.en.about.story, id: siteCopy.id.about.story },
      invite: { en: siteCopy.en.about.invite, id: siteCopy.id.about.invite },
      photo: ""
    },
    contact: {
      title: { en: siteCopy.en.contact.title, id: siteCopy.id.contact.title },
      subtitle: {
        en: siteCopy.en.contact.subtitle,
        id: siteCopy.id.contact.subtitle
      },
      responseNote: {
        en: siteCopy.en.labels.responseNote,
        id: siteCopy.id.labels.responseNote
      }
    },
    contactInfo: {
      ...contactInfo
    }
  };
}

function mergeSectionConfig(
  base: SectionConfig[],
  override?: SectionConfig[]
) {
  if (!override || override.length === 0) {
    return base;
  }
  const overrideMap = new Map(
    override.map((section) => [section.id, section])
  );
  return base.map((section) => {
    const next = overrideMap.get(section.id);
    if (!next) {
      return section;
    }
    const order = Number.isFinite(next.order) ? next.order : section.order;
    return {
      ...section,
      ...next,
      order
    };
  });
}

function mergePageSections(base: PageSections, override?: PageSections) {
  if (!override) {
    return base;
  }
  return {
    home: mergeSectionConfig(base.home, override.home),
    about: mergeSectionConfig(base.about, override.about),
    portfolio: mergeSectionConfig(base.portfolio, override.portfolio),
    contact: mergeSectionConfig(base.contact, override.contact)
  };
}

function mergeSettings(base: SiteSettings, override?: Partial<SiteSettings>) {
  if (!override) {
    return base;
  }

  return {
    ...base,
    ...override,
    pageSections: mergePageSections(base.pageSections, override.pageSections),
    hero: { ...base.hero, ...override.hero },
    sections: { ...base.sections, ...override.sections },
    about: { ...base.about, ...override.about },
    contact: { ...base.contact, ...override.contact },
    contactInfo: { ...base.contactInfo, ...override.contactInfo },
    metrics: override.metrics && override.metrics.length > 0 ? override.metrics : base.metrics,
    capabilities:
      override.capabilities && override.capabilities.length > 0
        ? override.capabilities
        : base.capabilities,
    process: override.process && override.process.length > 0 ? override.process : base.process
  };
}

async function getCollection() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<SettingsRecord>(COLLECTION);
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const collection = await getCollection();
  const record = await collection.findOne({ _id: SETTINGS_ID });
  const defaults = getDefaultSiteSettings();

  if (!record?.settings) {
    return defaults;
  }

  return mergeSettings(defaults, record.settings);
}

export async function updateSiteSettings(settings: SiteSettings) {
  const collection = await getCollection();
  const now = new Date();

  await collection.updateOne(
    { _id: SETTINGS_ID },
    {
      $set: {
        settings,
        updatedAt: now
      },
      $setOnInsert: {
        createdAt: now
      }
    },
    { upsert: true }
  );
}

export function localize(text: LocalizedText, locale: Locale) {
  return locale === "id" ? text.id : text.en;
}

export function getOrderedSections(sections: SectionConfig[]) {
  return [...sections]
    .filter((section) => section.enabled)
    .sort((a, b) => a.order - b.order);
}
