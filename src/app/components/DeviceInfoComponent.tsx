"use client";

import { useEffect, useState } from "react";

interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screenWidth: number;
  screenHeight: number;
  windowWidth: number;
  windowHeight: number;
  cookiesEnabled: boolean;
  online: boolean;
  gpu?: string;
}

export default function DeviceInfoComponent() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  useEffect(() => {
    // Get GPU info if available
    let gpu: string | undefined;
    try {
      const canvas = document.createElement("canvas");
      const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
      if (gl) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        gpu = debugInfo
          ? gl.getParameter(
              (debugInfo as WEBGL_debug_renderer_info).UNMASKED_RENDERER_WEBGL
            )
          : "Unknown";
      }
    } catch (e) {
      gpu = "Unknown";
    }

    setDeviceInfo({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      cookiesEnabled: navigator.cookieEnabled,
      online: navigator.onLine,
      gpu,
    });
  }, []);

  if (!deviceInfo) {
    return <p className="text-gray-500 text-center mt-4">Loading device info...</p>;
  }

  return (
    <div className="max-w-xl mx-auto mt-6 p-4 border rounded-lg shadow-sm bg-gray-50">
      <h2 className="text-xl font-bold mb-4 text-center">Your Device Information</h2>
      <ul className="space-y-2">
        <li><strong>User Agent:</strong> {deviceInfo.userAgent}</li>
        <li><strong>Platform:</strong> {deviceInfo.platform}</li>
        <li><strong>Language:</strong> {deviceInfo.language}</li>
        <li><strong>Screen:</strong> {deviceInfo.screenWidth} x {deviceInfo.screenHeight}</li>
        <li><strong>Window:</strong> {deviceInfo.windowWidth} x {deviceInfo.windowHeight}</li>
        <li><strong>Cookies Enabled:</strong> {deviceInfo.cookiesEnabled ? "Yes" : "No"}</li>
        <li><strong>Online:</strong> {deviceInfo.online ? "Yes" : "No"}</li>
        {deviceInfo.gpu && <li><strong>GPU:</strong> {deviceInfo.gpu}</li>}
      </ul>
    </div>
  );
}
