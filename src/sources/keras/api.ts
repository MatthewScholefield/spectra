import type { ProjectInfo, RunInfo } from './types';

export async function fetchProjects(serverUrl: string): Promise<ProjectInfo[]> {
  const res = await fetch(`${serverUrl}/api/projects`);
  if (!res.ok) throw new Error(`Failed to fetch projects: ${res.status}`);
  return res.json();
}

export async function fetchRuns(serverUrl: string, projectName: string): Promise<RunInfo[]> {
  const res = await fetch(`${serverUrl}/api/projects/${encodeURIComponent(projectName)}/runs`);
  if (!res.ok) throw new Error(`Failed to fetch runs: ${res.status}`);
  return res.json();
}
