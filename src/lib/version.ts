import packageJson from "../../package.json";

/** Build-time app version. Read directly from package.json — no Vite define
 * dance, no `__APP_VERSION__` global, no runtime ReferenceError risk. */
export const APP_VERSION: string = packageJson.version;
