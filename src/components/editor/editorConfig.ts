import type { Extensions } from "@tiptap/core";
import { useEffect, useMemo, useState } from "react";
import { createCoreEditorExtensions, editorPropsDefault } from "./editorConfigBase";

export const createEditorExtensions = (placeholder?: string | null) =>
  createCoreEditorExtensions(placeholder);

let createDocumentExtensionsFactory: (() => Extensions) | null = null;
let documentExtensionsFactoryPromise: Promise<(() => Extensions)> | null = null;
let createAdvancedExtensionsFactory: (() => Extensions) | null = null;
let advancedExtensionsFactoryPromise: Promise<(() => Extensions)> | null = null;

const loadDocumentExtensionsFactory = async () => {
  if (createDocumentExtensionsFactory) {
    return createDocumentExtensionsFactory;
  }

  if (!documentExtensionsFactoryPromise) {
    documentExtensionsFactoryPromise = import("./editorConfigDocument")
      .then(({ createDocumentEditorExtensions }) => {
        createDocumentExtensionsFactory = createDocumentEditorExtensions;
        return createDocumentEditorExtensions;
      });
  }

  return documentExtensionsFactoryPromise;
};

const loadAdvancedExtensionsFactory = async () => {
  if (createAdvancedExtensionsFactory) {
    return createAdvancedExtensionsFactory;
  }

  if (!advancedExtensionsFactoryPromise) {
    advancedExtensionsFactoryPromise = import("./editorConfigAdvanced")
      .then(({ createAdvancedEditorExtensions }) => {
        createAdvancedExtensionsFactory = createAdvancedEditorExtensions;
        return createAdvancedEditorExtensions;
      });
  }

  return advancedExtensionsFactoryPromise;
};

export const useEditorExtensions = (
  placeholder: string | null | undefined,
  documentFeaturesEnabled: boolean,
  advancedBlocksEnabled: boolean,
  ) => {
  const coreExtensions = useMemo<Extensions>(() => createCoreEditorExtensions(placeholder), [placeholder]);
  const [documentExtensions, setDocumentExtensions] = useState<Extensions>(() =>
    documentFeaturesEnabled && createDocumentExtensionsFactory
      ? createDocumentExtensionsFactory()
      : []);
  const [advancedExtensions, setAdvancedExtensions] = useState<Extensions>(() =>
    advancedBlocksEnabled && createAdvancedExtensionsFactory
      ? createAdvancedExtensionsFactory()
      : []);

  useEffect(() => {
    let cancelled = false;

    if (!documentFeaturesEnabled) {
      setDocumentExtensions([]);
      return;
    }

    if (createDocumentExtensionsFactory) {
      setDocumentExtensions(createDocumentExtensionsFactory());
      return;
    }

    void loadDocumentExtensionsFactory()
      .then((factory) => {
        if (!cancelled) {
          setDocumentExtensions(factory());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [documentFeaturesEnabled]);

  useEffect(() => {
    let cancelled = false;

    if (!advancedBlocksEnabled) {
      setAdvancedExtensions([]);
      return;
    }

    if (createAdvancedExtensionsFactory) {
      setAdvancedExtensions(createAdvancedExtensionsFactory());
      return;
    }

    void loadAdvancedExtensionsFactory()
      .then((factory) => {
        if (!cancelled) {
          setAdvancedExtensions(factory());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [advancedBlocksEnabled]);

  const extensions = useMemo<Extensions>(() => [
    ...coreExtensions,
    ...(documentFeaturesEnabled ? documentExtensions : []),
    ...(advancedBlocksEnabled ? advancedExtensions : []),
  ], [advancedBlocksEnabled, coreExtensions, documentFeaturesEnabled, advancedExtensions, documentExtensions]);

  return {
    editorPropsDefault,
    coreExtensions,
    extensions,
    extensionsReady: (!documentFeaturesEnabled || documentExtensions.length > 0)
      && (!advancedBlocksEnabled || advancedExtensions.length > 0),
  };
};

export { editorPropsDefault };
