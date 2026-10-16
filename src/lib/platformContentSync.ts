const PLATFORM_CONTENT_CHANNEL = "platform-content-listing-updates";
const PLATFORM_CONTENT_EVENT = "platform-content-listing-updated";
const STORAGE_KEY_PREFIX = "platform-content-listing-updated:";

export function notifyPlatformContentChanged(contentKey: string) {
  window.dispatchEvent(new CustomEvent(PLATFORM_CONTENT_EVENT, { detail: { contentKey } }));

  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(PLATFORM_CONTENT_CHANNEL);
      channel.postMessage({ contentKey });
      channel.close();
    }
  } catch (error) {
    console.error("Unable to broadcast updated platform listings:", error);
  }

  try {
    window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${contentKey}`, new Date().toISOString());
  } catch (error) {
    console.error("Unable to notify other tabs about updated platform listings:", error);
  }
}

export function subscribeToPlatformContentChanges(contentKey: string, onChange: () => void) {
  const handleCustomEvent = (event: Event) => {
    if (event instanceof CustomEvent && event.detail?.contentKey === contentKey) onChange();
  };
  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === `${STORAGE_KEY_PREFIX}${contentKey}`) onChange();
  };
  const handleBroadcastMessage = (event: MessageEvent<{ contentKey?: string }>) => {
    if (event.data?.contentKey === contentKey) onChange();
  };
  let channel: BroadcastChannel | null = null;

  window.addEventListener(PLATFORM_CONTENT_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);
  try {
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(PLATFORM_CONTENT_CHANNEL);
      channel.addEventListener("message", handleBroadcastMessage);
    }
  } catch (error) {
    console.error("Unable to subscribe to platform listing updates:", error);
  }

  return () => {
    window.removeEventListener(PLATFORM_CONTENT_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
    channel?.removeEventListener("message", handleBroadcastMessage);
    channel?.close();
  };
}
