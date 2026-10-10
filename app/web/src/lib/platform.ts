// iPhone/iPad browsers (Safari, Chrome, Bluefy) all run on WebKit and show Apple's
// permission pop-ups and settings, which differ from Android's.
export const isIOS = () =>
  typeof navigator !== "undefined" && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
