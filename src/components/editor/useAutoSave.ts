import { useEffect, useRef } from "react";

const STORAGE_KEY = "docsy-autosave";

export interface AutoSaveData {
  documents: DocumentData[];
  activeDocId: string;
  lastSaved: number;
}

export interface DocumentData {
  id: string;
  name: string;
  mode: "markdown" | "latex" | "html" | "json" | "yaml";
  content: string;
  createdAt: number;
  updatedAt: number;
}

export const createNewDocument = (name = "Untitled", mode: "markdown" | "latex" | "html" | "json" | "yaml" = "markdown"): DocumentData => ({
  id: crypto.randomUUID(),
  name,
  mode,
  content: "",
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const loadSavedData = (): AutoSaveData | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AutoSaveData;
  } catch {
    return null;
  }
};

export const saveData = (data: AutoSaveData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, lastSaved: Date.now() }));
  } catch {
    // storage full or unavailable
  }
};

export const useAutoSave = (data: AutoSaveData | null, intervalMs = 3000) => {
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!data) return;
    const timer = setInterval(() => {
      if (dataRef.current) saveData(dataRef.current);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, !!data]);
};
