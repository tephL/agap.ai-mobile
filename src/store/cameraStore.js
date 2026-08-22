import { useSyncExternalStore } from "react";

export const MAX_PHOTOS = 3;
export const REPORT_DURATION_MS = 5 * 60 * 1000;

/**
 * Minimal external store (no extra dependency) holding the in-progress
 * report session: a 5:00 deadline, confirmed photos (max 3), and the
 * pending capture shared by the camera and preview screens.
 */
let state = {
  pending: null,
  photos: [],
  previewMode: "capture",
  viewingIndex: null,
  reportExpiresAt: null,
  sentAt: null,
};

const listeners = new Set();

function emitChange() {
  for (const listener of listeners) listener();
}

function setState(next) {
  state = next;
  emitChange();
}

export const cameraStore = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return state;
  },
  startReport() {
    const now = Date.now();
    setState({
      pending: null,
      photos: [],
      previewMode: "capture",
      viewingIndex: null,
      reportExpiresAt: now + REPORT_DURATION_MS,
      sentAt: now,
    });
  },
  discardReport() {
    setState({
      pending: null,
      photos: [],
      previewMode: "capture",
      viewingIndex: null,
      reportExpiresAt: null,
      sentAt: null,
    });
  },
  setPhoto({ uri, width, height }) {
    setState({
      ...state,
      pending: {
        uri,
        width: width ?? null,
        height: height ?? null,
        takenAt: Date.now(),
      },
      previewMode: "capture",
      viewingIndex: null,
    });
  },
  clearPending() {
    setState({
      ...state,
      pending: null,
      previewMode: "capture",
      viewingIndex: null,
    });
  },
  confirmPending() {
    if (!state.pending || state.photos.length >= MAX_PHOTOS) return false;
    const photo = {
      ...state.pending,
      id: `${state.pending.takenAt}-${state.photos.length}`,
    };
    setState({
      ...state,
      photos: [...state.photos, photo],
      pending: null,
      previewMode: "capture",
      viewingIndex: null,
    });
    return true;
  },
  openPhoto(index) {
    if (index < 0 || index >= state.photos.length) return;
    setState({
      ...state,
      previewMode: "view",
      viewingIndex: index,
    });
  },
  removePhoto(index) {
    if (index < 0 || index >= state.photos.length) return;
    setState({
      ...state,
      photos: state.photos.filter((_, i) => i !== index),
      previewMode: "capture",
      viewingIndex: null,
    });
  },
  // Kept for existing call sites that still refer to a single photo.
  clearPhoto() {
    cameraStore.clearPending();
  },
};

export function useCameraStore() {
  return useSyncExternalStore(cameraStore.subscribe, cameraStore.getSnapshot);
}
