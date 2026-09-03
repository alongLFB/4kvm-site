export interface Episode {
  name: string;
  url: string;
}

export interface PlaySource {
  sourceName: string;
  episodes: Episode[];
}

export interface VodItem {
  id: string;
  name: string;
  type_id: number;
  type_name: "电影" | "电视剧" | "动漫" | "综艺" | "体育" | string;
  sub_type?: string;
  pic: string;
  banner?: string;
  lang: string;
  area: string;
  year: string;
  remarks: string;
  actor: string;
  director: string;
  content: string;
  rating: number;
  hits: number;
  tags: string[];
  sources: PlaySource[];
}

export interface WatchHistoryItem {
  vodId: string;
  vodName: string;
  vodPic: string;
  sourceIndex: number;
  episodeIndex: number;
  episodeName: string;
  currentTime: number;
  duration: number;
  timestamp: number;
}