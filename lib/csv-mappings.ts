export type RowMapping = {
  handler: 'rows';
  table: string;
  conflictColumn: string;
  fieldMap: Record<string, string>; // csvCol → dbCol
};

export type PivotMapping = {
  handler: 'pivot';
  pivotKeyCol: string; // the CSV column that holds the key name (e.g. "metric" or "key")
  pivotValueCol: string; // the CSV column that holds the value (e.g. "value")
  targets: {
    table: string;
    conflictColumn: string;
    keyMap: Record<string, string>; // pivotKeyValue → dbCol
  }[];
};

export type CsvTypeConfig = {
  key: string;
  label: string;
  signature: string[]; // all of these headers must be present
  mapping: RowMapping | PivotMapping;
};

export const CSV_TYPES: CsvTypeConfig[] = [
  {
    key: 'tiktok_videos',
    label: 'TikTok Videos',
    signature: ['video_id', 'engagement_rate'],
    mapping: {
      handler: 'rows',
      table: 'tiktok_videos',
      conflictColumn: 'video_id',
      fieldMap: {
        video_id: 'video_id',
        create_date: 'create_date',
        duration_s: 'duration_s',
        title: 'title',
        view_count: 'view_count',
        like_count: 'like_count',
        comment_count: 'comment_count',
        share_count: 'share_count',
        engagement_rate: 'engagement_rate',
        virality_score: 'virality_score',
        share_url: 'share_url',
      },
    },
  },
  {
    key: 'tiktok_snapshot',
    label: 'TikTok Snapshot',
    signature: ['metric', 'value'],
    mapping: {
      handler: 'pivot',
      pivotKeyCol: 'metric',
      pivotValueCol: 'value',
      targets: [
        {
          table: 'tiktok_snapshots',
          conflictColumn: 'synced_date',
          keyMap: {
            follower_count: 'follower_count',
            following_count: 'following_count',
            likes_count: 'likes_count',
            video_count: 'video_count',
          },
        },
      ],
    },
  },
  {
    key: 'yt_daily',
    label: 'YouTube Daily',
    signature: ['day', 'estimatedMinutesWatched'],
    mapping: {
      handler: 'rows',
      table: 'yt_daily',
      conflictColumn: 'date',
      fieldMap: {
        day: 'date',
        views: 'views',
        estimatedMinutesWatched: 'estimated_minutes_watched',
        averageViewDuration: 'avg_view_duration',
        subscribersGained: 'subscribers_gained',
      },
    },
  },
  {
    key: 'yt_videos',
    label: 'YouTube Top Videos',
    signature: ['video', 'averageViewPercentage'],
    mapping: {
      handler: 'rows',
      table: 'yt_videos',
      conflictColumn: 'video_id',
      fieldMap: {
        video: 'video_id',
        views: 'views',
        estimatedMinutesWatched: 'watch_minutes',
        subscribersGained: 'subscribers_gained',
      },
    },
  },
  {
    key: 'ig_media',
    label: 'Instagram Media',
    signature: ['media_id', 'permalink'],
    mapping: {
      handler: 'rows',
      table: 'ig_media',
      conflictColumn: 'media_id',
      fieldMap: {
        media_id: 'media_id',
        media_type: 'media_type',
        timestamp: 'post_date',
        caption_preview: 'caption',
        like_count: 'like_count',
        comments_count: 'comments_count',
        permalink: 'permalink',
      },
    },
  },
  {
    key: 'ig_daily',
    label: 'Instagram Daily',
    // must come before meta_snapshot since both have 'date' — but meta_snapshot uses 'key' not 'date'
    signature: ['date', 'reach', 'profile_views'],
    mapping: {
      handler: 'rows',
      table: 'ig_daily',
      conflictColumn: 'date',
      fieldMap: {
        date: 'date',
        reach: 'reach',
      },
    },
  },
  {
    key: 'meta_snapshot',
    label: 'Meta Snapshot',
    signature: ['key', 'value'],
    mapping: {
      handler: 'pivot',
      pivotKeyCol: 'key',
      pivotValueCol: 'value',
      targets: [
        {
          table: 'ig_snapshots',
          conflictColumn: 'synced_date',
          keyMap: {
            ig_followers: 'follower_count',
            ig_username: 'username',
            ig_reach_30d: 'reach_30d',
            ig_profile_views_30d: 'profile_views_30d',
          },
        },
        {
          table: 'fb_snapshots',
          conflictColumn: 'synced_date',
          keyMap: {
            fb_fans: 'fan_count',
            fb_post_engagements_30d: 'post_engagements_30d',
          },
        },
      ],
    },
  },
  {
    key: 'fb_posts',
    label: 'Facebook Posts',
    signature: ['post_id', 'reactions'],
    mapping: {
      handler: 'rows',
      table: 'fb_posts',
      conflictColumn: 'post_id',
      fieldMap: {
        post_id: 'post_id',
        created_time: 'created_time',
        message_preview: 'message',
        reactions: 'reactions',
        comments: 'comments',
        shares: 'shares',
      },
    },
  },
];

