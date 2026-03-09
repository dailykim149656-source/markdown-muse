import { useCallback, useEffect, useRef, useState } from "react";
import { Pipette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/useI18n";

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

const getRecentColors = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecentColor = (color: string) => {
  const recent = getRecentColors().filter((candidateColor) => candidateColor !== color);
  recent.unshift(color);
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
};

const hexToHsv = (hex: string): { h: number; s: number; v: number } => {
  const red = parseInt(hex.slice(1, 3), 16) / 255;
  const green = parseInt(hex.slice(3, 5), 16) / 255;
  const blue = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta + 6) % 6;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }

    hue *= 60;
  }

  const saturation = max === 0 ? 0 : delta / max;

  return { h: hue, s: saturation, v: max };
};

const hsvToHex = (hue: number, saturation: number, value: number): string => {
  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = value - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hue < 60) {
    red = chroma;
    green = x;
  } else if (hue < 120) {
    red = x;
    green = chroma;
  } else if (hue < 180) {
    green = chroma;
    blue = x;
  } else if (hue < 240) {
    green = x;
    blue = chroma;
  } else if (hue < 300) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const toHex = (channel: number) => Math.round((channel + match) * 255).toString(16).padStart(2, "0");
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
};

const hexToRgb = (hex: string) => ({
  b: parseInt(hex.slice(5, 7), 16),
  g: parseInt(hex.slice(3, 5), 16),
  r: parseInt(hex.slice(1, 3), 16),
});

const rgbToHex = (red: number, green: number, blue: number) => {
  const toHex = (channel: number) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0");
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
};

