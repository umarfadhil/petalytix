"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitDeleteAccount } from "@/app/ayakasir/actions/delete-account";
import { AyaKasirCopyType } from "@/lib/ayakasir-content";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="button primary" disabled={pending}>
      {pending ? "..." : label}
    </button>
  );
}

export default function DeleteAccountForm({
  locale,
  copy
}: {
  locale: string;
  copy: AyaKasirCopyType;
}) {
  const labels = copy.deleteAccount.form;
  const [state, action] = useFormState(submitDeleteAccount, {
    ok: false,
    message: ""
  });

  return (
    <form action={action} className="contact-form">
      <input type="hidden" name="locale" value={locale} />

      <div className="ayakasir-form-field">
        <label className="form-label" htmlFor="email">
          {labels.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder={labels.emailPlaceholder}
          autoComplete="email"
        />
      </div>

      <div className="ayakasir-form-field">
        <label className="form-label" htmlFor="reason">
          {labels.reasonLabel}
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={4}
          placeholder={labels.reasonPlaceholder}
        />
      </div>

      <SubmitButton label={labels.submit} />

      {state.message && (
        <p className={state.ok ? "form-success" : "form-error"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
