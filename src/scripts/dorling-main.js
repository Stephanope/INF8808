import * as d3 from "d3";
import {initDorlingMap} from "./dorling-map.js";

initDorlingMap()
  .then(({setMetric}) => {
    window.parent.postMessage(
      {
        type: "dorling-ready",
      },
      "*",
    );

    window.addEventListener("message", (event) => {
      if (event.data?.type === "dorling-metric") {
        setMetric(event.data.metric);
      }
    });
  })
  .catch((error) => {
    // Keep the standalone page usable even if the remote GeoJSON request fails.
    // eslint-disable-next-line no-console
    console.error("Dorling map initialization failed:", error);

    const container = d3.select("#dorling-map");
    if (!container.empty()) {
      container
        .append("p")
        .style("padding", "18px")
        .style("font-family", "Roboto, sans-serif")
        .style("color", "#ffd2d2")
        .text(
          "Impossible de charger la carte. Verifie la connexion reseau et recharge la page.",
        );
    }
  });
