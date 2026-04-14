import * as d3 from "d3";
import {loadBoxplotData} from "./scripts/boxplot-data.js";
import {initBoxplot} from "./scripts/boxplot.js";
import {initDorlingMap} from "./scripts/dorling-map.js";

loadBoxplotData()
  .then((data) => {
    initBoxplot(data);
  })
  .catch((err) => console.error("Boxplot init failed:", err));

const dorlingButtons = document.querySelectorAll(".dorling-metric-btn");

if (dorlingButtons.length > 0) {
  initDorlingMap()
    .then(({setMetric}) => {
      const activeButton = document.querySelector(".dorling-metric-btn.active");
      const initialMetric = activeButton?.dataset.metric || "revenue";

      const syncButtons = (metricKey) => {
        dorlingButtons.forEach((button) => {
          button.classList.toggle(
            "active",
            button.dataset.metric === metricKey,
          );
        });
      };

      syncButtons(initialMetric);
      setMetric(initialMetric);

      dorlingButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const metricKey = button.dataset.metric;
          syncButtons(metricKey);
          setMetric(metricKey);
        });
      });
    })
    .catch((error) => {
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
}
// TODO Other visualizations can be initialized here as needed.
