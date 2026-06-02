export type ChartType = "bar" | "line" | "pie" | "doughnut";

export type ChartDatum = {
  label: string;
  value: number;
  color: string;
};

export type ChartRecord = {
  id: string;
  dashboardId: string;
  type: ChartType;
  title: string;
  description: string;
  data: ChartDatum[];
  gridLines: boolean;
  position: {
    top: number;
    left: number;
  };
  size: {
    width: number;
    height: number;
  };
  updatedAt: number;
};

export type WorkspaceState = {
  dashboardId: string;
  panX: number;
  panY: number;
  zoom: number;
  updatedAt: number;
};

export type LegacyChartRecord = {
  id: string;
  type?: ChartType;
  labels?: string[];
  data?: number[];
  colors?: string[];
  title?: string;
  description?: string;
  gridLines?: boolean;
  position?: {
    top?: string;
    left?: string;
  };
  size?: {
    width?: number;
    height?: number;
  };
};
