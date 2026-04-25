import * as d3 from "d3";

const MOVIES_DATA_URL = "./movies_clean.csv";
const WORLD_GEOJSON_URL =
  "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

const SIZE_METRIC = {
  label: "Nombre de films",
  value: (d) => d.count,
  format: d3.format(","),
};

const COLOR_METRICS = {
  revenue: {
    label: "Revenus moyens par film ($)",
    value: (d) => d.avgRevenue,
    format: d3.format("~s"),
  },
  vote: {
    label: "Note moyenne",
    value: (d) => d.voteAverage,
    format: d3.format(".2f"),
  },
};

const BUBBLE_COLOR_RANGE = ["#ffffff", "#ff0000", "#000000"];

const DORLING_THEME = {
  background: "#313131",
  backgroundAccent: "#1b1820",
  countryFill: "#3a3a3a",
  countryStroke: "rgba(255, 255, 255, 0.08)",
  text: "#f5efe7",
  mutedText: "#d2c6b8",
  axis: "#8f8172",
  tooltipBackground: "rgba(15, 13, 18, 0.96)",
  tooltipBorder: "rgba(255, 255, 255, 0.12)",
};

const COUNTRY_ALIASES = {
  "american samoa": "usa",
  andorra: "spain",
  aruba: "usa",
  bahamas: "the bahamas",
  "cote d'ivoire": "ivory coast",
  "cote divoire": "ivory coast",
  "east germany": "germany",
  "french guiana": "france",
  gibraltar: "spain",
  guadaloupe: "guadeloupe",
  "hong kong": "china",
  "libyan arab jamahiriya": "libya",
  liechtenstein: "switzerland",
  macao: "china",
  malta: "italy",
  "palestinian territory": "west bank",
  "sao tome and principe": "sao tome and principe",
  serbia: "republic of serbia",
  singapore: "malaysia",
  "soviet union": "russia",
  tanzania: "united republic of tanzania",
  "united kingdom": "england",
  "united states of america": "usa",
  yugoslavia: "serbia",
};

/**
 * Normalizes a country name key for lookups.
 *
 * @param {string} name Raw country name.
 * @returns {string} Normalized lowercase key.
 */
function normalizeCountryName(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}

/**
 * Resolves a dataset country name to a canonical value.
 *
 * @param {string} name Raw country name.
 * @returns {string} Canonical country name.
 */
function canonicalCountryName(name) {
  const normalized = normalizeCountryName(name);
  if (!normalized) {
    return "";
  }
  return COUNTRY_ALIASES[normalized] || String(name).trim();
}

/**
 * Formats a country name for UI display.
 *
 * @param {string} name Raw country name.
 * @returns {string} Country name with capitalization.
 */
