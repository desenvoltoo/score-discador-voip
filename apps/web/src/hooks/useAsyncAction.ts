import { useCallback, useState } from 'react';

export function useAsyncAction() {
  const [pending, setPending] = useState(false);

  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    if (pending) return undefined;
    setPending(true);
    try {
      return await action();
    } finally {
      setPending(false);
    }
  }, [pending]);

  return { pending, run };
}
