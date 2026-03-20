export interface MetricData {
  label: string;
  value: string | number;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral';
  icon: string;
  color: string;
}

export interface ChartData {
  name: string;
  value: number;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  type: 'alert' | 'news' | 'report';
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'degradation' | 'construction' | 'growth';
  label: string;
}

export interface User {
  id: string;
  username: string;
  role: 'user' | 'admin';
}
