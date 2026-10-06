"use client";

import { useState, useTransition, type FormEvent } from "react";

// React 19 resets an uncontrolled form after a form-`action` finishes — even when the action
// returned a validation error, which wiped everything the user had typed. This submits via
// onSubmit instead, so the fields stay put on an error. Pass `resetOnSuccess` for forms that
// stay on the page afterwards (e.g. a chat box); redirecting actions navigate away on their own.
export function useServerForm<S extends { error?: string } | undefined>(
  action: (prev: S | undefined, formData: FormData) => Promise<S | undefined>,
  opts: { resetOnSuccess?: boolean } = {}
) {
  const [state, setState] = useState<S | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const next = await action(state, data);
      setState(next);
      if (opts.resetOnSuccess && !next?.error) form.reset();
    });
  }

  return { state, pending, onSubmit };
}
