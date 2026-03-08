import { useState, useRef, useCallback, useEffect } from "react";
import { Pipette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdvancedColorPickerProps {
  currentColor: string;
  onColorSelect: (color: string) => void;
  onReset: () => void;
}

const PRESET_COLORS = [
  "#000000", "#434343", "#666666", "#999999", "#cccccc", "#ffffff",
  "#e03131", "#c2255c", "#9c36b5", "#6741d9", "#3b5bdb", "#1971c2",
  "#0c8599", "#099268", "#2f9e44", "#66a80f", "#f08c00", "#e8590c",
];

const MAX_RECENT = 8;
const RECENT_STORAGE_KEY = "md-editor-recent-colors";

function getRecentColors(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentColor(color: string) {
  const recent = getRecentColors().filter((c) => c !== color);
  recent.unshift(color);
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const AdvancedColorPicker = ({ currentColor, onColorSelect, onReset }: AdvancedColorPickerProps) => {
  const initColor = currentColor && currentColor !== "inherit" ? currentColor : "#000000";
  const initHsv = hexToHsv(initColor);

  const [hsv, setHsv] = useState(initHsv);
  const [hexInput, setHexInput] = useState(initColor);
  const [rgbInput, setRgbInput] = useState(hexToRgb(initColor));
  const [recentColors, setRecentColors] = useState<string[]>(getRecentColors());
  const [dragging, setDragging] = useState<"palette" | "hue" | null>(null);

  const paletteRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  // Sync hex/rgb inputs when hsv changes
  useEffect(() => {
    const hex = hsvToHex(hsv.h, hsv.s, hsv.v);
    setHexInput(hex);
    setRgbInput(hexToRgb(hex));
  }, [hsv]);

  const updateFromPalette = useCallback((clientX: number, clientY: number) => {
    const rect = paletteRef.current?.getBoundingClientRect();
    if (!rect) return;
    const s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    setHsv((prev) => ({ ...prev, s, v }));
  }, []);

  const updateFromHue = useCallback((clientX: number) => {
    const rect = hueRef.current?.getBoundingClientRect();
    if (!rect) return;
    const h = Math.max(0, Math.min(360, ((clientX - rect.left) / rect.width) * 360));
    setHsv((prev) => ({ ...prev, h }));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      e.preventDefault();
      if (dragging === "palette") updateFromPalette(e.clientX, e.clientY);
      else updateFromHue(e.clientX);
    };
    const handleUp = () => setDragging(null);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
  }, [dragging, updateFromPalette, updateFromHue]);

  // Touch support
  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (dragging === "palette") updateFromPalette(t.clientX, t.clientY);
      else updateFromHue(t.clientX);
    };
    const handleEnd = () => setDragging(null);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    return () => { window.removeEventListener("touchmove", handleMove); window.removeEventListener("touchend", handleEnd); };
  }, [dragging, updateFromPalette, updateFromHue]);

  const applyColor = (hex: string) => {
    saveRecentColor(hex);
    setRecentColors(getRecentColors());
    onColorSelect(hex);
  };

  const handleHexChange = (val: string) => {
    setHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      setHsv(hexToHsv(val));
      setRgbInput(hexToRgb(val));
    }
  };

  const handleRgbChange = (channel: "r" | "g" | "b", val: string) => {
    const num = parseInt(val) || 0;
    const newRgb = { ...rgbInput, [channel]: num };
    setRgbInput(newRgb);
    if (newRgb.r >= 0 && newRgb.r <= 255 && newRgb.g >= 0 && newRgb.g <= 255 && newRgb.b >= 0 && newRgb.b <= 255) {
      const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
      setHsv(hexToHsv(hex));
    }
  };

  const handleEyeDropper = async () => {
    try {
      // @ts-ignore - EyeDropper API
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      const hex = result.sRGBHex;
      setHsv(hexToHsv(hex));
      applyColor(hex);
    } catch {
      // User cancelled or unsupported
    }
  };

  const supportsEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;

  return (
    <div className="space-y-3 w-64">
      {/* Saturation/Value palette */}
      <div
        ref={paletteRef}
        className="relative w-full h-36 rounded-md cursor-crosshair select-none"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))`,
        }}
        onMouseDown={(e) => { setDragging("palette"); updateFromPalette(e.clientX, e.clientY); }}
        onTouchStart={(e) => { setDragging("palette"); updateFromPalette(e.touches[0].clientX, e.touches[0].clientY); }}
      >
        <div
          className="absolute w-3.5 h-3.5 rounded-full border-2 border-background shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            backgroundColor: currentHex,
          }}
        />
      </div>

      {/* Hue slider */}
      <div
        ref={hueRef}
        className="relative w-full h-3 rounded-full cursor-pointer select-none"
        style={{
          background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
        onMouseDown={(e) => { setDragging("hue"); updateFromHue(e.clientX); }}
        onTouchStart={(e) => { setDragging("hue"); updateFromHue(e.touches[0].clientX); }}
      >
        <div
          className="absolute w-3.5 h-3.5 rounded-full border-2 border-background shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none top-1/2"
          style={{
            left: `${(hsv.h / 360) * 100}%`,
            backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
          }}
        />
      </div>

      {/* Color preview + Eyedropper + Apply */}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-md border border-border shrink-0"
          style={{ backgroundColor: currentHex }}
        />
        <Input
          value={hexInput}
          onChange={(e) => handleHexChange(e.target.value)}
          className="h-8 text-xs font-mono flex-1"
          placeholder="#000000"
        />
        {supportsEyeDropper && (
          <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={handleEyeDropper} title="스포이드">
            <Pipette className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* RGB inputs */}
      <div className="flex gap-2">
        {(["r", "g", "b"] as const).map((ch) => (
          <div key={ch} className="flex-1 space-y-0.5">
            <Label className="text-[10px] uppercase text-muted-foreground">{ch}</Label>
            <Input
              type="number"
              min={0}
              max={255}
              value={rgbInput[ch]}
              onChange={(e) => handleRgbChange(ch, e.target.value)}
              className="h-7 text-xs font-mono px-1.5 text-center"
            />
          </div>
        ))}
      </div>

      {/* Preset colors */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-1.5">기본 색상</p>
        <div className="grid grid-cols-9 gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              className="w-5 h-5 rounded-sm border border-border hover:scale-125 transition-transform"
              style={{ backgroundColor: c }}
              onClick={() => { setHsv(hexToHsv(c)); applyColor(c); }}
            />
          ))}
        </div>
      </div>

      {/* Recent colors */}
      {recentColors.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5">최근 사용한 색상</p>
          <div className="flex gap-1 flex-wrap">
            {recentColors.map((c, i) => (
              <button
                key={`${c}-${i}`}
                className="w-5 h-5 rounded-sm border border-border hover:scale-125 transition-transform"
                style={{ backgroundColor: c }}
                onClick={() => { setHsv(hexToHsv(c)); applyColor(c); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={onReset}>
          초기화
        </Button>
        <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => applyColor(currentHex)}>
          적용
        </Button>
      </div>
    </div>
  );
};

export default AdvancedColorPicker;
