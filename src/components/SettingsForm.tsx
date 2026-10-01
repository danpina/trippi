"use client";

import { useFormState } from "react-dom";
import { updateProfileAction, changePasswordAction } from "@/app/actions";

type CurrentUser = { name: string; email: string; age: number | null; gender: string | null };

export default function SettingsForm({ user }: { user: CurrentUser }) {
  const [profileState, profileAction] = useFormState(updateProfileAction, undefined);
  const [passwordState, passwordAction] = useFormState(changePasswordAction, undefined);

  return (
    <div className="max-w-xl mx-auto px-6 py-14 space-y-10">
      <div>
        <p className="eyebrow text-ember">Account</p>
        <h1 className="font-display text-3xl font-medium text-ink mt-1">Settings</h1>
      </div>

      <section className="card p-7 space-y-4">
        <h2 className="font-display italic text-xl text-ink">Profile</h2>
        <form action={profileAction} className="space-y-4">
          <div>
            <label className="eyebrow text-slate">Email</label>
            <input value={user.email} disabled className="input mt-1.5 opacity-60 cursor-not-allowed" />
          </div>
          <div>
            <label className="eyebrow text-slate">Display name</label>
            <input name="name" defaultValue={user.name} required className="input mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="eyebrow text-slate">Age</label>
              <input type="number" name="age" defaultValue={user.age ?? ""} min={13} max={120} className="input mt-1.5" />
            </div>
            <div>
              <label className="eyebrow text-slate">Gender</label>
              <select name="gender" defaultValue={user.gender ?? ""} className="input mt-1.5">
                <option value="">Prefer not to say</option>
                <option value="woman">Woman</option>
                <option value="man">Man</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-slate">
            Age and gender are only ever used for a host&apos;s filtering preferences on a listing — never a
            requirement to contact anyone.
          </p>
          {profileState?.error && <p className="text-sm text-ember-deep font-semibold">{profileState.error}</p>}
          {profileState?.success && <p className="text-sm text-glacier-deep font-semibold">{profileState.success}</p>}
          <button className="btn-primary">Save profile</button>
        </form>
      </section>

      <section className="card p-7 space-y-4">
        <h2 className="font-display italic text-xl text-ink">Change password</h2>
        <form action={passwordAction} className="space-y-4">
          <div>
            <label className="eyebrow text-slate">Current password</label>
            <input type="password" name="currentPassword" required className="input mt-1.5" />
          </div>
          <div>
            <label className="eyebrow text-slate">New password</label>
            <input type="password" name="newPassword" required minLength={6} className="input mt-1.5" />
          </div>
          <div>
            <label className="eyebrow text-slate">Confirm new password</label>
            <input type="password" name="confirmPassword" required minLength={6} className="input mt-1.5" />
          </div>
          {passwordState?.error && <p className="text-sm text-ember-deep font-semibold">{passwordState.error}</p>}
          {passwordState?.success && <p className="text-sm text-glacier-deep font-semibold">{passwordState.success}</p>}
          <button className="btn-primary">Change password</button>
        </form>
      </section>
    </div>
  );
}
