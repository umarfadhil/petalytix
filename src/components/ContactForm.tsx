"use client";

import { useFormState } from "react-dom";
import { submitContact } from "@/app/actions/contact";
import { Locale, SiteCopy } from "@/lib/content";

const initialState = { ok: false, message: "" };

export default function ContactForm({
  locale,
  labels
}: {
  locale: Locale;
  labels: SiteCopy["form"];
}) {
  const [state, formAction] = useFormState(submitContact, initialState);

  return (
    <form className="contact-form" action={formAction}>
      <input type="hidden" name="locale" value={locale} />
      <label className="form-label" htmlFor="name">
        {labels.nameLabel}
      </label>
      <input
        id="name"
        name="name"
        type="text"
        placeholder={labels.namePlaceholder}
        required
      />

      <label className="form-label" htmlFor="email">
        {labels.emailLabel}
      </label>
      <input
        id="email"
        name="email"
        type="email"
        placeholder={labels.emailPlaceholder}
        required
      />

      <label className="form-label" htmlFor="phone">
        {labels.phoneLabel}
      </label>
      <input
        id="phone"
        name="phone"
        type="text"
        placeholder={labels.phonePlaceholder}
      />

      <label className="form-label" htmlFor="company">
        {labels.companyLabel}
      </label>
      <input
        id="company"
        name="company"
        type="text"
        placeholder={labels.companyPlaceholder}
      />

      <label className="form-label" htmlFor="message">
        {labels.messageLabel}
      </label>
      <textarea
        id="message"
        name="message"
        rows={5}
        placeholder={labels.messagePlaceholder}
        required
      />

      <button className="button primary" type="submit">
        {labels.submit}
      </button>
      {state.message ? (
        <p className={state.ok ? "form-success" : "form-error"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