function formatCountryDisplayName(name) {
  const base = String(name || "").trim();
  if (!base) {
    return "";
  }

  const uppercaseTokens = new Set(["usa", "uk", "uae", "drc"]);

  return base
    .split(/([\s-]+)/)
    .map((part) => {
      if (!part || /^\s+$/.test(part) || part === "-") {
        return part;
      }

      const lower = part.toLowerCase();
      if (uppercaseTokens.has(lower)) {
        return lower.toUpperCase();
      }

      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

/**
 * Resolves a country name to a shared join key used by both the dataset and GeoJSON.
 *
 * @param {string} name Raw country name.
 * @returns {string} Shared join key.
 */
function countryJoinKey(name) {
  return normalizeCountryName(canonicalCountryName(name));
}

/**
 * Parses the production countries CSV field to a clean list.
 *
 * @param {string} value Country list as CSV text.
 * @returns {string[]} Parsed country names.
 */
function parseCountryList(value) {
  return String(value || "")
    .split(",")
    .map((country) => canonicalCountryName(country))
    .filter(Boolean);
}

/**
 * Aggregates movie statistics by production country.
 *
 * @param {object[]} movies The movie dataset.
 * @returns {object[]} Per-country aggregate rows.
 */
function aggregateByCountry(movies) {
  const byCountry = new Map();

  movies.forEach((movie) => {
    const countries = [
      ...new Set(parseCountryList(movie.production_countries)),
    ];
    if (countries.length === 0) {
      return;
    }

    countries.forEach((country) => {
      const key = normalizeCountryName(country);
      if (!byCountry.has(key)) {
        byCountry.set(key, {
          country,
          count: 0,
          revenue: 0,
          revenueCount: 0,
          voteSum: 0,
          voteCount: 0,
          weightedVoteSum: 0,
          weightedVoteCount: 0,
        });
      }

      const row = byCountry.get(key);
      row.count += 1;

      if (Number.isFinite(movie.revenue)) {
        row.revenue += movie.revenue;
        row.revenueCount += 1;
      }

      if (Number.isFinite(movie.vote_average)) {
        row.voteSum += movie.vote_average;
        row.voteCount += 1;
      }

      if (
        Number.isFinite(movie.vote_average) &&
        Number.isFinite(movie.vote_count) &&
        movie.vote_count > 0
      ) {
        row.weightedVoteSum += movie.vote_average * movie.vote_count;
        row.weightedVoteCount += movie.vote_count;
      }
    });
  });

  return Array.from(byCountry.values())
    .map((d) => ({
      country: d.country,
      count: d.count,
      revenue: d.revenue,
      avgRevenue: d.revenueCount > 0 ? d.revenue / d.revenueCount : 0,
      voteAverage: d.voteCount > 0 ? d.voteSum / d.voteCount : 0,
      weightedVoteAverage:
        d.weightedVoteCount > 0
          ? d.weightedVoteSum / d.weightedVoteCount
          : d.voteCount > 0
            ? d.voteSum / d.voteCount
            : 0,
    }))
    .filter((d) => d.count > 0);
}

/**
 * Builds the movie list indexed by production country.
 *
 * @param {object[]} movies The movie dataset.
 * @returns {Map<string, object[]>} Per-country movie rows.
 */
function buildMoviesByCountry(movies) {
  const byCountry = new Map();

  movies.forEach((movie) => {
    const countries = [
      ...new Set(parseCountryList(movie.production_countries)),
    ];
    if (countries.length === 0) {
      return;
    }

    const voteAverage = Number.isFinite(movie.vote_average)
      ? movie.vote_average
      : 0;
    const voteCount = Number.isFinite(movie.vote_count) ? movie.vote_count : 0;
    const weightedScore =
      voteCount > 0
        ? (voteAverage * voteCount) / (voteCount + 50) +
          (6 * 50) / (voteCount + 50)
        : voteAverage;

    const movieEntry = {
      title: movie.title || "Film",
      releaseDate: movie.release_date,
      revenue: Number.isFinite(movie.revenue) ? movie.revenue : 0,
      voteAverage,
      voteCount,
      posterPath: String(movie.poster_path || "").trim(),
      weightedScore,
    };

    countries.forEach((country) => {
      const key = normalizeCountryName(country);
      if (!byCountry.has(key)) {
        byCountry.set(key, []);
      }

      byCountry.get(key).push(movieEntry);
    });
  });

  byCountry.forEach((moviesForCountry, key) => {
    moviesForCountry.sort((a, b) => {
      if (b.revenue !== a.revenue) {
        return b.revenue - a.revenue;
      }
      if (b.voteAverage !== a.voteAverage) {
        return b.voteAverage - a.voteAverage;
      }
      if (b.voteCount !== a.voteCount) {
        return b.voteCount - a.voteCount;
      }
      return String(a.title).localeCompare(String(b.title));
    });

    byCountry.set(key, moviesForCountry);
  });

  return byCountry;
}

function formatMoneyCompact(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }
  if (value >= 1_000_000_000) {
    return `${d3.format(".2f")(value / 1_000_000_000)}B`;
  }
  if (value >= 1_000_000) {
    return `${d3.format(".1f")(value / 1_000_000)}M`;
  }
  if (value >= 1_000) {
    return `${d3.format(".1f")(value / 1_000)}K`;
  }
  return d3.format(",.0f")(value);
}

/**
 * Formats a release date for display.
 *
 * @param {Date|string|null|undefined} value Release date value.
 * @returns {string} A formatted date string.
 */
function formatReleaseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return d3.timeFormat("%Y-%m-%d")(value);
  }

  const text = String(value || "").trim();
  return text || "Date inconnue";
}

/**
 * Initializes the country detail panel.
 *
 * @returns {object} The panel selections.
 */
