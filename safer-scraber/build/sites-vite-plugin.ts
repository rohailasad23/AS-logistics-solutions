import type { Plugin } from "vite";

export function sites(): Plugin {
  return {
    name: "sites-vite-plugin",
    config: () => ({
      define: {
        "process.env.__SITES_PLUGIN_LOADED__": JSON.stringify(true),
      },
    }),
    configureServer(server) {
      server.watcher.on("change", (file) => {
        if (file.includes(".openai/hosting.json")) {
          server.restart();
        }
      });
    },
  };
}
