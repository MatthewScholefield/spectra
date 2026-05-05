import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { rowToValues, createTableFromHeaders } from '../engine/stream-adapter';
import type { StreamSource, DataTable, DatasetOrigin } from '../engine/types';
import { generateId, parseRunPath } from '../utils/format';

export function useStreamSource(source: StreamSource | null) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const datasetIdRef = useRef<string | null>(null);
  const addDatasetFromTable = useStore((s) => s.addDatasetFromTable);
  const appendRowsToDataset = useStore((s) => s.appendRowsToDataset);
  const updateSourceStatus = useStore((s) => s.updateSourceStatus);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!source || source.status === 'completed' || source.status === 'error') return;

    // Fetch full snapshot first (for reconnect or completed runs), then open SSE
    const snapshotUrl = `${source.serverUrl}/api/projects/${encodeURIComponent(source.projectName)}/runs/${encodeURIComponent(source.runId)}/data`;
    const sseUrl = `${source.serverUrl}/api/projects/${encodeURIComponent(source.projectName)}/runs/${encodeURIComponent(source.runId)}/events`;

    let datasetId: string | null = null;
    let table: DataTable | null = null;

    const origin: DatasetOrigin = { kind: 'run', project: source.projectName, path: parseRunPath(source.runId) };

    updateSourceStatus(source.id, 'connecting');

    const abortController = new AbortController();

    const init = async () => {
      let snapshotCount = 0;
      let runCompleted = false;

      try {
        // Try to load full snapshot
        const res = await fetch(snapshotUrl, { signal: abortController.signal });
        if (res.ok) {
          const result = await res.json();
          const data = Array.isArray(result) ? result : result.rows;
          const runStatus = Array.isArray(result) ? null : result.status;
          if (Array.isArray(data) && data.length > 0) {
            const headers = Object.keys(data[0]).filter((k) => !k.startsWith('_'));
            table = createTableFromHeaders(headers);
            for (const row of data) {
              const values = rowToValues(row);
              for (const col of table!.columns) {
                col.values.push(values.get(col.key) ?? null);
              }
              table!.rowCount++;
            }
            datasetId = addDatasetFromTable(table, origin, source.id);
            datasetIdRef.current = datasetId;
            snapshotCount = data.length;
          }
          if (runStatus === 'completed') {
            updateSourceStatus(source.id, 'completed');
            runCompleted = true;
          }
        }
      } catch {
        if (abortController.signal.aborted) return;
        // Snapshot not available — start fresh
      }

      if (runCompleted || abortController.signal.aborted) return;

      // Open SSE stream
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        updateSourceStatus(source.id, 'live');
      };

      es.addEventListener('row', (e: MessageEvent) => {
        try {
          // Skip rows already loaded from snapshot
          if (snapshotCount > 0) {
            snapshotCount--;
            return;
          }

          const row = JSON.parse(e.data);
          const values = rowToValues(row);

          if (!datasetId) {
            // First row — create the dataset
            const headers = Array.from(values.keys());
            table = createTableFromHeaders(headers);
            for (const col of table.columns) {
              col.values.push(values.get(col.key) ?? null);
            }
            table.rowCount = 1;
            datasetId = addDatasetFromTable(table, origin, source.id);
            datasetIdRef.current = datasetId;
          } else {
            // Append row to existing dataset
            appendRowsToDataset(datasetId, [row]);
          }
        } catch {
          // Ignore malformed events
        }
      });

      es.addEventListener('complete', () => {
        updateSourceStatus(source.id, 'completed');
        es.close();
        eventSourceRef.current = null;
      });

      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED) {
          updateSourceStatus(source.id, 'error');
        }
      };
    };

    init();

    return () => {
      abortController.abort();
      disconnect();
    };
  }, [source?.id, source?.serverUrl, source?.projectName, source?.runId]);

  return { disconnect };
}

export function useAllStreamSources() {
  const sources = useStore((s) => s.sources);
  const activeSources = sources.filter(
    (s) => s.status === 'connecting' || s.status === 'live'
  );
  return activeSources;
}

// Standalone function to connect a source (used by ConnectSourceModal)
export function connectRun(
  serverUrl: string,
  projectName: string,
  runId: string,
  baseline?: string,
  runConfig?: Record<string, unknown>,
): StreamSource {
  return {
    id: generateId(),
    kind: 'stream',
    name: `${projectName} / ${runId}`,
    serverUrl,
    projectName,
    runId,
    baseline,
    status: 'idle',
    runConfig,
  };
}
