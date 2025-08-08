import React from "react";

/**
 * ProfileHeader
 * Props:
 *  - profile: { name, email, picture }
 *  - onLogout: () => void
 *  - collapsed: boolean
 *
 * Renders a compact profile control for the sidebar bottom area. When collapsed
 * only the avatar is shown; when expanded name/email and logout button appear.
 */
export default function ProfileHeader({ profile, onLogout, collapsed }) {
  const name = profile?.name ?? "Unknown";
  const email = profile?.email ?? "";
  const picture = profile?.picture ?? "/avatar-placeholder.png";

  if (collapsed) {
    return (
      <div className="flex items-center justify-center">
        <img
          src={picture}
          alt={name}
          title={`${name}\n${email}`}
          className="w-10 h-10 rounded-full ring-2 ring-cyan-100 shadow-sm"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <img
        src={picture}
        alt={name}
        className="w-12 h-12 rounded-full ring-2 ring-cyan-100 shadow-sm"
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-cyan-900 truncate">{name}</div>
        <div className="text-xs text-gray-500 truncate">{email}</div>
      </div>
      <button
        onClick={onLogout}
        className="ml-2 bg-red-50 text-red-600 px-3 py-1 rounded-md text-xs hover:bg-red-100"
      >
        Log out
      </button>
    </div>
  );
}