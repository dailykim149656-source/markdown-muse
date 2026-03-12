import { useEffect, useMemo, useState } from "react";
import { createCoreEditorExtensions, editorPropsDefault } from "./editorConfigBase";
import { createAdvancedEditorExtensions } from "./editorConfigAdvanced";

export const createEditorExtensions = (placeholder: string) =>
  createCoreEditorExtensions(placeholder);

let createDocumentExtensionsFactory: (() => unknown[]) | null = null;
const createAdvancedExtensionsFactory: (() => unknown[]) | null = createAdvancedEditorExtensions;
let documentExtensionsFactoryPromise: Promise<(() => unknown[])> | null = null;

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

export const useEditorExtensions = (
  placeholder: string,
  documentFeaturesEnabled: boolean,
  advancedBlocksEnabled: boolean,
) => {
  const coreExtensions = useMemo(() => createCoreEditorExtensions(placeholder), [placeholder]);
  const [documentExtensions, setDocumentExtensions] = useState<unknown[]>(() =>
    documentFeaturesEnabled && createDocumentExtensionsFactory
      ? createDocumentExtensionsFactory()
      : []);
  const [advancedExtensions, setAdvancedExtensions] = useState<unknown[]>(() =>
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
    if (!advancedBlocksEnabled) {
      setAdvancedExtensions([]);
      return;
    }

    setAdvancedExtensions(createAdvancedExtensionsFactory ? createAdvancedExtensionsFactory() : []);
  }, [advancedBlocksEnabled]);

  const extensions = useMemo(() => [
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
