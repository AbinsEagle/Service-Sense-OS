// Product identity. Service Sense OS is the name on the app and reports.
export const PRODUCT = { name: "Service Sense OS", tagline: "Powered by Service Sense OS" };

// Optional partner brand (feature list Q2). Null = Service Sense OS only. When set, the
// partner's name/logo lead and "Powered by Service Sense OS" stays underneath (UI plan U6, U9).
export const BRAND = {
  name: null as string | null,
  logo: null as string | null, // data: URL or same-origin path, square, ~256 px
};

export const displayName = () => BRAND.name ?? PRODUCT.name;
