// Pure: platform API responses -> rows for the dashboard tables. Ported from the n8n workflows.
// No imports, so `node --test` can load it directly.

export type Write = { table: string; key: string[]; rows: Record<string, unknown>[] };
type Obj = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0) || 0;
const day = (v: unknown) => (typeof v === "string" ? v.slice(0, 10) : null);
const text = (v: unknown, max = 500) => String(v ?? "").replace(/\r?\n/g, " ").trim().slice(0, max);

/** YouTube Analytics reports come as columnHeaders + rows arrays. */
export function report(resp: { columnHeaders?: { name: string }[]; rows?: unknown[][] } | undefined): Obj[] {
  const h = (resp?.columnHeaders ?? []).map((c) => c.name);
  return (resp?.rows ?? []).map((r) => Object.fromEntries(h.map((name, i) => [name, r[i]])));
}

export function youtubeWrites(
  d: { channel: Obj; daily: Obj; top: Obj; titles: Obj; traffic: Obj; geo: Obj },
  today: string
): Write[] {
  const stats = ((d.channel.items as Obj[] | undefined)?.[0]?.statistics ?? {}) as Obj;
  const daily = report(d.daily as never);
  const titles = new Map(((d.titles.items as Obj[]) ?? []).map((i) => [i.id, ((i.snippet as Obj)?.title as string) ?? "(no title)"]));
  const traffic = report(d.traffic as never).sort((a, b) => num(b.views) - num(a.views));
  const trafficTotal = traffic.reduce((s, r) => s + num(r.views), 0);
  const sum = (k: string) => daily.reduce((s, r) => s + num(r[k]), 0);
  return [
    {
      table: "yt_snapshots",
      key: ["synced_date"],
      rows: [{
        synced_date: today,
        subscriber_count: num(stats.subscriberCount),
        views_365d: sum("views"),
        watch_minutes_365d: sum("estimatedMinutesWatched"),
        subscribers_gained_365d: sum("subscribersGained"),
      }],
    },
    {
      table: "yt_daily",
      key: ["date"],
      rows: daily.filter((r) => r.day).map((r) => ({
        date: r.day,
        views: num(r.views),
        estimated_minutes_watched: num(r.estimatedMinutesWatched),
        avg_view_duration: Math.round(num(r.averageViewDuration)),
        subscribers_gained: num(r.subscribersGained),
      })),
    },
    {
      table: "yt_videos",
      key: ["video_id"],
      rows: report(d.top as never).sort((a, b) => num(b.views) - num(a.views)).slice(0, 20).map((r) => ({
        video_id: r.video,
        title: text(titles.get(r.video) ?? "(no title)"),
        views: num(r.views),
        watch_minutes: num(r.estimatedMinutesWatched),
        subscribers_gained: num(r.subscribersGained),
        synced_at: today,
      })),
    },
    {
      table: "yt_traffic_sources",
      key: ["synced_date", "source"],
      rows: traffic.map((r) => ({
        synced_date: today,
        source: r.insightTrafficSourceType,
        views: num(r.views),
        watch_minutes: num(r.estimatedMinutesWatched),
        share_pct: trafficTotal ? Math.round((num(r.views) / trafficTotal) * 10000) / 100 : 0,
      })),
    },
    {
      table: "yt_geography",
      key: ["synced_date", "country"],
      rows: report(d.geo as never).sort((a, b) => num(b.views) - num(a.views)).slice(0, 20).map((r) => ({
        synced_date: today,
        country: r.country,
        views: num(r.views),
        watch_minutes: num(r.estimatedMinutesWatched),
      })),
    },
  ];
}

const insightValues = (resp: Obj | undefined, metric: string) =>
  (((resp?.data as Obj[]) ?? []).find((m) => m.name === metric)?.values as Obj[] | undefined ?? [])
    .map((v) => ({ date: day(v.end_time), value: num(v.value) }))
    .filter((v) => v.date);

export function metaWrites(
  d: { page: Obj; insights?: Obj; posts: Obj; ig?: Obj; igReach?: Obj; igMedia?: Obj },
  today: string,
  start: string
): Write[] {
  const fbDaily = insightValues(d.insights, "page_post_engagements");
  const writes: Write[] = [
    {
      table: "fb_snapshots",
      key: ["synced_date"],
      rows: [{
        synced_date: today,
        fan_count: num(d.page.fan_count ?? d.page.followers_count),
        post_engagements_30d: fbDaily.reduce((s, r) => s + r.value, 0),
      }],
    },
    { table: "fb_daily", key: ["date"], rows: fbDaily.map((r) => ({ date: r.date, post_engagements: r.value })) },
    {
      table: "fb_posts",
      key: ["post_id"],
      rows: ((d.posts.data as Obj[]) ?? []).map((p) => ({
        post_id: p.id,
        created_time: day(p.created_time),
        reactions: num(((p.reactions as Obj)?.summary as Obj)?.total_count),
        comments: num(((p.comments as Obj)?.summary as Obj)?.total_count),
        shares: num((p.shares as Obj)?.count),
        message: text(p.message),
        synced_at: today,
      })),
    },
  ];
  if (!d.ig) return writes;
  const reach = insightValues(d.igReach, "reach");
  writes.push(
    {
      table: "ig_snapshots",
      key: ["synced_date"],
      rows: [{
        synced_date: today,
        follower_count: num(d.ig.followers_count),
        username: d.ig.username ?? null,
        reach_30d: reach.reduce((s, r) => s + r.value, 0),
        profile_views_30d: 0,
      }],
    },
    { table: "ig_daily", key: ["date"], rows: reach.map((r) => ({ date: r.date, reach: r.value })) },
    {
      table: "ig_media",
      key: ["media_id"],
      rows: ((d.igMedia?.data as Obj[]) ?? [])
        .map((m) => ({
          media_id: m.id,
          media_type: m.media_type ?? null,
          post_date: day(m.timestamp),
          like_count: num(m.like_count),
          comments_count: num(m.comments_count),
          caption: text(m.caption),
          permalink: m.permalink ?? null,
          synced_at: today,
        }))
        .filter((m) => m.post_date && m.post_date >= start && m.post_date <= today),
    }
  );
  return writes;
}

export function tiktokWrites(d: { user: Obj; videos: Obj[] }, today: string, startTs: number): Write[] {
  const seen = new Set<unknown>();
  const videos = d.videos.filter((v) => num(v.create_time) >= startTs && !seen.has(v.id) && seen.add(v.id));
  return [
    {
      table: "tiktok_snapshots",
      key: ["synced_date"],
      rows: [{
        synced_date: today,
        follower_count: num(d.user.follower_count),
        following_count: num(d.user.following_count),
        likes_count: num(d.user.likes_count),
        video_count: num(d.user.video_count),
      }],
    },
    {
      table: "tiktok_videos",
      key: ["video_id"],
      rows: videos.map((v) => {
        const views = num(v.view_count), likes = num(v.like_count), comments = num(v.comment_count), shares = num(v.share_count);
        return {
          video_id: v.id,
          create_date: new Date(num(v.create_time) * 1000).toISOString().slice(0, 10),
          title: text(v.title),
          duration_s: num(v.duration),
          view_count: views,
          like_count: likes,
          comment_count: comments,
          share_count: shares,
          engagement_rate: views ? Math.round(((likes + comments + shares) / views) * 10000) / 100 : 0,
          virality_score: views ? Math.round((shares / views) * 1_000_000) / 10000 : 0,
          share_url: v.share_url ?? null,
          synced_at: today,
        };
      }),
    },
  ];
}
