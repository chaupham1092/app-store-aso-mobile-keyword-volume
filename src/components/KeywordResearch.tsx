"use client";

import { useState } from "react";
import { APP_STORE_COUNTRIES } from "@/lib/constants";

interface KeywordResearchProps {
  orgId: string;
}

interface YourKeyword {
  keyword: string;
  popularity: number | null;
  genre: string | null;
  genreRank: number | null;
  source: string;
}

interface Suggestion {
  text: string;
  popularity: number;
}

export function KeywordResearch({ orgId }: KeywordResearchProps) {
  const [appId, setAppId] = useState("");
  const [country, setCountry] = useState("US");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [yourKeywords, setYourKeywords] = useState<YourKeyword[]>([]);
  const [relatedSuggestions, setRelatedSuggestions] = useState<Suggestion[]>([]);
  const [autoSuggestions, setAutoSuggestions] = useState<Suggestion[]>([]);

  const handleResearch = async () => {
    if (!orgId) {
      setError("Enter your Organization ID above.");
      return;
    }
    if (!appId) {
      setError("Enter your App ID (the number from your App Store URL).");
      return;
    }

    setLoading(true);
    setError("");
    setYourKeywords([]);
    setRelatedSuggestions([]);
    setAutoSuggestions([]);

    try {
      const keywordList = keywords
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/keyword-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          appId,
          keywords: keywordList.length ? keywordList : undefined,
          country,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Request failed (${res.status})`);
        return;
      }

      setYourKeywords(data.yourKeywords || []);
      setRelatedSuggestions(data.relatedSuggestions || []);
      setAutoSuggestions(data.autoSuggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              App ID (from App Store URL)
            </label>
            <input
              type="text"
              value={appId}
              onChange={(e) => {
                // Strip "id" prefix and URL junk - extract just the numeric ID
                let val = e.target.value.trim();
                const match = val.match(/id(\d+)/);
                if (match) {
                  val = match[1];
                } else {
                  val = val.replace(/\D/g, "");
                }
                setAppId(val);
              }}
              placeholder="6744337544 or paste App Store URL"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Paste a URL or ID — only works for <span className="text-yellow-400">your own apps</span> linked to this Apple Ads account
            </p>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Country
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {APP_STORE_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Your Keywords (comma-separated, optional)
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="fitness tracker, calorie counter, workout planner, health"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave empty to see Apple&apos;s auto-suggestions, or enter keywords to check their popularity
            </p>
          </div>
        </div>

        <button
          onClick={handleResearch}
          disabled={loading}
          className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400 text-white text-sm font-medium rounded transition-colors"
        >
          {loading ? "Researching..." : "🔍 Research Keywords"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Section 1: Your Keywords Popularity */}
      {yourKeywords.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-base font-semibold text-white">
              📊 Your Keywords — Real Popularity
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              How popular each of your keywords actually is (0-100 scale, 100 = most searched)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Keyword</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Popularity</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Top Genre</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Genre Rank</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {yourKeywords.map((kw, i) => (
                  <tr key={i} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-white font-medium">{kw.keyword}</td>
                    <td className="px-4 py-3 text-right">
                      {kw.popularity != null ? (
                        <PopularityBar value={kw.popularity} />
                      ) : (
                        <span className="text-gray-500 text-xs">Below threshold</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs">
                      {kw.genre || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {kw.genreRank ? `#${kw.genreRank}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge source={kw.source} popularity={kw.popularity} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: Related Suggestions (from your seeds) */}
      {relatedSuggestions.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-base font-semibold text-white">
              💡 Related Keywords (seeded by your terms)
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Apple suggests these based on your keywords — sorted by popularity
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Keyword</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Popularity (0-100)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {relatedSuggestions
                  .sort((a, b) => b.popularity - a.popularity)
                  .map((s, i) => (
                    <tr key={i} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-white">{s.text}</td>
                      <td className="px-4 py-3 text-right">
                        <PopularityBar value={s.popularity} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: Auto Suggestions (Apple's picks for your app) */}
      {autoSuggestions.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-base font-semibold text-white">
              🤖 Apple&apos;s Auto-Suggestions for Your App
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              High-volume terms Apple thinks are broadly relevant — may not all be niche-relevant
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Keyword</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Popularity (0-100)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {autoSuggestions
                  .sort((a, b) => b.popularity - a.popularity)
                  .map((s, i) => (
                    <tr key={i} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-white">{s.text}</td>
                      <td className="px-4 py-3 text-right">
                        <PopularityBar value={s.popularity} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PopularityBar({ value }: { value: number }) {
  let barColor = "bg-gray-500";
  if (value >= 70) barColor = "bg-green-500";
  else if (value >= 50) barColor = "bg-green-400";
  else if (value >= 30) barColor = "bg-yellow-400";
  else if (value >= 15) barColor = "bg-orange-400";
  else barColor = "bg-red-400";

  return (
    <div className="flex items-center gap-2 justify-end">
      <span className="text-gray-200 font-mono text-xs">{value}</span>
      <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({
  source,
  popularity,
}: {
  source: string;
  popularity: number | null;
}) {
  if (source === "not_found" || popularity == null) {
    return (
      <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">
        Very niche / no data
      </span>
    );
  }
  if (popularity >= 50) {
    return (
      <span className="text-xs px-2 py-0.5 rounded bg-green-900/50 text-green-300">
        High volume
      </span>
    );
  }
  if (popularity >= 20) {
    return (
      <span className="text-xs px-2 py-0.5 rounded bg-yellow-900/50 text-yellow-300">
        Medium
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded bg-orange-900/50 text-orange-300">
      Low volume
    </span>
  );
}