function initCountryPanel(container) {
  let panelRoot = container.select(".dorling-country-panel");
  if (panelRoot.empty()) {
    panelRoot = container
      .append("aside")
      .attr("class", "dorling-country-panel");

    panelRoot
      .append("h3")
      .attr("class", "dorling-country-name")
      .text("Selectionnez un pays");

    const statGrid = panelRoot
      .append("div")
      .attr("class", "dorling-country-stats");
    const filmsCard = statGrid
      .append("div")
      .attr("class", "dorling-country-stat-card");
    filmsCard.append("span").attr("class", "label").text("Nombre de films");
    filmsCard.append("strong").attr("class", "value films").text("-");

    const revenueCard = statGrid
      .append("div")
      .attr("class", "dorling-country-stat-card");
    revenueCard.append("span").attr("class", "label").text("Revenu moyen");
    revenueCard.append("strong").attr("class", "value revenue").text("-");

    const voteCard = statGrid
      .append("div")
      .attr("class", "dorling-country-stat-card");
    voteCard.append("span").attr("class", "label").text("Note moyenne");
    voteCard.append("strong").attr("class", "value vote").text("-");

    panelRoot
      .append("h4")
      .attr("class", "dorling-country-top-title")
      .text("Top 5 films les plus rentables");
    panelRoot.append("ol").attr("class", "dorling-country-top-list");
  }

  return {
    root: panelRoot,
    title: panelRoot.select(".dorling-country-name"),
    films: panelRoot.select(".value.films"),
    revenue: panelRoot.select(".value.revenue"),
    vote: panelRoot.select(".value.vote"),
    topFilmsList: panelRoot.select(".dorling-country-top-list"),
  };
}

/**
 * Updates the country detail panel.
 *
 * @param {object} panel The panel selections.
 * @param {object|null} countryRow Aggregated country statistics.
 * @param {object[]} topMovies Top movies for the selected country.
 */
function updateCountryPanel(panel, countryRow, topMovies) {
  if (!panel || panel.root.empty()) {
    return;
  }

  if (!countryRow) {
    panel.title.text("Selectionnez un pays");
    panel.films.text("-");
    panel.revenue.text("-");
    panel.vote.text("-");
    panel.topFilmsList.selectAll("*").remove();
    return;
  }

  const displayCountry = formatCountryDisplayName(countryRow.country);
  const averageVote = Number.isFinite(countryRow.voteAverage)
    ? countryRow.voteAverage
    : 0;
  const averageRevenue = Number.isFinite(countryRow.avgRevenue)
    ? countryRow.avgRevenue
    : 0;
  const topFiveMovies = (topMovies || []).slice(0, 5);

  panel.title.text(displayCountry || "Pays");
  panel.films.text(d3.format(",")(countryRow.count || 0));
  panel.revenue.text(`$${formatMoneyCompact(averageRevenue)}`);
  panel.vote.text(d3.format(".2f")(averageVote));

  const items = panel.topFilmsList
    .selectAll("li")
    .data(
      topFiveMovies,
      (d) => `${d.title}-${formatReleaseDate(d.releaseDate)}`,
    );

  items.exit().remove();

  const itemsEnter = items
    .enter()
    .append("li")
    .attr("class", "dorling-film-item");

  itemsEnter
    .append("img")
    .attr("class", "dorling-film-poster")
    .attr("alt", "Affiche du film");
  const details = itemsEnter
    .append("div")
    .attr("class", "dorling-film-details");
  details.append("span").attr("class", "dorling-film-title");
  details.append("span").attr("class", "dorling-film-meta");

  const itemsMerge = itemsEnter.merge(items);

  itemsMerge
    .select(".dorling-film-poster")
    .attr("src", (d) =>
      d.posterPath ? `https://image.tmdb.org/t/p/w92${d.posterPath}` : "",
    )
    .style("visibility", (d) => (d.posterPath ? "visible" : "hidden"));

  itemsMerge.select(".dorling-film-title").text((d) => d.title);
  itemsMerge.select(".dorling-film-meta").text((d) => {
    return `${formatReleaseDate(d.releaseDate)} - Revenus: $${formatMoneyCompact(d.revenue)} - Note: ${d3.format(".2f")(d.voteAverage)}`;
  });

  if (topFiveMovies.length === 0) {
    panel.topFilmsList
      .selectAll("li")
      .data(["Aucun film disponible"])
      .join("li")
      .attr("class", "dorling-film-item")
      .text("Aucun film disponible");
  }
}

/**
 * Returns the top country according to the given accessor.
 *
 * @param {object[]} stats Country statistics.
 * @param {Function} accessor Ranking accessor.
 * @returns {object|null} The best matching country row.
 */
