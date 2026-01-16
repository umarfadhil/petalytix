"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { SectionConfig, SiteSettings } from "@/lib/site-settings";
import { SettingsState, updateSettingsAction } from "./actions";

const initialState: SettingsState = { ok: true, message: "" };

type LocalizedFieldProps = {
  name: string;
  label: string;
  values: { en: string; id: string };
  multiline?: boolean;
  rows?: number;
};

type TabKey = "home" | "about" | "portfolio" | "contact";

type SectionLabel = {
  id: string;
  label: string;
};

type SectionControlProps = {
  prefix: TabKey;
  section: SectionConfig;
  label: string;
};

const SETTINGS_TABS: { id: TabKey; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "portfolio", label: "Portfolio" },
  { id: "contact", label: "Contact" }
];

const HOME_SECTION_LABELS: SectionLabel[] = [
  { id: "hero", label: "Hero" },
  { id: "metrics", label: "Metrics" },
  { id: "capabilities", label: "Capabilities" },
  { id: "projects", label: "Home sections" },
  { id: "process", label: "Process" },
  { id: "contact", label: "Contact teaser" }
];

const ABOUT_SECTION_LABELS: SectionLabel[] = [
  { id: "about", label: "About content" }
];

const PORTFOLIO_SECTION_LABELS: SectionLabel[] = [
  { id: "intro", label: "Portfolio intro" },
  { id: "list", label: "Project list" }
];

const CONTACT_SECTION_LABELS: SectionLabel[] = [
  { id: "intro", label: "Contact intro" },
  { id: "details", label: "Contact details" },
  { id: "form", label: "Contact form" }
];

function LocalizedField({
  name,
  label,
  values,
  multiline = false,
  rows = 3
}: LocalizedFieldProps) {
  return (
    <div className="localized-field">
      <div className="localized-column">
        <label className="form-label" htmlFor={`${name}_en`}>
          {label} (EN)
        </label>
        {multiline ? (
          <textarea
            id={`${name}_en`}
            name={`${name}_en`}
            rows={rows}
            defaultValue={values.en}
          />
        ) : (
          <input
            id={`${name}_en`}
            name={`${name}_en`}
            type="text"
            defaultValue={values.en}
          />
        )}
      </div>
      <div className="localized-column">
        <label className="form-label" htmlFor={`${name}_id`}>
          {label} (ID)
        </label>
        {multiline ? (
          <textarea
            id={`${name}_id`}
            name={`${name}_id`}
            rows={rows}
            defaultValue={values.id}
          />
        ) : (
          <input
            id={`${name}_id`}
            name={`${name}_id`}
            type="text"
            defaultValue={values.id}
          />
        )}
      </div>
    </div>
  );
}

function getSectionConfig(
  sections: SectionConfig[],
  id: string,
  fallbackOrder: number
) {
  const section = sections.find((item) => item.id === id);
  return section ?? { id, enabled: true, order: fallbackOrder };
}

function SectionControlRow({ prefix, section, label }: SectionControlProps) {
  const orderId = `${prefix}_section_${section.id}_order`;

  return (
    <div className="section-control-row">
      <label className="admin-checkbox">
        <input
          type="checkbox"
          name={`${prefix}_section_${section.id}_enabled`}
          defaultChecked={section.enabled}
        />
        {label}
      </label>
      <div className="section-control-order">
        <label className="form-label" htmlFor={orderId}>
          Order
        </label>
        <input
          id={orderId}
          name={orderId}
          type="number"
          min={1}
          defaultValue={section.order}
          inputMode="numeric"
        />
      </div>
    </div>
  );
}

