import { useEffect, useMemo, useState } from "react";
import { createCoreEditorExtensions, editorPropsDefault } from "./editorConfigBase";

export const createEditorExtensions = (placeholder: string) =>
  createCoreEditorExtensions(placeholder);

export const useEditorExtensions = (
  placeholder: string,
  documentFeaturesEnabled: boolean,
  advancedBlocksEnabled: boolean,
) => {
  const coreExtensions = useMemo(() => createCoreEditorExtensions(placeholder), [placeholder]);
  const [documentExtensions, setDocumentExtensions] = useState<unknown[]>([]);
  const [advancedExtensions, setAdvancedExtensions] = useState<unknown[]>([]);

  useEffect(() => {
    let cancelled = false;

    if (!documentFeaturesEnabled) {
      setDocumentExtensions([]);
      return;
    }

    void import("./editorConfigDocument")
      .then(({ createDocumentEditorExtensions }) => {
        if (!cancelled) {
          setDocumentExtensions(createDocumentEditorExtensions());
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

    void import("./editorConfigAdvanced")
      .then(({ createAdvancedEditorExtensions }) => {
        if (!cancelled) {
          setAdvancedExtensions(createAdvancedEditorExtensions());
        }
      });

    return () => {
      cancelled = true;
    };
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
