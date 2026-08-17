import { NextRequest, NextResponse } from "next/server";
import { appleAdsRequest } from "@/lib/apple-ads-auth";

export async function POST(request: NextRequest) {
  try {
    const { orgId, appId, keywords, country = "US" } = await request.json();

    if (!orgId || !appId) {
      return NextResponse.json(
        { error: "orgId and appId are required" },
        { status: 400 }
      );
    }

    // 1. Get popularity for each specific keyword via search term popularity
    let popularityData: Record<
      string,
      { popularity: number; genre: string; rank: number }
    > = {};

    if (keywords?.length) {
      const popularityBody = {
        filters: [
          { field: "countryOrRegion", operator: "EQUALS", value: country },
          { field: "searchTerm", operator: "IN", value: keywords },
        ],
        timeRange: {
          start: getLastMonthStart(),
          end: getCurrentMonthStart(),
          granularity: "MONTHLY",
        },
        pagination: { offset: 0, pageSize: 1000 },
      };

      try {
        const popResult = await appleAdsRequest(
          "/v1/insights/apps/search-term-popularity/query",
          popularityBody,
          orgId
        );
        if (popResult.result?.rows) {
          for (const row of popResult.result.rows) {
            const existing = popularityData[row.searchTerm];
            if (
              !existing ||
              row.searchPopularity1to100 > existing.popularity
            ) {
              popularityData[row.searchTerm] = {
                popularity: row.searchPopularity1to100,
                genre: row.genre,
                rank: row.rankInGenre,
              };
            }
          }
        }
      } catch {
        // Popularity endpoint may fail for very niche terms - that's ok
      }
    }

    // 2. Get keyword suggestions seeded by the user's keywords (only if keywords provided)
    let suggestions: Array<{ text: string; popularity: number }> = [];

    if (keywords?.length) {
      const suggestionsBody = {
        filters: [
          {
            field: "promotedObjectId",
            operator: "EQUALS",
            value: [appId],
          },
          {
            field: "promotedObjectType",
            operator: "EQUALS",
            value: ["APPSTORE_APP"],
          },
          {
            field: "terms",
            operator: "IN",
            value: keywords,
          },
          {
            field: "countriesOrRegions",
            operator: "IN",
            value: [country],
          },
        ],
      };

      try {
        const sugResult = await appleAdsRequest(
          "/v1/suggestions/keywords/query",
          suggestionsBody,
          orgId
        );
        if (Array.isArray(sugResult.result)) {
          suggestions = sugResult.result;
        }
      } catch {
        // Suggestions may fail - that's ok
      }
    }

    // 3. Also get suggestions without seeds (Apple's auto picks)
    const autoBody = {
      filters: [
        {
          field: "promotedObjectId",
          operator: "EQUALS",
          value: [appId],
        },
        {
          field: "promotedObjectType",
          operator: "EQUALS",
          value: ["APPSTORE_APP"],
        },
        {
          field: "countriesOrRegions",
          operator: "IN",
          value: [country],
        },
      ],
    };

    let autoSuggestions: Array<{ text: string; popularity: number }> = [];

    try {
      const autoResult = await appleAdsRequest(
        "/v1/suggestions/keywords/query",
        autoBody,
        orgId
      );
      if (Array.isArray(autoResult.result)) {
        autoSuggestions = autoResult.result;
      }
    } catch {
      // Auto suggestions may fail - that's ok
    }

    // 4. Build the response
    // Your keywords with their real popularity (only if keywords provided)
    const yourKeywords = keywords?.length
      ? keywords.map((kw: string) => {
          const data = popularityData[kw.toLowerCase()];
          const inSuggestions = suggestions.find(
            (s) => s.text.toLowerCase() === kw.toLowerCase()
          );
          return {
            keyword: kw,
            popularity:
              data?.popularity ?? inSuggestions?.popularity ?? null,
            genre: data?.genre ?? null,
            genreRank: data?.rank ?? null,
            source: data
              ? "insights"
              : inSuggestions
                ? "suggestions"
                : "not_found",
          };
        })
      : [];

    return NextResponse.json({
      yourKeywords,
      relatedSuggestions: suggestions,
      autoSuggestions,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getLastMonthStart(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function getCurrentMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}
