"use client";

import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scoreToColor, type ProvinceStats } from "../lib/provinceSimulation";

const GEO_URL = "/turkey.json";

const PROJECTION_CONFIG = {
  rotate: [-35, -38.5, 0] as [number, number, number],
  scale: 3200,
};

interface Props {
  provinceStats: ProvinceStats[];
  selectedId: string | null;
  onSelect: (id: string, name: string) => void;
}

export default function TurkeyMap({ provinceStats, selectedId, onSelect }: Props) {
  const statsByName: Record<string, ProvinceStats> = {};
  for (const s of provinceStats) statsByName[s.name] = s;

  function findStats(geoName: string): ProvinceStats | undefined {
    if (statsByName[geoName]) return statsByName[geoName];
    return provinceStats.find(s =>
      s.name.startsWith(geoName) ||
      geoName.startsWith(s.name) ||
      geoName.replace("ı","i").toLowerCase() === s.name.replace("ı","i").toLowerCase()
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: "#020b18" }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={PROJECTION_CONFIG}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => {
              const name: string = geo.properties?.name ?? geo.properties?.NAME ?? "";
              const stats = findStats(name);
              const isSelected = stats ? stats.id === selectedId : false;
              const fill = stats ? scoreToColor(stats.score) : "#0d1f36";

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={() => {
                    if (stats) onSelect(stats.id, stats.name);
                  }}
                  style={{
                    default: {
                      fill,
                      stroke: isSelected ? "#facc15" : "#0a1628",
                      strokeWidth: isSelected ? 2 : 0.5,
                      filter: isSelected ? "brightness(1.4)" : "none",
                      outline: "none",
                      cursor: "pointer",
                      transition: "fill 0.3s",
                    },
                    hover: {
                      fill,
                      stroke: "#facc15",
                      strokeWidth: 1.5,
                      filter: "brightness(1.3)",
                      outline: "none",
                      cursor: "pointer",
                    },
                    pressed: {
                      fill,
                      stroke: "#facc15",
                      strokeWidth: 2,
                      outline: "none",
                    },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}
