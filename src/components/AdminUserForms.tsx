"use client";

import { useEffect, useRef } from "react";
import { adminDeleteUserAction, adminUpdateUserAction } from "@/app/admin/actions";
import { useServerForm } from "@/lib/useServerForm";

type UserDetails = {
  id: string;
  name: string;
  email: string;
  age: number | null;
  gender: string | null;
  planTier: string;
  homeLocation: string | null;
  isAdmin: boolean;
  isSelf: boolean;
  locked: boolean;
};

export function AdminUserForm({ user }: { user: UserDetails }) {
  const { state, pending, onSubmit } = useServerForm(adminUpdateUserAction);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Never leave a typed password sitting in the field after it has been applied.
  useEffect(() => {
    if (state?.success && passwordRef.current) passwordRef.current.value = "";
  }, [state]);

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-4">
      <input type="hidden" name="userId" value={user.id} />
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="eyebrow text-slate" htmlFor="au-name">
            Name
          </label>
          <input id="au-name" name="name" defaultValue={user.name} required maxLength={60} className="input mt-1.5" />
        </div>
        <div>
          <label className="eyebrow text-slate" htmlFor="au-email">
            Email
          </label>
          <input id="au-email" type="email" name="email" defaultValue={user.email} required className="input mt-1.5" />
        </div>
        <div>
          <label className="eyebrow text-slate" htmlFor="au-age">
            Age
          </label>
          <input id="au-age" type="number" name="age" defaultValue={user.age ?? ""} min={13} max={120} className="input mt-1.5" />
        </div>
        <div>
          <label className="eyebrow text-slate" htmlFor="au-gender">
            Gender
          </label>
          <select id="au-gender" name="gender" defaultValue={user.gender ?? ""} className="input mt-1.5">
            <option value="">Not set</option>
            <option value="woman">Woman</option>
            <option value="man">Man</option>
          </select>
        </div>
        <div>
          <label className="eyebrow text-slate" htmlFor="au-home">
            Home location
          </label>
          <input id="au-home" name="homeLocation" defaultValue={user.homeLocation ?? ""} maxLength={200} className="input mt-1.5" />
        </div>
        <div>
          <label className="eyebrow text-slate" htmlFor="au-plan">
            Plan
          </label>
          <select id="au-plan" name="planTier" defaultValue={user.planTier} className="input mt-1.5">
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
        </div>
      </div>

      <div>
        <label className="eyebrow text-slate" htmlFor="au-pass">
          Set a new password (optional)
        </label>
        <input
          id="au-pass"
          ref={passwordRef}
          type="password"
          name="newPassword"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          className="input mt-1.5"
          placeholder="Leave blank to keep the current one"
        />
        <p className="text-xs text-slate mt-1.5">Changing it signs the user out everywhere.</p>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink/85">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isAdmin" defaultChecked={user.isAdmin} className="accent-ember" />
          Administrator
          {user.isSelf && <span className="text-xs text-slate">(this is you)</span>}
        </label>
        {user.locked && (
          <label className="flex items-center gap-2">
            <input type="checkbox" name="unlock" className="accent-ember" />
            Clear the login lockout
          </label>
        )}
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-ember-deep font-semibold">
          {state.error}
        </p>
      )}
      {state?.success && <p className="text-sm text-glacier-deep font-semibold">{state.success}</p>}
      <button className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

export function AdminDeleteUserForm({ userId, name, disabled }: { userId: string; name: string; disabled: boolean }) {
  const { state, pending, onSubmit } = useServerForm(adminDeleteUserAction);

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-3 border-ember/30">
      <h3 className="font-display italic text-lg text-ember-deep">Delete {name}</h3>
      <p className="text-sm text-slate">
        Permanently removes the account, their listings and photos, conversations, ratings given and received, and saved
        items. This can&apos;t be undone.
      </p>
      {disabled ? (
        <p className="text-sm text-slate font-semibold">You can&apos;t delete your own account from here — use Settings.</p>
      ) : (
        <>
          <input type="hidden" name="userId" value={userId} />
          <div>
            <label className="eyebrow text-slate" htmlFor="adu-confirm">
              Type DELETE to confirm
            </label>
            <input id="adu-confirm" name="confirm" required autoComplete="off" className="input mt-1.5 max-w-xs" />
          </div>
          {state?.error && (
            <p role="alert" className="text-sm text-ember-deep font-semibold">
              {state.error}
            </p>
          )}
          <button className="btn-primary !bg-ember-deep !shadow-none" disabled={pending}>
            {pending ? "Deleting…" : "Delete this user"}
          </button>
        </>
      )}
    </form>
  );
}
