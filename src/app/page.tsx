"use client";

import { useState } from "react";
import { KeywordResearch } from "@/components/KeywordResearch";

export default function Home() {
  const [orgId, setOrgId] = useState("");

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            🍎 App Store ASO Keyword Volume
          </h1>
          <p className="mt-2 text-gray-400">
            Real mobile app keyword search volume from Apple&apos;s official API.
            Enter your app ID + keywords to see their actual popularity and discover related terms.
          </p>
        </div>

        {/* Settings */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-8">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[250px]">
              <label htmlFor="orgId" className="block text-xs text-gray-400 mb-1">
                Organization ID
              </label>
              <input
                id="orgId"
                type="text"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="e.g. 12345678"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500">
              From Apple Ads → Account Settings → Overview
            </p>
          </div>
        </div>

        <KeywordResearch orgId={orgId} />
      </div>
    </main>
  );
}