export default function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, formAction] = useFormState(updateSettingsAction, initialState);
  const [activeTab, setActiveTab] = useState<TabKey>("home");

  return (
    <form
      className="admin-form"
      action={formAction}
      encType="multipart/form-data"
    >
      <input type="hidden" name="metric_count" value={settings.metrics.length} />
      <input
        type="hidden"
        name="capability_count"
        value={settings.capabilities.length}
      />
      <input
        type="hidden"
        name="process_count"
        value={settings.process.length}
      />

      <div className="settings-tabs" role="tablist" aria-label="Site sections">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            id={`settings-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`settings-panel-${tab.id}`}
            className={activeTab === tab.id ? "settings-tab active" : "settings-tab"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        id="settings-panel-home"
        role="tabpanel"
        aria-labelledby="settings-tab-home"
        className={activeTab === "home" ? "settings-panel is-active" : "settings-panel"}
      >
        <div className="admin-section">
          <h2 className="admin-section-title">Layout</h2>
          <div className="section-control-list">
            {HOME_SECTION_LABELS.map((section, index) => (
              <SectionControlRow
                key={`home-${section.id}`}
                prefix="home"
                label={section.label}
                section={getSectionConfig(
                  settings.pageSections.home,
                  section.id,
                  index + 1
                )}
              />
            ))}
          </div>
        </div>

        <div className="admin-section">
          <h2 className="admin-section-title">Home hero</h2>
          <LocalizedField
            name="hero_eyebrow"
            label="Eyebrow"
            values={settings.hero.eyebrow}
          />
          <LocalizedField
            name="hero_title"
            label="Title"
            values={settings.hero.title}
          />
          <LocalizedField
            name="hero_subtitle"
            label="Subtitle"
            values={settings.hero.subtitle}
            multiline
            rows={4}
          />
          <LocalizedField
            name="hero_badge"
            label="Badge"
            values={settings.hero.badge}
          />
          <LocalizedField
            name="hero_cta_primary"
            label="Primary CTA"
            values={settings.hero.ctaPrimary}
          />
          <LocalizedField
            name="hero_cta_secondary"
            label="Secondary CTA"
            values={settings.hero.ctaSecondary}
          />
        </div>

        <div className="admin-section">
          <h2 className="admin-section-title">Home metrics</h2>
          <LocalizedField
            name="section_metrics_title"
            label="Metrics title"
            values={settings.sections.metricsTitle}
          />
          <LocalizedField
            name="section_metrics_subtitle"
            label="Metrics subtitle"
            values={settings.sections.metricsSubtitle}
          />
          {settings.metrics.map((metric, index) => (
            <div className="admin-subsection" key={`metric-${index}`}>
              <label className="form-label" htmlFor={`metric_${index}_value`}>
                Metric value #{index + 1}
              </label>
              <input
                id={`metric_${index}_value`}
                name={`metric_${index}_value`}
                type="text"
                defaultValue={metric.value}
              />
              <LocalizedField
                name={`metric_${index}_label`}
                label={`Metric label #${index + 1}`}
                values={metric.label}
              />
            </div>
          ))}
        </div>

        <div className="admin-section">
          <h2 className="admin-section-title">Capabilities</h2>
          <LocalizedField
            name="section_capabilities_title"
            label="Capabilities title"
            values={settings.sections.capabilitiesTitle}
          />
          <LocalizedField
            name="section_capabilities_subtitle"
            label="Capabilities subtitle"
            values={settings.sections.capabilitiesSubtitle}
          />
          {settings.capabilities.map((capability, index) => (
            <div className="admin-subsection" key={`capability-${index}`}>
              <LocalizedField
                name={`capability_${index}_title`}
                label={`Capability title #${index + 1}`}
                values={capability.title}
              />
              <LocalizedField
                name={`capability_${index}_description`}
                label={`Capability description #${index + 1}`}
                values={capability.description}
                multiline
                rows={3}
              />
            </div>
          ))}
        </div>

        <div className="admin-section">
          <h2 className="admin-section-title">Home sections</h2>
          <LocalizedField
            name="section_projects_title"
            label="Projects title"
            values={settings.sections.projectsTitle}
          />
          <LocalizedField
            name="section_projects_subtitle"
            label="Projects subtitle"
            values={settings.sections.projectsSubtitle}
          />
        </div>

        <div className="admin-section">
          <h2 className="admin-section-title">Process</h2>
          <LocalizedField
            name="section_process_title"
            label="Process title"
            values={settings.sections.processTitle}
          />
          <LocalizedField
            name="section_process_subtitle"
            label="Process subtitle"
            values={settings.sections.processSubtitle}
          />
          {settings.process.map((step, index) => (
            <div className="admin-subsection" key={`process-${index}`}>
              <LocalizedField
                name={`process_${index}_title`}
                label={`Step title #${index + 1}`}
                values={step.title}
              />
              <LocalizedField
                name={`process_${index}_description`}
                label={`Step description #${index + 1}`}
                values={step.description}
                multiline
                rows={3}
              />
            </div>
          ))}
        </div>
      </div>

      <div
        id="settings-panel-about"
        role="tabpanel"
        aria-labelledby="settings-tab-about"
        className={
          activeTab === "about" ? "settings-panel is-active" : "settings-panel"
        }
      >
        <div className="admin-section">
          <h2 className="admin-section-title">Layout</h2>
          <div className="section-control-list">
            {ABOUT_SECTION_LABELS.map((section, index) => (
              <SectionControlRow
                key={`about-${section.id}`}
                prefix="about"
                label={section.label}
                section={getSectionConfig(
                  settings.pageSections.about,
                  section.id,
                  index + 1
                )}
              />
            ))}
          </div>
        </div>

        <div className="admin-section">
          <h2 className="admin-section-title">About page</h2>
          <LocalizedField
            name="about_title"
            label="Title"
            values={settings.about.title}
          />
          <LocalizedField
            name="about_subtitle"
            label="Subtitle"
            values={settings.about.subtitle}
            multiline
            rows={3}
          />
          <LocalizedField
            name="about_story"
            label="Story"
            values={settings.about.story}
            multiline
            rows={5}
          />
          <LocalizedField
            name="about_invite"
            label="Invite"
            values={settings.about.invite}
            multiline
            rows={3}
          />
          <div className="admin-subsection">
            <label className="form-label" htmlFor="about_photo_file">
              Portrait photo
            </label>
            <input
              id="about_photo_file"
              name="about_photo_file"
              type="file"
              accept="image/*"
            />
            {settings.about.photo ? (
              <>
                <div className="admin-media-preview">
                  <img src={settings.about.photo} alt="Current portrait" />
                </div>
                <label className="admin-checkbox">
                  <input type="checkbox" name="about_photo_remove" />
                  Remove current photo
                </label>
              </>
            ) : (
              <p className="admin-help">No photo uploaded yet.</p>
            )}
          </div>
        </div>
      </div>

      <div
        id="settings-panel-portfolio"
        role="tabpanel"
        aria-labelledby="settings-tab-portfolio"
        className={
          activeTab === "portfolio"
            ? "settings-panel is-active"
            : "settings-panel"
        }
      >
        <div className="admin-section">
          <h2 className="admin-section-title">Layout</h2>
          <div className="section-control-list">
            {PORTFOLIO_SECTION_LABELS.map((section, index) => (
              <SectionControlRow
                key={`portfolio-${section.id}`}
                prefix="portfolio"
                label={section.label}
                section={getSectionConfig(
                  settings.pageSections.portfolio,
                  section.id,
                  index + 1
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        id="settings-panel-contact"
        role="tabpanel"
        aria-labelledby="settings-tab-contact"
        className={
          activeTab === "contact"
            ? "settings-panel is-active"
            : "settings-panel"
        }
      >
        <div className="admin-section">
          <h2 className="admin-section-title">Layout</h2>
          <div className="section-control-list">
            {CONTACT_SECTION_LABELS.map((section, index) => (
              <SectionControlRow
                key={`contact-${section.id}`}
                prefix="contact"
                label={section.label}
                section={getSectionConfig(
                  settings.pageSections.contact,
                  section.id,
                  index + 1
                )}
              />
            ))}
          </div>
        </div>

        <div className="admin-section">
          <h2 className="admin-section-title">Contact page</h2>
          <LocalizedField
            name="contact_title"
            label="Title"
            values={settings.contact.title}
          />
          <LocalizedField
            name="contact_subtitle"
            label="Subtitle"
            values={settings.contact.subtitle}
            multiline
            rows={3}
          />
          <LocalizedField
            name="contact_response"
            label="Response note"
            values={settings.contact.responseNote}
          />
          <div className="admin-subsection">
            <label className="form-label" htmlFor="contact_email">
              Contact email
            </label>
            <input
              id="contact_email"
              name="contact_email"
              type="email"
              defaultValue={settings.contactInfo.email}
            />
            <label className="form-label" htmlFor="contact_phone">
              Contact phone
            </label>
            <input
              id="contact_phone"
              name="contact_phone"
              type="text"
              defaultValue={settings.contactInfo.phone}
            />
            <label className="form-label" htmlFor="contact_city">
              City
            </label>
            <input
              id="contact_city"
              name="contact_city"
              type="text"
              defaultValue={settings.contactInfo.city}
            />
            <label className="form-label" htmlFor="contact_country">
              Country
            </label>
            <input
              id="contact_country"
              name="contact_country"
              type="text"
              defaultValue={settings.contactInfo.country}
            />
            <label className="form-label" htmlFor="contact_coordinates">
              Coordinates
            </label>
            <input
              id="contact_coordinates"
              name="contact_coordinates"
              type="text"
              defaultValue={settings.contactInfo.coordinates}
            />
          </div>
        </div>
      </div>

      <button className="button primary" type="submit">
        Save settings
      </button>
      {state.message ? (
        <p className={state.ok ? "form-success" : "form-error"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
