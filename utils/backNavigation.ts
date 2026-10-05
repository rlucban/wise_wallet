// utils/backNavigation.ts (SPEC-42 D-01 — DEC-01a helper, DEC-02 fallback)
//
// Empty-history-safe back navigation. expo-router emits an unhandled GO_BACK
// dev warning when router.back() is dispatched with nothing to pop (web
// refresh landing directly on a sub-screen: no history, BackAction everywhere).
// Every Back site MUST route through safeGoBack instead of calling
// router.back() directly (CON-01, CON-06).
//
// Pure module by design: zero react-native / expo-router imports, so it stays
// safe for the jest node env (roots: utils), Expo Go import time, and web
// export. The expo-router Router object satisfies BackCapableRouter
// structurally — no adapter needed at call sites.

/** Minimal router surface safeGoBack needs. */
export interface BackCapableRouter {
    back: () => void;
    canGoBack: () => boolean;
    replace: (href: string) => void;
}

/** DEC-02 fallback: app root (precedent: app/_layout.tsx:202). */
export const BACK_FALLBACK = "/";

export function safeGoBack(router: BackCapableRouter, fallback: string = BACK_FALLBACK): void {
    if (router.canGoBack()) {
        router.back();
        return;
    }
    router.replace(fallback);
}
