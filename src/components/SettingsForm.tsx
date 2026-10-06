"use client";

import { changePasswordAction, deleteAccountAction, updateProfileAction } from "@/app/actions";
import { useServerForm } from "@/lib/useServerForm";

type CurrentUser = { name: string; email: string; age: number | null; gender: string | null };

export default function SettingsForm({ user }: { user: CurrentUser }) {
  const { state: profileState, pending: profilePending, onSubmit: profileSubmit } = useServerForm(updateProfileAction);
  const { state: passwordState, pending: passwordPending, onSubmit: passwordSubmit } = useServerForm(changePasswordAction, {
    resetOnSuccess: true,
  });
  const { state: deleteState, pending: deletePending, onSubmit: deleteSubmit } = useServerForm(deleteAccountAction);

  return (
    <div className="max-w-xl mx-auto px-6 py-14 space-y-10">
      <div>
        <p className="eyebrow text-ember">Account</p>
        <h1 className="font-display text-3xl font-medium text-ink mt-1">Settings</h1>
      </div>

      <section className="card p-7 space-y-4">
        <h2 className="font-display italic text-xl text-ink">Profile</h2>
        <form onSubmit={profileSubmit} className="space-y-4">
          <div>
            <label className="eyebrow text-slate" htmlFor="s-email">
              Email
            </label>
            <input id="s-email" value={user.email} disabled className="input mt-1.5 opacity-60 cursor-not-allowed" />
          </div>
          <div>
            <label className="eyebrow text-slate" htmlFor="s-name">
              Display name
            </label>
            <input id="s-name" name="name" defaultValue={user.name} required maxLength={60} className="input mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="eyebrow text-slate" htmlFor="s-age">
                Age
              </label>
              <input id="s-age" type="number" name="age" defaultValue={user.age ?? ""} min={13} max={120} className="input mt-1.5" />
            </div>
            <div>
              <label className="eyebrow text-slate" htmlFor="s-gender">
                Gender
              </label>
              <select id="s-gender" name="gender" defaultValue={user.gender ?? ""} className="input mt-1.5">
                <option value="">Prefer not to say</option>
                <option value="woman">Woman</option>
                <option value="man">Man</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-slate">
            Age and gender are only ever used for a host&apos;s filtering preferences on a listing — never a
            requirement to contact anyone, and never shown on your public profile.
          </p>
          {profileState?.error && <p role="alert" className="text-sm text-ember-deep font-semibold">{profileState.error}</p>}
          {profileState?.success && <p className="text-sm text-glacier-deep font-semibold">{profileState.success}</p>}
          <button className="btn-primary" disabled={profilePending}>
            {profilePending ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      <section className="card p-7 space-y-4">
        <h2 className="font-display italic text-xl text-ink">Change password</h2>
        <form onSubmit={passwordSubmit} className="space-y-4">
          <div>
            <label className="eyebrow text-slate" htmlFor="s-cur">
              Current password
            </label>
            <input id="s-cur" type="password" name="currentPassword" required autoComplete="current-password" className="input mt-1.5" />
          </div>
          <div>
            <label className="eyebrow text-slate" htmlFor="s-new">
              New password
            </label>
            <input id="s-new" type="password" name="newPassword" required minLength={8} maxLength={72} autoComplete="new-password" className="input mt-1.5" />
          </div>
          <div>
            <label className="eyebrow text-slate" htmlFor="s-conf">
              Confirm new password
            </label>
            <input id="s-conf" type="password" name="confirmPassword" required minLength={8} maxLength={72} autoComplete="new-password" className="input mt-1.5" />
          </div>
          {passwordState?.error && <p role="alert" className="text-sm text-ember-deep font-semibold">{passwordState.error}</p>}
          {passwordState?.success && <p className="text-sm text-glacier-deep font-semibold">{passwordState.success}</p>}
          <button className="btn-primary" disabled={passwordPending}>
            {passwordPending ? "Changing…" : "Change password"}
          </button>
        </form>
      </section>

      <section className="card p-7 space-y-4">
        <h2 className="font-display italic text-xl text-ink">Your data</h2>
        <p className="text-sm text-slate">
          Download everything we hold about you — profile, listings, messages, ratings and saved items — as a JSON file.
        </p>
        <a href="/settings/export" className="btn-secondary inline-block">
          Download my data
        </a>
      </section>

      <section className="card p-7 space-y-4 border-ember/30">
        <h2 className="font-display italic text-xl text-ember-deep">Delete account</h2>
        <p className="text-sm text-slate">
          Permanently deletes your profile, your listings and photos, your conversations and ratings, and your saved
          items. This can&apos;t be undone. Photos you uploaded may remain in storage for a short time before being purged.
        </p>
        <form onSubmit={deleteSubmit} className="space-y-4">
          <div>
            <label className="eyebrow text-slate" htmlFor="d-pass">
              Your password
            </label>
            <input id="d-pass" type="password" name="password" required autoComplete="current-password" className="input mt-1.5" />
          </div>
          <div>
            <label className="eyebrow text-slate" htmlFor="d-confirm">
              Type DELETE to confirm
            </label>
            <input id="d-confirm" name="confirm" required autoComplete="off" className="input mt-1.5" />
          </div>
          {deleteState?.error && <p role="alert" className="text-sm text-ember-deep font-semibold">{deleteState.error}</p>}
          <button className="btn-primary !bg-ember-deep !shadow-none" disabled={deletePending}>
            {deletePending ? "Deleting…" : "Delete my account"}
          </button>
        </form>
      </section>
    </div>
  );
}
