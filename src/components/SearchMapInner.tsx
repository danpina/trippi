"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { styleFor } from "@/lib/categoryStyle";

export type MapListing = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  price: number | null;
  location: string;
  topSlug: string | null;
};

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const STYLE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
  : undefined;

const CLUSTER_LAYERS = ["clusters", "cluster-count", "unclustered-point"];

function pinEl() {
  const el = document.createElement("div");
  el.innerHTML = `<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 0C5.8 0 0 5.8 0 13c0 9.5 13 21 13 21s13-11.5 13-21C26 5.8 20.2 0 13 0z" fill="#0E1A16"/>
    <circle cx="13" cy="13" r="5" fill="white"/>
  </svg>`;
  return el;
}

// Rough circle polygon in degrees — fine at the city/region radii this filter uses.
function circleGeoJSON(lat: number, lng: number, radiusKm: number, steps = 64): GeoJSON.Feature {
  const dx = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const dy = radiusKm / 110.574;
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    coords.push([lng + dx * Math.cos(t), lat + dy * Math.sin(t)]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } };
}

function listingsGeoJSON(listings: MapListing[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: listings.map((l) => ({
      type: "Feature",
      properties: {
        id: l.id,
        title: l.title,
        price: l.price,
        location: l.location,
        color: styleFor(l.topSlug).from,
      },
      geometry: { type: "Point", coordinates: [l.lng, l.lat] },
    })),
  };
}

export default function SearchMapInner({
  listings,
  center,
  picked,
  pickedLabel,
  radiusKm,
}: {
  listings: MapListing[];
  center: [number, number];
  picked: [number, number] | null;
  pickedLabel?: string | null;
  radiusKm: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const pickedMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [loaded, setLoaded] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const routerRef = useRef(router);
  const searchParamsRef = useRef(searchParams);
  routerRef.current = router;
  searchParamsRef.current = searchParams;

  // Init the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [center[1], center[0]],
      zoom: picked ? 11 : 4,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    // Click-to-filter, but only when the click didn't land on a cluster bubble or pin —
    // those have their own handlers registered below.
    map.on("click", (e) => {
      const hits = map.queryRenderedFeatures(e.point, { layers: CLUSTER_LAYERS.filter((id) => map.getLayer(id)) });
      if (hits.length > 0) return;
      const params = new URLSearchParams(searchParamsRef.current.toString());
      params.set("lat", e.lngLat.lat.toFixed(4));
      params.set("lng", e.lngLat.lng.toFixed(4));
      params.set("locationLabel", `${e.lngLat.lat.toFixed(2)}, ${e.lngLat.lng.toFixed(2)}`);
      if (!params.get("radius")) params.set("radius", "50");
      routerRef.current.push(`/search?${params.toString()}`);
    });

    map.on("load", () => {
      map.addSource("radius-circle", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "radius-fill",
        type: "fill",
        source: "radius-circle",
        paint: { "fill-color": "#FF5A36", "fill-opacity": 0.07 },
      });
      map.addLayer({
        id: "radius-line",
        type: "line",
        source: "radius-circle",
        paint: { "line-color": "#FF5A36", "line-width": 1.5 },
      });

      // Listings, clustered — the classic "bubble with a count" you get zoomed out,
      // which splits into individual pins as you zoom or click into it.
      map.addSource("listings", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "listings",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"], "#FF5A36", 10, "#F2B705", 50, "#0E1A16"],
          "circle-radius": ["step", ["get", "point_count"], 18, 10, 23, 50, 28],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "listings",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Noto Sans Bold"],
          "text-size": 13,
        },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "listings",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 8,
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.on("mouseenter", "clusters", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "clusters", () => (map.getCanvas().style.cursor = ""));
      map.on("mouseenter", "unclustered-point", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "unclustered-point", () => (map.getCanvas().style.cursor = ""));

      map.on("click", "clusters", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const clusterId = feature.properties?.cluster_id;
        const source = map.getSource("listings") as maplibregl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({ center: (feature.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
        });
      });

      map.on("click", "unclustered-point", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const { id, title, price, location } = feature.properties as any;
        new maplibregl.Popup({ offset: 12, closeButton: false })
          .setLngLat((feature.geometry as GeoJSON.Point).coordinates as [number, number])
          .setHTML(
            `<a href="/listings/${id}" style="font-weight:700;color:#0E1A16;text-decoration:none">${title}</a>
             <div style="font-size:12px;color:#5B6B63;margin-top:2px">${location}</div>
             <div style="font-size:13px;font-weight:700;margin-top:4px">${price ? `€${price}` : "Free"}</div>`
          )
          .addTo(map);
      });

      setLoaded(true);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push updated listing data into the clustered source.
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const source = mapRef.current.getSource("listings") as maplibregl.GeoJSONSource | undefined;
    source?.setData(listingsGeoJSON(listings));
  }, [loaded, listings]);

  // Picked point: marker + radius circle + fly-to.
  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const map = mapRef.current;

    pickedMarkerRef.current?.remove();
    pickedMarkerRef.current = null;

    const source = map.getSource("radius-circle") as maplibregl.GeoJSONSource | undefined;

    if (picked) {
      const [lat, lng] = picked;
      const marker = new maplibregl.Marker({ element: pinEl(), anchor: "bottom" }).setLngLat([lng, lat]);
      if (pickedLabel) marker.setPopup(new maplibregl.Popup({ offset: 28 }).setText(pickedLabel));
      marker.addTo(map);
      pickedMarkerRef.current = marker;

      source?.setData(radiusKm ? circleGeoJSON(lat, lng, radiusKm) : { type: "FeatureCollection", features: [] });

      map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 11), duration: 1100 });
    } else {
      source?.setData({ type: "FeatureCollection", features: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, picked?.[0], picked?.[1], radiusKm, pickedLabel]);

  if (!STYLE_URL) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-slate bg-line/40 p-6 text-center">
        Set NEXT_PUBLIC_MAPTILER_KEY in .env to enable the map.
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}
