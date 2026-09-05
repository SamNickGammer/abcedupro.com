"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { SITE } from "@/lib/site-config";

/**
 * There is no mail transport wired up yet — the Laravel app had none either —
 * so rather than pretend to send, this composes a pre-filled email and hands it
 * to the visitor's mail client. Swap in a POST to an API route once an SMTP or
 * Resend account exists.
 */
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      "",
      message,
    ]
      .filter((line) => line !== null)
      .join("\n");

    window.location.href = `${SITE.emailHref}?subject=${encodeURIComponent(
      `Enquiry from ${name || "the website"}`,
    )}&body=${encodeURIComponent(body)}`;
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="c-name" required>
          <input
            id="c-name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
            autoComplete="name"
          />
        </Field>
        <Field label="Phone" htmlFor="c-phone">
          <input
            id="c-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={inputClass}
            autoComplete="tel"
            inputMode="tel"
          />
        </Field>
      </div>

      <Field label="Email" htmlFor="c-email" required>
        <input
          id="c-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
          autoComplete="email"
        />
      </Field>

      <Field label="Message" htmlFor="c-message" required>
        <textarea
          id="c-message"
          required
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className={inputClass}
          placeholder="Which course are you interested in?"
        />
      </Field>

      <Button type="submit" size="lg" className="w-full">
        Send enquiry
      </Button>
      <p className="text-center text-xs text-neutral-400">
        Opens your email app with the message ready to send.
      </p>
    </form>
  );
}
