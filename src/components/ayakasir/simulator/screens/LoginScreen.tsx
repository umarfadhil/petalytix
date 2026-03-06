"use client";

import { useState } from "react";
import { useSimulator } from "../context";
import { SIM_USERNAME, SIM_PASSWORD } from "../constants";

export default function LoginScreen() {
  const { dispatch, copy } = useSimulator();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (username === SIM_USERNAME && password === SIM_PASSWORD) {
      dispatch({ type: "LOGIN" });
    } else {
      setError(true);
    }
  }

  return (
    <div className="sim-screen sim-login">
      <div className="sim-login-logo">
        <span className="sim-login-logo-text">AyaKa$ir</span>
      </div>
      <form className="sim-login-form" onSubmit={handleSubmit}>
        <div className="sim-field">
          <label className="sim-label">{copy.login.userLabel}</label>
          <input
            className="sim-input"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(false);
            }}
            autoComplete="off"
          />
        </div>
        <div className="sim-field">
          <label className="sim-label">{copy.login.passLabel}</label>
          <input
            className="sim-input"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            autoComplete="off"
          />
        </div>
        {error && <p className="sim-error">{copy.login.error}</p>}
        <button type="submit" className="sim-btn sim-btn-primary sim-btn-full">
          {copy.login.submit}
        </button>
      </form>
      <div className="sim-login-hint">
        <p>{copy.login.hint}</p>
      </div>
    </div>
  );
}
