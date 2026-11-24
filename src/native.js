import { Capacitor } from "@capacitor/core";

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function safeFileName(name) {
  const cleaned = String(name || "download").replace(/[^\w.\- ()]+/g, "_");
  return cleaned || "download";
}

export function initNativeApp() {
  if (!Capacitor.isNativePlatform()) return;

  window.solusphereNative = true;
  document.documentElement.classList.add("native-app");

  setupNativeApp().catch((error) => {
    console.error("Native startup failed", error);
  });
}

async function setupNativeApp() {
  const { App } = await import("@capacitor/app");
  const { Browser } = await import("@capacitor/browser");
  const { StatusBar, Style } = await import("@capacitor/status-bar");
  const { SplashScreen } = await import("@capacitor/splash-screen");
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { Share } = await import("@capacitor/share");

  const applyStatusBar = async () => {
    const dark = document.documentElement.classList.contains("dark");
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: dark ? "#0f151b" : "#fafbfc" });
    }
  };

  try {
    await applyStatusBar();
    new MutationObserver(() => {
      applyStatusBar().catch(() => {});
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  } catch (error) {
    console.warn("Status bar setup skipped", error);
  }

  await App.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else App.exitApp();
  });

  document.addEventListener("click", async (event) => {
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!anchor) return;
    const href = anchor.href;
    if (!href) return;

    try {
      if (anchor.hasAttribute("download") && href.startsWith("blob:")) {
        event.preventDefault();
        const response = await fetch(href);
        const data = await blobToBase64(await response.blob());
        const fileName = safeFileName(anchor.getAttribute("download"));
        await Filesystem.writeFile({ path: fileName, data, directory: Directory.Cache });
        const file = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
        await Share.share({ title: fileName, url: file.uri, dialogTitle: "Save file" });
        return;
      }

      const destination = new URL(href);
      if (destination.protocol !== "http:" && destination.protocol !== "https:") return;
      if (destination.origin === window.location.origin) return;
      event.preventDefault();
      await Browser.open({ url: destination.href });
    } catch (error) {
      console.error("Could not handle link", error);
    }
  });

  await SplashScreen.hide();
}
