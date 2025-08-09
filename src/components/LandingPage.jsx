import React from "react";
import { FaGoogle } from "react-icons/fa";

/**
 * Minimal landing page with login button injected by parent.
 */
export default function LandingPage({ login }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center bg-white/0 backdrop-blur-sm border border-gray-300 rounded-3xl shadow-xl flex items-center overflow-hidden">
        <div className="flex flex-col items-center space-y-8 p-12 cursor-default">
          <h1 className="text-6xl font-black text-cyan-900">ChapGen</h1>
          <p className="text-xl leading-normal">
            AI-powered YouTube chapter generation, built on a fully cloud-native,
            event-driven architecture.
          </p>
          <button
            onClick={login}
            className="bg-gradient-to-r from-cyan-900 to-cyan-800 hover:from-cyan-900 hover:to-cyan-800 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group cursor-pointer"
          >
            <span className="flex items-center justify-center">
              <FaGoogle className="text-xl inline-block mb-0.5 mr-4" />
              Sign in to Generate Chapters
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          </button>
        </div>
      </div>
    </div>
  );
}