import { useStore } from '../store/useStore';
import { useStreamSource } from '../hooks/useStreamSource';

function SourceConnection({ sourceId }: { sourceId: string }) {
  const source = useStore((s) => s.sources.find((src) => src.id === sourceId) ?? null);
  useStreamSource(source);
  return null;
}

export function StreamManager() {
  const sources = useStore((s) => s.sources);
  return (
    <>
      {sources.map((s) => (
        <SourceConnection key={s.id} sourceId={s.id} />
      ))}
    </>
  );
}
