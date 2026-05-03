export interface RunInfo {
  run_id: string;
  baseline?: string;
  status: 'running' | 'completed';
  config?: Record<string, unknown>;
}

export interface ProjectInfo {
  name: string;
  run_count: number;
}
