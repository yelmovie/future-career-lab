import { useCallback, useEffect, useState } from 'react';
import type { PageNumber } from '../shared/types';

function parseHash(): PageNumber {
  const match = window.location.hash.match(/^#\/page\/(\d+)$/);
  const page = Number(match?.[1] ?? 1);
  return page >= 1 && page <= 10 ? page as PageNumber : 1;
}

export function useHashRouter() {
  const [page, setPage] = useState<PageNumber>(parseHash);

  useEffect(() => {
    const onChange = () => setPage(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((target: PageNumber) => {
    const nextHash = `#/page/${target}`;
    if (window.location.hash === nextHash) setPage(target);
    else window.location.hash = nextHash;
  }, []);

  return { page, navigate };
}
