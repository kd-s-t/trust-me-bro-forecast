import { EXTENSION_NOISE_SCRIPT } from "@/lib/extensionNoiseScript";

/** First script in document — before MetaMask / Next dev overlay. */
export function ExtensionNoiseShield() {
  return (
    <script
      id="extension-noise-shield"
      dangerouslySetInnerHTML={{ __html: EXTENSION_NOISE_SCRIPT }}
      suppressHydrationWarning
    />
  );
}
