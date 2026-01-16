"use client";

import { useFormState } from "react-dom";
import { loginAction } from "./actions";

const initialState = { ok: true, message: "" };

export default function LoginForm() {
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <form className="admin-form" action={formAction}>
      <label className="form-label" htmlFor="email">
        Email
      </label>
      <input id="email" name="email" type="email" required />

      <label className="form-label" htmlFor="password">
        Password
      </label>
      <input id="password" name="password" type="password" required />

      <button className="button primary" type="submit">
        Sign in
      </button>
      {state.message ? (
        <p className={state.ok ? "form-success" : "form-error"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
