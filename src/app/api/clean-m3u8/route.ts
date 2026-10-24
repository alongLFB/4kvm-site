import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RawSegmentItem {
  url: string;
  duration: number;
  discIndex: number;
  extinfLine: string;
  extraTags: string[];
}

/**
 * Intelligent M3U8 Ad-Stripping Engine
 * 
 * Analyzes #EXT-X-DISCONTINUITY boundaries in syndicated streaming playlists,
 * detects injected ad clips (such as casino/gambling 10103kb ads),
 * strips them completely, resolves relative TS paths to absolute URLs,
 * and outputs a 100% clean feature film playlist.
 */
function cleanM3U8Playlist(playlistText: string, basePlaylistUrl: string): { cleanText: string; adCount: number } {
  const lines = playlistText.split(/\r?\n/);
  const rawSegments: RawSegmentItem[] = [];
  let currentDiscIndex = 0;
  let pendingTags: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line === "#EXT-X-DISCONTINUITY") {
      currentDiscIndex++;
    } else if (line.startsWith("#EXT-X-KEY") || line.startsWith("#EXT-X-MAP")) {
      pendingTags.push(line);
    } else if (line.startsWith("#EXTINF:")) {
      const durationMatch = line.match(/#EXTINF:\s*([\d.]+)/);
      const dur = durationMatch ? parseFloat(durationMatch[1]) : 0;
      const segTags = [...pendingTags];
      pendingTags = [];

      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (nextLine && !nextLine.startsWith("#")) {
          let resolvedSegUrl = nextLine;
          try {
            resolvedSegUrl = new URL(nextLine, basePlaylistUrl).href;
          } catch {}

          rawSegments.push({
            url: resolvedSegUrl,
            duration: dur,
            discIndex: currentDiscIndex,
            extinfLine: line,
            extraTags: segTags,
          });
          i = j;
          break;
        } else if (nextLine.startsWith("#") && !nextLine.startsWith("#EXT-X-DISCONTINUITY")) {
          segTags.push(nextLine);
        }
      }
    }
  }

  // If no segments found or stream has no discontinuities, resolve relative paths and return
  if (rawSegments.length === 0 || currentDiscIndex === 0) {
    const outLines: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("#") && trimmed) {
        try {
          outLines.push(new URL(trimmed, basePlaylistUrl).href);
        } catch {
          outLines.push(trimmed);
        }
      } else {
        outLines.push(line);
      }
    }
    return { cleanText: outLines.join("\n"), adCount: 0 };
  }

  // Group segments by discontinuity boundary
  const groups = new Map<number, RawSegmentItem[]>();
  for (const seg of rawSegments) {
    if (!groups.has(seg.discIndex)) {
      groups.set(seg.discIndex, []);
    }
    groups.get(seg.discIndex)!.push(seg);
  }

  // Find the primary feature film group (largest number of segments)
  let maxGroupCount = 0;
  let mainSampleUrl = "";
  for (const [, list] of groups.entries()) {
    if (list.length > maxGroupCount) {
      maxGroupCount = list.length;
      mainSampleUrl = list[0].url;
    }
  }

  let mainDir = "";
  try {
    const parsedMain = new URL(mainSampleUrl);
    mainDir = parsedMain.pathname.substring(0, parsedMain.pathname.lastIndexOf("/"));
  } catch {}

  // Identify advertisement groups
  const adGroupIndices = new Set<number>();
  let totalAdsStripped = 0;

  for (const [disc, list] of groups.entries()) {
    const dur = list.reduce((a, s) => a + s.duration, 0);
    // Ad criteria:
    // 1. Short discontinuous section (<= 15 segments and total duration <= 60 seconds)
    // 2. Contains ad keywords or has a directory mismatch against the main film
    if (list.length <= 15 && dur <= 60) {
      for (const s of list) {
        let hasAdKeywords = false;
        let isDirMismatch = false;
        try {
          const segUrl = new URL(s.url);
          const segDir = segUrl.pathname.substring(0, segUrl.pathname.lastIndexOf("/"));
          hasAdKeywords = /10103kb|advert|adjump|gdt|ad[\/_]|doubleclick|piao/i.test(s.url);
          isDirMismatch = !!mainDir && segDir !== mainDir;
        } catch {}

        if (hasAdKeywords || isDirMismatch) {
          adGroupIndices.add(disc);
          totalAdsStripped += list.length;
          break;
        }
      }
    }
  }

  // Rebuild the clean M3U8
  let maxTargetDur = 6;
  const outLines: string[] = [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    "#EXT-X-PLAYLIST-TYPE:VOD",
    "#EXT-X-MEDIA-SEQUENCE:0",
  ];

  let lastActiveGroup = -1;
  for (const [disc, list] of groups.entries()) {
    if (adGroupIndices.has(disc)) continue;

    if (lastActiveGroup !== -1 && lastActiveGroup !== disc) {
      outLines.push("#EXT-X-DISCONTINUITY");
    }
    lastActiveGroup = disc;

    for (const seg of list) {
      if (seg.duration > maxTargetDur) {
        maxTargetDur = Math.ceil(seg.duration);
      }
      for (const extra of seg.extraTags) {
        outLines.push(extra);
      }
      outLines.push(seg.extinfLine);
      outLines.push(seg.url);
    }
  }

  outLines.splice(2, 0, `#EXT-X-TARGETDURATION:${maxTargetDur}`);
  outLines.push("#EXT-X-ENDLIST");

  return {
    cleanText: outLines.join("\n"),
    adCount: totalAdsStripped,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Invalid protocol" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Referer: targetUrl,
      },
    });

    if (!upstreamRes.ok) {
      throw new Error(`Upstream returned HTTP ${upstreamRes.status}`);
    }

    let playlistText = await upstreamRes.text();
    let effectivePlaylistUrl = targetUrl;

    // Check if it's a multivariant master playlist
    if (playlistText.includes("#EXT-X-STREAM-INF")) {
      const lines = playlistText.split(/\r?\n/);
      let subUri = "";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("#EXT-X-STREAM-INF") && i + 1 < lines.length) {
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j].trim();
            if (nextLine && !nextLine.startsWith("#")) {
              subUri = nextLine;
              break;
            }
          }
          if (subUri) break;
        }
      }

      if (subUri) {
        effectivePlaylistUrl = new URL(subUri, targetUrl).href;
        const subRes = await fetch(effectivePlaylistUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Referer: targetUrl,
          },
        });
        if (subRes.ok) {
          playlistText = await subRes.text();
        }
      }
    }

    // Filter out injected advertisements
    const { cleanText, adCount } = cleanM3U8Playlist(playlistText, effectivePlaylistUrl);

    const headers = new Headers();
    headers.set("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "*");
    headers.set("Cache-Control", "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400");
    headers.set("X-Ads-Filtered", String(adCount));

    return new Response(cleanText, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.warn(`[CleanM3U8] Failed to process ${targetUrl}:`, err.message);
    // Graceful fallback: redirect directly to original URL
    return NextResponse.redirect(targetUrl, 302);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
