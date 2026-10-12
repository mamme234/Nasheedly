import { secrets } from "base44:runtime";

// YouTube Data API v3 search — real discovery, no fabricated data.
// Returns video id, title, channel, thumbnail. Playback uses the official YouTube iframe embed.
export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const query = (body?.query || "").toString().trim();
    const pageToken = (body?.pageToken || "").toString().trim();
    const apiKey = secrets.get("YOUTUBE_API_KEY");

    if (!apiKey) {
      return Response.json(
        { error: "YouTube API key is not configured. Add YOUTUBE_API_KEY in the app's environment settings to enable discovery." },
        { status: 503 }
      );
    }

    const searchTerm = query || "nasheed";
    const params = new URLSearchParams({
      part: "snippet",
      type: "video",
      q: searchTerm,
      maxResults: "24",
      videoEmbeddable: "true",
      key: apiKey,
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
      signal: AbortSignal.timeout(12000),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.error?.message || `YouTube API responded with status ${res.status}`;
      return Response.json({ error: msg }, { status: res.status === 403 || res.status === 429 ? 429 : 502 });
    }

    const items = (data.items || [])
      .filter((it: any) => it?.id?.videoId && it?.snippet)
      .map((it: any) => ({
        videoId: it.id.videoId,
        title: it.snippet.title,
        channel: it.snippet.channelTitle,
        thumbnail: it.snippet.thumbnails?.medium?.url || it.snippet.thumbnails?.default?.url,
        publishedAt: it.snippet.publishedAt,
        description: (it.snippet.description || "").slice(0, 200),
      }));

    return Response.json({ items, nextPageToken: data.nextPageToken || null });
  } catch (error) {
    return Response.json({ error: error.message || "Search failed" }, { status: 500 });
  }
}