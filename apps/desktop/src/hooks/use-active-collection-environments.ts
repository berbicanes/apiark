import { useEffect } from "react";
import { useCollectionStore } from "@/stores/collection-store";
import { useEnvironmentStore } from "@/stores/environment-store";

/**
 * Loads the environments for the active collection (the first open collection,
 * matching the app's existing convention) whenever the collection set changes.
 *
 * Mount this once, high in the tree, so environments are available everywhere
 * (header selector, side panel) without each consumer triggering its own load.
 */
export function useActiveCollectionEnvironments() {
  const collections = useCollectionStore((s) => s.collections);
  const loadEnvironments = useEnvironmentStore((s) => s.loadEnvironments);

  useEffect(() => {
    if (collections.length > 0) {
      const firstCollection = collections[0];
      if (firstCollection.type === "collection") {
        loadEnvironments(firstCollection.path);
      }
    }
  }, [collections, loadEnvironments]);
}
