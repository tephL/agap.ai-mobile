import { useSyncExternalStore } from "react";

export const MAX_PHOTOS = 3;
export const REPORT_DURATION_MS = 5 * 60 * 1000;

/**
 * Minimal external store (no extra dependency) holding the in-progress
 * report session: a 5:00 deadline, confirmed photos (max 3), the
 * pending capture shared by the camera and preview screens, and the
 * status of the /location call that creates the report row on the backend.
 */
let state = {
  pending: null,
  photos: [],
  previewMode: "capture",
  viewingIndex: null,
  reportExpiresAt: null,
  sentAt: null,
  locationStatus: "idle", // "idle" | "pending" | "success" | "error"
  locationError: null,
};

// Kept outside `state` on purpose: this is a Promise, not serializable UI
// state. Screens call waitForLocation() to observe it rather than reading
// it directly, so nothing here needs to trigger a re-render.
let locationPromise = null;

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
    locationPromise = null;
    setState({
      pending: null,
      photos: [],
      previewMode: "capture",
      viewingIndex: null,
      reportExpiresAt: now + REPORT_DURATION_MS,
      sentAt: now,
      locationStatus: "idle",
      locationError: null,
    });
  },
  discardReport() {
    locationPromise = null;
    setState({
      pending: null,
      photos: [],
      previewMode: "capture",
      viewingIndex: null,
      reportExpiresAt: null,
      sentAt: null,
      locationStatus: "idle",
      locationError: null,
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

  // --- Location request tracking ---
  // Called right when the hold-to-report gesture completes, with the
  // in-flight promise from requestReportLocation(). Screens that need to
  // upload/attach data must wait on this before calling the backend, so
  // nothing races ahead of the report actually being created via /location.
  setLocationRequest(promise) {
    locationPromise = promise;
    // Prevent an unhandled promise rejection warning; failures are
    // surfaced to callers of waitForLocation() instead.
    promise?.catch(() => {});
  },
  async waitForLocation() {
    if (!locationPromise) {
      return {
        ok: false,
        error: new Error("Location was never requested for this report."),
      };
    }
    try {
      await locationPromise;
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  },
  setLocationStatus(status, error = null) {
    setState({ ...state, locationStatus: status, locationError: error });
  },
};

export function useCameraStore() {
  return useSyncExternalStore(cameraStore.subscribe, cameraStore.getSnapshot);
}
