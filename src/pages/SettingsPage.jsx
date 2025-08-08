import React, { useState, useEffect } from "react";

/**
 * Simple settings page that persists slider preferences to localStorage.
 */
const SETTINGS_KEY = "chapgen_user_settings";

export default function SettingsPage() {
  const [creativity, setCreativity] = useState(2);
  const [threshold, setThreshold] = useState(1);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        setCreativity(s.creativity ?? 2);
        setThreshold(s.threshold ?? 1);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ creativity, threshold }));
    } catch {}
  }, [creativity, threshold]);

  const creativityLabels = ["GenZ", "Creative", "Neutral", "Formal", "Corporate"];
  const thresholdLabels = ["Detailed", "Default", "Abstract"];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-cyan-900 mb-4">Settings</h2>

      <div className="bg-white border rounded-lg p-6 space-y-6">
        <div>
          <label className="block text-gray-700 font-medium">Creativity</label>
          <input
            type="range"
            min="0"
            max="4"
            value={creativity}
            onChange={(e) => setCreativity(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-gray-600 mt-1">{creativityLabels[creativity]}</div>
        </div>

        <div>
          <label className="block text-gray-700 font-medium">Segmentation</label>
          <input
            type="range"
            min="0"
            max="2"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-gray-600 mt-1">{thresholdLabels[threshold]}</div>
        </div>
      </div>
    </div>
  );
}