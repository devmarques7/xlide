import { useEffect, useState } from "react";
import { fetchPresentation, usePresentation } from "./store";
import type { Presentation } from "./types";

/** Loads a deck from this device or, failing that, from the XLIDE server. */
export function useRemoteDeck(id: string | undefined) {
  const local = usePresentation(id);
  const [remote, setRemote] = useState<Presentation | undefined>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetchPresentation(id).then((p) => {
      if (!alive) return;
      setRemote(p);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  const deck = !local ? remote : !remote ? local : local.updatedAt >= remote.updatedAt ? local : remote;
  return { deck, loading: loading && !deck };
}
