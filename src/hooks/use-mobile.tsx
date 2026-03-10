import * as React from "react";

const MOBILE_BREAKPOINT = 768;
export const TABLET_BREAKPOINT = 1024;

export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => {
      setMatches(mql.matches);
    };

    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return !!matches;
}

export function useIsMobile() {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
}

export function useIsTabletLayout() {
  return useMediaQuery(`(max-width: ${TABLET_BREAKPOINT - 1}px)`);
}