const AdvancedColorPicker = ({ currentColor, onColorSelect, onReset }: AdvancedColorPickerProps) => {
  const { t } = useI18n();
  const initialColor = currentColor && currentColor !== "inherit" ? currentColor : "#000000";
  const initialHsv = hexToHsv(initialColor);

  const [hsv, setHsv] = useState(initialHsv);
  const [hexInput, setHexInput] = useState(initialColor);
  const [rgbInput, setRgbInput] = useState(hexToRgb(initialColor));
  const [recentColors, setRecentColors] = useState<string[]>(getRecentColors());
  const [dragging, setDragging] = useState<"palette" | "hue" | null>(null);

  const paletteRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);

  useEffect(() => {
    const hex = hsvToHex(hsv.h, hsv.s, hsv.v);
    setHexInput(hex);
    setRgbInput(hexToRgb(hex));
  }, [hsv]);

  const updateFromPalette = useCallback((clientX: number, clientY: number) => {
    const rect = paletteRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const saturation = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const value = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    setHsv((prev) => ({ ...prev, s: saturation, v: value }));
  }, []);

  const updateFromHue = useCallback((clientX: number) => {
    const rect = hueRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const hue = Math.max(0, Math.min(360, ((clientX - rect.left) / rect.width) * 360));
    setHsv((prev) => ({ ...prev, h: hue }));
  }, []);

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const handleMove = (event: MouseEvent) => {
      event.preventDefault();

      if (dragging === "palette") {
        updateFromPalette(event.clientX, event.clientY);
      } else {
        updateFromHue(event.clientX);
      }
    };

    const handleUp = () => setDragging(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, updateFromHue, updateFromPalette]);

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const handleMove = (event: TouchEvent) => {
      event.preventDefault();
      const touch = event.touches[0];

      if (dragging === "palette") {
        updateFromPalette(touch.clientX, touch.clientY);
      } else {
        updateFromHue(touch.clientX);
      }
    };

    const handleEnd = () => setDragging(null);

    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [dragging, updateFromHue, updateFromPalette]);

  const applyColor = (hex: string) => {
    saveRecentColor(hex);
    setRecentColors(getRecentColors());
    onColorSelect(hex);
  };

  const handleHexChange = (value: string) => {
    setHexInput(value);

    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      setHsv(hexToHsv(value));
      setRgbInput(hexToRgb(value));
    }
  };

  const handleRgbChange = (channel: "r" | "g" | "b", value: string) => {
    const numericValue = parseInt(value, 10) || 0;
    const nextRgb = { ...rgbInput, [channel]: numericValue };
    setRgbInput(nextRgb);

    if (
      nextRgb.r >= 0 && nextRgb.r <= 255 &&
      nextRgb.g >= 0 && nextRgb.g <= 255 &&
      nextRgb.b >= 0 && nextRgb.b <= 255
    ) {
      setHsv(hexToHsv(rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b)));
    }
  };

  const handleEyeDropper = async () => {
    try {
      // @ts-expect-error EyeDropper API is not in the default TS DOM lib here.
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      const hex = result.sRGBHex;
      setHsv(hexToHsv(hex));
      applyColor(hex);
    } catch {
      return;
    }
  };

  const supportsEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;

  return (
    <div className="w-64 space-y-3">
      <div
        ref={paletteRef}
        className="relative h-36 w-full cursor-crosshair select-none rounded-md"
        onMouseDown={(event) => {
          setDragging("palette");
          updateFromPalette(event.clientX, event.clientY);
        }}
        onTouchStart={(event) => {
          setDragging("palette");
          updateFromPalette(event.touches[0].clientX, event.touches[0].clientY);
        }}
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))`,
        }}
      >
        <div
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-md"
          style={{
            backgroundColor: currentHex,
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
          }}
        />
      </div>

      <div
        ref={hueRef}
        className="relative h-3 w-full cursor-pointer select-none rounded-full"
        onMouseDown={(event) => {
          setDragging("hue");
          updateFromHue(event.clientX);
        }}
        onTouchStart={(event) => {
          setDragging("hue");
          updateFromHue(event.touches[0].clientX);
        }}
        style={{
          background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
      >
        <div
          className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-md"
          style={{
            backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
            left: `${(hsv.h / 360) * 100}%`,
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="h-8 w-8 shrink-0 rounded-md border border-border" style={{ backgroundColor: currentHex }} />
        <Input
          className="h-8 flex-1 font-mono text-xs"
          onChange={(event) => handleHexChange(event.target.value)}
          placeholder="#000000"
          value={hexInput}
        />
        {supportsEyeDropper && (
          <Button className="h-8 w-8 shrink-0 p-0" onClick={() => void handleEyeDropper()} size="sm" title={t("toolbar.color.eyedropper")} variant="outline">
            <Pipette className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {(["r", "g", "b"] as const).map((channel) => (
          <div key={channel} className="flex-1 space-y-0.5">
            <Label className="text-[10px] uppercase text-muted-foreground">{channel}</Label>
            <Input
              className="h-7 px-1.5 text-center font-mono text-xs"
              max={255}
              min={0}
              onChange={(event) => handleRgbChange(channel, event.target.value)}
              type="number"
              value={rgbInput[channel]}
            />
          </div>
        ))}
      </div>

      <div>
        <p className="mb-1.5 text-[10px] text-muted-foreground">{t("toolbar.color.presetColors")}</p>
        <div className="grid grid-cols-9 gap-1">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              className="h-5 w-5 rounded-sm border border-border transition-transform hover:scale-125"
              onClick={() => {
                setHsv(hexToHsv(color));
                applyColor(color);
              }}
              style={{ backgroundColor: color }}
              type="button"
            />
          ))}
        </div>
      </div>

      {recentColors.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] text-muted-foreground">{t("toolbar.color.recentColors")}</p>
          <div className="flex flex-wrap gap-1">
            {recentColors.map((color, index) => (
              <button
                key={`${color}-${index}`}
                className="h-5 w-5 rounded-sm border border-border transition-transform hover:scale-125"
                onClick={() => {
                  setHsv(hexToHsv(color));
                  applyColor(color);
                }}
                style={{ backgroundColor: color }}
                type="button"
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button className="h-7 flex-1 text-xs" onClick={onReset} size="sm" variant="outline">
          {t("toolbar.color.reset")}
        </Button>
        <Button className="h-7 flex-1 text-xs" onClick={() => applyColor(currentHex)} size="sm">
          {t("toolbar.color.apply")}
        </Button>
      </div>
    </div>
  );
};

export default AdvancedColorPicker;
