import React from "react";
import { NavLink } from "react-router-dom";
import {
  Target,
  Folder,
  Settings,
  ChevronLeft,
  ChevronRight,
  CloudLightning,
  Clock,
  Mail,
} from "lucide-react";
import ProfileHeader from "./ProfileHeader";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Collapsible Sidebar
 * Props:
 * - collapsed?: boolean
 * - onToggle?: () => void
 * - profile?: { name, email, picture }
 * - onLogout?: () => void
 */
export default function Sidebar({ collapsed, onToggle, profile, onLogout }) {
  const isControlled = typeof collapsed === "boolean";
  const [internalCollapsed, setInternalCollapsed] = React.useState(false);
  const collapsedState = isControlled ? collapsed : internalCollapsed;

  const toggle = () => {
    if (isControlled) {
      onToggle && onToggle();
    } else {
      setInternalCollapsed((s) => !s);
    }
  };

  // ... inside the Sidebar component

  const menu = React.useMemo(
    () => [
      { to: "/latest", label: "Automated", icon: <CloudLightning size={18} /> },
      { to: "/manual", label: "Manual", icon: <Target size={18} /> },
      {
        to: "/processed",
        label: "Archive",
        icon: <Folder size={18} />,
      },
      { to: "/settings", label: "Settings", icon: <Settings size={18} /> },
      { to: "/contact", label: "Contact", icon: <Mail size={18} /> },
    ],
    []
  );

  return (
    <aside
      className={`h-screen bg-white border-r border-gray-200 flex flex-col justify-between
        transition-all duration-200 ${collapsedState ? "w-20" : "w-64"}`}
    >
      <div className="px-3 pt-4">
        <div
          className={`flex items-center gap-3 px-2 mb-6 ${
            collapsedState ? "justify-center" : ""
          }`}
        >
          <div
            className={`text-cyan-900 font-black text-xl ${
              collapsedState ? "sr-only" : ""
            }`}
          >
            {collapsedState ? "CG" : "ChapGen"}
          </div>

          <button
            aria-label={collapsedState ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsedState}
            onClick={toggle}
            className={`${
              collapsedState ? "mx-auto" : "ml-auto"
            } inline-flex items-center justify-center rounded-md p-1
              bg-cyan-50 text-cyan-700 hover:bg-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-300`}
          >
            {collapsedState ? (
              <ChevronRight size={16} />
            ) : (
              <ChevronLeft size={16} />
            )}
          </button>
        </div>

        <nav className="space-y-4">
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-4 rounded-md transition-colors
                 ${
                   isActive
                     ? "bg-cyan-100 text-cyan-900 font-semibold"
                     : "text-cyan-800 hover:bg-cyan-50"
                 }`
              }
            >
              <div
                className={`flex-shrink-0 ${collapsedState ? "mx-auto" : ""}`}
              >
                {item.icon}
              </div>
              <span
                className={`text-sm transition-opacity duration-200 ${
                  collapsedState
                    ? "opacity-0 pointer-events-none text-[0rem] hidden"
                    : "opacity-100"
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`flex items-center gap-3 px-3 py-4 rounded-md opacity-50 cursor-not-allowed`}
              >
                <div
                  className={`flex-shrink-0 ${collapsedState ? "mx-auto" : ""}`}
                >
                  <Clock size={18} />
                </div>
                <span
                  className={`text-sm transition-opacity duration-200 ${
                    collapsedState
                      ? "opacity-0 pointer-events-none text-[0rem] hidden"
                      : "opacity-100"
                  }`}
                >
                  Schedule Jobs
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Coming Soon</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        </div>
      </div>

      {/* Bottom profile header */}
      <div
        className={`p-3 border-t border-gray-100 ${
          profile ? "block" : "hidden"
        }`}
      >
        <ProfileHeader
          profile={profile}
          onLogout={onLogout}
          collapsed={collapsedState}
        />
      </div>
    </aside>
  );
}
