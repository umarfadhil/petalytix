"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SimulatorProvider, useSimulator } from "@/components/ayakasir/simulator/context";
import type { SimCopy } from "@/components/ayakasir/simulator/i18n";
import PhoneFrame from "@/components/ayakasir/simulator/PhoneFrame";
import LoginScreen from "@/components/ayakasir/simulator/screens/LoginScreen";
import ScenarioPickerScreen from "@/components/ayakasir/simulator/screens/ScenarioPickerScreen";
import PosScreen from "@/components/ayakasir/simulator/screens/PosScreen";
import DashboardScreen from "@/components/ayakasir/simulator/screens/DashboardScreen";
import ProductsScreen from "@/components/ayakasir/simulator/screens/ProductsScreen";
import InventoryScreen from "@/components/ayakasir/simulator/screens/InventoryScreen";
import SettingsScreen from "@/components/ayakasir/simulator/screens/SettingsScreen";
import PurchasingScreen from "@/components/ayakasir/simulator/screens/PurchasingScreen";
import NavRail from "@/components/ayakasir/simulator/shared/NavRail";
import TopBar from "@/components/ayakasir/simulator/shared/TopBar";
import "./simulator.css";

type DeviceKey = "smartphone" | "tab10";

interface DevicePreset {
  key: DeviceKey;
  w: number;
  h: number;
}

const DEVICES: DevicePreset[] = [
  { key: "smartphone", w: 360, h: 640 },
  { key: "tab10", w: 800, h: 1280 },
];

function SimulatorContent() {
  const { state } = useSimulator();

  if (state.screen === "login") return <LoginScreen />;
  if (state.screen === "scenario") return <ScenarioPickerScreen />;

  return (
    <div className="sim-app">
      <TopBar />
      <div className="sim-app-body">
        {state.activeTab === "pos" && <PosScreen />}
        {state.activeTab === "dashboard" && <DashboardScreen />}
        {state.activeTab === "products" && <ProductsScreen />}
        {state.activeTab === "inventory" && <InventoryScreen />}
        {state.activeTab === "purchasing" && <PurchasingScreen />}
        {state.activeTab === "settings" && <SettingsScreen />}
      </div>
      <NavRail />
    </div>
  );
}

export default function SimulatorShell({
  locale,
  copy,
}: {
  locale: string;
  copy: SimCopy;
}) {
  const pageRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [deviceKey, setDeviceKey] = useState<DeviceKey>("tab10");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setDeviceKey("smartphone");
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const enterFullscreen = useCallback(() => {
    pageRef.current?.requestFullscreen().catch(() => {});
  }, []);

  const exitFullscreen = useCallback(() => {
    document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const preset = DEVICES.find((d) => d.key === deviceKey)!;

  return (
    <SimulatorProvider locale={locale} copy={copy}>
      <div ref={pageRef} className={`sim-page${isFullscreen ? " sim-page--fs" : ""}`}>
        {/* Normal controls bar — hidden in fullscreen */}
        <div className="sim-device-controls">
          {!isMobile && (
            <div className="sim-device-selector">
              {DEVICES.map((d) => (
                <button
                  key={d.key}
                  className={`sim-device-chip${deviceKey === d.key ? " active" : ""}`}
                  onClick={() => setDeviceKey(d.key)}
                >
                  {copy.device[d.key]}
                </button>
              ))}
            </div>
          )}
          <button
            className="sim-fullscreen-btn"
            onClick={enterFullscreen}
            title={copy.device.fullscreen}
          >
            ⛶
          </button>
        </div>

        <PhoneFrame width={preset.w} height={preset.h}>
          <SimulatorContent />
        </PhoneFrame>

        {/* Exit button — only visible in fullscreen, floats over the frame */}
        {isFullscreen && (
          <button
            className="sim-exit-fs-btn"
            onClick={exitFullscreen}
            title={copy.device.exitFullscreen}
          >
            ✕ {copy.device.exitFullscreen}
          </button>
        )}
      </div>
    </SimulatorProvider>
  );
}