function getTopCountry(stats, accessor) {
  return stats.reduce((best, current) => {
    if (!best || accessor(current) > accessor(best)) {
      return current;
    }

    return best;
  }, null);
}

/**
 * Builds a short fun fact based on the country statistics.
 *
 * @param {object[]} stats Country statistics.
 * @returns {string} A fun fact sentence.
 */
function buildFunFact(stats) {
  if (!stats.length) {
    return "Fait amusant : la carte ne contient pas assez de données pour en tirer une tendance nette.";
  }

  const topCount = getTopCountry(stats, (d) => d.count);
  const topRevenue = getTopCountry(stats, (d) => d.avgRevenue);
  const topVote = getTopCountry(stats, (d) => d.voteAverage);

  const countName = formatCountryDisplayName(topCount.country);
  const revenueName = formatCountryDisplayName(topRevenue.country);
  const voteName = formatCountryDisplayName(topVote.country);

  if (
    topCount.country === topRevenue.country &&
    topRevenue.country === topVote.country
  ) {
    return `Fait amusant : ${countName} domine à la fois le nombre de films, les revenus moyens par film et la note moyenne.`;
  }

  if (topCount.country === topRevenue.country) {
    return `Fait amusant : ${countName} domine à la fois le nombre de films et les revenus moyens par film, tandis que ${voteName} affiche la meilleure note moyenne.`;
  }

  return `Fait amusant : ${countName} produit le plus de films, ${revenueName} génère les revenus moyens par film les plus élevés et ${voteName} obtient la meilleure note moyenne.`;
}

/**
 * Creates or retrieves the map tooltip node.
 *
 * @param {*} container The Dorling container selection.
 * @returns {*} The tooltip selection.
 */
function ensureTooltip(container) {
  let tooltip = container.select(".dorling-tooltip");
  if (tooltip.empty()) {
    tooltip = container.append("div").attr("class", "dorling-tooltip");
  }
  return tooltip;
}

/**
 * Positions the tooltip so it stays fully visible within the map container.
 *
 * @param {*} tooltip The tooltip selection.
 * @param {*} container The map container selection.
 * @param {number} x Pointer x in container coordinates.
 * @param {number} y Pointer y in container coordinates.
 */
function placeTooltipInBounds(tooltip, container, x, y) {
  const tooltipNode = tooltip.node();
  const containerNode = container.node();
  if (!tooltipNode || !containerNode) {
    return;
  }

  const offset = 12;
  const tooltipWidth = tooltipNode.offsetWidth || 0;
  const tooltipHeight = tooltipNode.offsetHeight || 0;
  const containerWidth = containerNode.clientWidth || 0;
  const containerHeight = containerNode.clientHeight || 0;

  let left = x + offset;
  let top = y - tooltipHeight - offset;

  if (left + tooltipWidth > containerWidth - 8) {
    left = x - tooltipWidth - offset;
  }
  if (left < 8) {
    left = 8;
  }

  if (top < 8) {
    top = y + offset;
  }
  if (top + tooltipHeight > containerHeight - 8) {
    top = containerHeight - tooltipHeight - 8;
  }

  tooltip.style("left", `${left}px`).style("top", `${top}px`);
}

/**
 * Renders the Dorling map for the selected color metric.
 *
 * @param {*} container The map container selection.
 * @param {object} world The world GeoJSON feature collection.
 * @param {object[]} stats Per-country aggregate statistics.
 * @param {object[]} movies The movie dataset.
 * @param {object} panel The country detail panel selections.
 * @param {string} defaultCountryKey Default country key for the side panel.
 * @param {string} colorMetricKey Active color metric key.
 */
