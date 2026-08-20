import { useSyncExternalStore } from "react";

/**
 * Minimal external store (no extra dependency) holding the most recently
 * captured report photo so the camera screen and the preview/confirm
 * screen can share state without prop drilling.
 */
let state = {
  uri: null,
  width: null,
  height: null,
  takenAt: null,
};

const listeners = new Set();

function emitChange() {
  for (const listener of listeners) listener();
}

export const cameraStore = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return state;
  },
  setPhoto({ uri, width, height }) {
    state = {
      uri,
      width: width ?? null,
      height: height ?? null,
      takenAt: Date.now(),
    };
    emitChange();
  },
  clearPhoto() {
    state = { uri: null, width: null, height: null, takenAt: null };
    emitChange();
  },
};

export function useCameraStore() {
  return useSyncExternalStore(cameraStore.subscribe, cameraStore.getSnapshot);
}