function drawDorlingMap(
  container,
  world,
  stats,
  movies,
  defaultCountryKey,
  colorMetricKey,
) {
  const colorMetric = COLOR_METRICS[colorMetricKey];
  const bounds = container.node().getBoundingClientRect();
  const width = Math.max(760, Math.round(bounds.width || 760));
  const height = Math.max(560, Math.round(bounds.height || 560));

  const svg = container
    .selectAll("svg")
    .data([null])
    .join("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("aria-hidden", "true")
    .attr("focusable", "false");

  svg
    .selectAll(".dorling-background")
    .data([null])
    .join("rect")
    .attr("class", "dorling-background")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", height)
    .attr("fill", DORLING_THEME.background);

  const sceneGroup = svg
    .selectAll(".dorling-scene")
    .data([null])
    .join("g")
    .attr("class", "dorling-scene");

  const worldFeatures = world.features.filter(
    (feature) => countryJoinKey(feature.properties.name) !== "antarctica",
  );
  const worldForFit = {
    type: "FeatureCollection",
    features: worldFeatures,
  };

  const projection = d3.geoNaturalEarth1().fitExtent(
    [
      [24, 22],
      [width - 24, height - 20],
    ],
    worldForFit,
  );
  const focusedScale = projection.scale() * 1.12;
  const [translateX, translateY] = projection.translate();
  projection
    .scale(focusedScale)
    .translate([translateX, translateY - height * 0.07]);
  const geoPath = d3.geoPath(projection);

  const countriesGroup = sceneGroup
    .selectAll(".dorling-countries")
    .data([null])
    .join("g")
    .attr("class", "dorling-countries");
  const bubblesGroup = sceneGroup
    .selectAll(".dorling-bubbles")
    .data([null])
    .join("g")
    .attr("class", "dorling-bubbles");
  const labelsGroup = sceneGroup
    .selectAll(".dorling-labels")
    .data([null])
    .join("g")
    .attr("class", "dorling-labels");
  const legendGroup = sceneGroup
    .selectAll(".dorling-legend")
    .data([null])
    .join("g")
    .attr("class", "dorling-legend");

  countriesGroup
    .selectAll("path")
    .data(worldFeatures)
    .join("path")
    .attr("class", "dorling-country")
    .attr("fill", DORLING_THEME.countryFill)
    .attr("stroke", DORLING_THEME.countryStroke)
    .attr("d", geoPath);

  const featuresByName = new Map(
    worldFeatures.map((feature) => [
      countryJoinKey(feature.properties.name),
      feature,
    ]),
  );

  const statsByCountry = new Map(
    stats.map((stat) => [countryJoinKey(stat.country), stat]),
  );
  const moviesByCountry = buildMoviesByCountry(movies);

  const nodes = stats
    .map((stat) => {
      const feature = featuresByName.get(countryJoinKey(stat.country));
      if (!feature) {
        return null;
      }

      const centroid = geoPath.centroid(feature);
      if (!Number.isFinite(centroid[0]) || !Number.isFinite(centroid[1])) {
        return null;
      }

      return {
        ...stat,
        displayCountry: formatCountryDisplayName(stat.country),
        sizeValue: SIZE_METRIC.value(stat),
        colorValue: colorMetric.value(stat),
        x0: centroid[0],
        y0: centroid[1],
        x: centroid[0],
        y: centroid[1],
      };
    })
    .filter(Boolean)
    .filter((d) => Number.isFinite(d.sizeValue) && d.sizeValue > 0)
    .filter((d) => Number.isFinite(d.colorValue));

  const radiusScale = d3
    .scaleSqrt()
    .domain(d3.extent(nodes, (d) => d.sizeValue))
    .range([3.8, 38]);

  const colorExtent = d3.extent(nodes, (d) => d.colorValue);
  const colorMin = colorExtent[0];
  const colorMax = colorExtent[1];
  const colorMid = (colorMin + colorMax) / 2;
  const colorDomain =
    colorMin === colorMax
      ? [colorMin - 1, colorMin, colorMin + 1]
      : [colorMin, colorMid, colorMax];

  const colorScale = d3
    .scaleLinear()
    .domain(colorDomain)
    .range(BUBBLE_COLOR_RANGE)
    .clamp(true);

  nodes.forEach((node) => {
    node.r = radiusScale(node.sizeValue);
  });

  const simulation = d3
    .forceSimulation(nodes)
    .force("x", d3.forceX((d) => d.x0).strength(0.24))
    .force("y", d3.forceY((d) => d.y0).strength(0.24))
    .force("collision", d3.forceCollide((d) => d.r + 1.2).iterations(4))
    .stop();

  for (let i = 0; i < 360; i += 1) {
    simulation.tick();
  }

  const tooltip = ensureTooltip(container);
  const panel = initCountryPanel(container);

  countriesGroup.selectAll("path").on("click", function (event, feature) {
    event.stopPropagation();
    const countryKey = countryJoinKey(feature.properties.name);
    const countryStats = statsByCountry.get(countryKey);
    if (!countryStats) {
      return;
    }

    updateCountryPanel(
      panel,
      countryStats,
      moviesByCountry.get(countryKey) || [],
    );
  });

  updateCountryPanel(
    panel,
    statsByCountry.get(defaultCountryKey) || stats[0] || null,
    moviesByCountry.get(defaultCountryKey) || [],
  );

  bubblesGroup
    .selectAll("circle")
    .data(nodes, (d) => d.country)
    .join(
      (enter) =>
        enter
          .append("circle")
          .attr("class", "dorling-bubble")
          .attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y)
          .attr("r", 0)
          .attr("fill", (d) => colorScale(d.colorValue))
          .call((selection) =>
            selection
              .transition()
              .duration(420)
              .attr("r", (d) => d.r),
          ),
      (update) =>
        update
          .transition()
          .duration(420)
          .attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y)
          .attr("r", (d) => d.r)
          .attr("fill", (d) => colorScale(d.colorValue)),
      (exit) => exit.transition().duration(220).attr("r", 0).remove(),
    )
    .on("mousemove", function (event, d) {
      const [x, y] = d3.pointer(event, container.node());
      tooltip
        .html(
          `<strong>${d.displayCountry}</strong><br/>${SIZE_METRIC.label}: ${SIZE_METRIC.format(d.sizeValue)}<br/>${colorMetric.label}: ${colorMetric.format(d.colorValue)}`,
        )
        .classed("visible", true);

      placeTooltipInBounds(tooltip, container, x, y);
    })
    .on("click", function (event, d) {
      event.stopPropagation();
      const countryKey = countryJoinKey(d.country);
      updateCountryPanel(
        panel,
        statsByCountry.get(countryKey) || d,
        moviesByCountry.get(countryKey) || [],
      );
    })
    .on("mouseleave", function () {
      tooltip.classed("visible", false);
    });

  labelsGroup
    .selectAll("text")
    .data(nodes.filter((d) => d.r >= 10))
    .join("text")
    .attr("x", (d) => d.x)
    .attr("y", (d) => d.y + 3)
    .attr("text-anchor", "middle")
    .style("font-size", (d) => `${Math.max(7, Math.min(10, d.r / 2.8))}px`)
    .style("font-family", "Roboto, sans-serif")
    .attr("fill", DORLING_THEME.text)
    .attr("pointer-events", "none")
    .text((d) => d.displayCountry);

  const maxValue = d3.max(nodes, (d) => d.sizeValue);
  const midValue = maxValue / 2;
  const minValue = d3.max([1, maxValue / 8]);
  const legendValues = [maxValue, midValue, minValue];

  legendGroup.selectAll("*").remove();

  legendGroup
    .append("text")
    .attr("x", 18)
    .attr("y", -10)
    .style("font-family", "Roboto, sans-serif")
    .style("font-size", "12px")
    .style("font-weight", 700)
    .attr("fill", DORLING_THEME.text)
    .text(`${SIZE_METRIC.label} (taille)`);

  const baseX = 57;
  const baseY = 80;

  legendValues.forEach((value) => {
    const r = radiusScale(value);

    legendGroup
      .append("circle")
      .attr("cx", baseX)
      .attr("cy", baseY - r)
      .attr("r", r)
      .attr("fill", "none")
      .attr("stroke", DORLING_THEME.axis)
      .attr("stroke-width", 1);

    legendGroup
      .append("line")
      .attr("x1", baseX)
      .attr("x2", baseX + 42)
      .attr("y1", baseY - 2 * r)
      .attr("y2", baseY - 2 * r)
      .attr("stroke", DORLING_THEME.axis)
      .attr("stroke-width", 1);

    legendGroup
      .append("text")
      .attr("x", baseX + 48)
      .attr("y", baseY - 2 * r + 4)
      .style("font-family", "Roboto, sans-serif")
      .style("font-size", "11px")
      .attr("fill", DORLING_THEME.mutedText)
      .text(SIZE_METRIC.format(value));
  });

  legendGroup
    .append("line")
    .attr("x1", baseX)
    .attr("x2", baseX)
    .attr("y1", baseY - 2 * radiusScale(maxValue))
    .attr("y2", baseY)
    .attr("stroke", DORLING_THEME.axis)
    .attr("stroke-width", 1);

  const defs = svg.select("defs").empty()
    ? svg.append("defs")
    : svg.select("defs");
  const colorGradientId = "dorling-color-gradient";
  defs.select(`#${colorGradientId}`).remove();

  const colorGradient = defs
    .append("linearGradient")
    .attr("id", colorGradientId)
    .attr("x1", "0%")
    .attr("x2", "0%")
    .attr("y1", "100%")
    .attr("y2", "0%");

  colorGradient
    .selectAll("stop")
    .data([
      {offset: "0%", color: BUBBLE_COLOR_RANGE[0]},
      {offset: "50%", color: BUBBLE_COLOR_RANGE[1]},
      {offset: "100%", color: BUBBLE_COLOR_RANGE[2]},
    ])
    .enter()
    .append("stop")
    .attr("offset", (d) => d.offset)
    .attr("stop-color", (d) => d.color);

  const colorLegendHeight = 130;
  const colorLegendWidth = 14;
  const colorLegendX = width - 110;
  const colorLegendY = 18;

  legendGroup
    .append("text")
    .attr("x", colorLegendX - 85)
    .attr("y", colorLegendY - 10)
    .style("font-family", "Roboto, sans-serif")
    .style("font-size", "12px")
    .style("font-weight", 700)
    .attr("fill", DORLING_THEME.text)
    .text(`${colorMetric.label} (couleur)`);

  legendGroup
    .append("rect")
    .attr("x", colorLegendX)
    .attr("y", colorLegendY)
    .attr("width", colorLegendWidth)
    .attr("height", colorLegendHeight)
    .attr("fill", `url(#${colorGradientId})`)
    .attr("stroke", DORLING_THEME.axis)
    .attr("stroke-width", 0.8);

  const colorLegendScale = d3
    .scaleLinear()
    .domain([colorMin, colorMax])
    .range([colorLegendY + colorLegendHeight, colorLegendY]);

  legendGroup
    .append("g")
    .attr("transform", `translate(${colorLegendX + colorLegendWidth}, 0)`)
    .call(
      d3
        .axisRight(colorLegendScale)
        .ticks(4)
        .tickFormat((d) => colorMetric.format(d)),
    )
    .call((g) =>
      g
        .selectAll("text")
        .attr("fill", DORLING_THEME.mutedText)
        .style("font-size", "11px")
        .style("font-family", "Roboto, sans-serif"),
    )
    .call((g) => g.selectAll("line").attr("stroke", "#7a6d5d"))
    .call((g) => g.select("path").attr("stroke", "#7a6d5d"));

  // If the composed map scene is larger than the viewport, scale it down as a whole.
  const sceneNode = sceneGroup.node();
  if (sceneNode) {
    const bbox = sceneNode.getBBox();
    if (bbox.width > 0 && bbox.height > 0) {
      const padding = 6;
      const scale = Math.min(
        1,
        (width - padding * 2) / bbox.width,
        (height - padding * 2) / bbox.height,
      );
      const tx = (width - bbox.width * scale) / 2 - bbox.x * scale;
      const ty = (height - bbox.height * scale) / 2 - bbox.y * scale;
      sceneGroup.attr("transform", `translate(${tx},${ty}) scale(${scale})`);
    }
  }
}

/**
 * Initializes the Dorling map and binds UI interactions.
 *
 * @returns {Promise<void>} Resolves when map initialization completes.
 */
export async function initDorlingMap() {
  const container = d3.select("#dorling-map");

  if (container.empty()) {
    return;
  }

  const [movies, world] = await Promise.all([
    d3.csv(MOVIES_DATA_URL, d3.autoType),
    d3.json(WORLD_GEOJSON_URL),
  ]);

  const stats = aggregateByCountry(movies);
  const defaultCountry = getTopCountry(stats, (d) => d.count);
  const defaultCountryKey = defaultCountry
    ? countryJoinKey(defaultCountry.country)
    : "";

  const factContainer = d3.select("#dorling-fact");
  if (!factContainer.empty()) {
    factContainer.text(buildFunFact(stats));
  }

  let activeColorMetricKey = "revenue";

  const render = () => {
    drawDorlingMap(
      container,
      world,
      stats,
      movies,
      defaultCountryKey,
      COLOR_METRICS[activeColorMetricKey] ? activeColorMetricKey : "revenue",
    );
  };

  const setMetric = (metricKey) => {
    if (!COLOR_METRICS[metricKey]) {
      return;
    }

    activeColorMetricKey = metricKey;
    render();
  };

  render();
  window.addEventListener("resize", render);

  return {setMetric};
}
