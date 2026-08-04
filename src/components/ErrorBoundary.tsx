import React from "react";

type Props = { children: React.ReactNode };
type State = { error: unknown };

const CHUNK_RELOAD_FLAG = "loom-chunk-reload-attempted";

function formatUnknownError(err: unknown) {
  if (err instanceof Error) {
    return `${err.name}: ${err.message}\n${err.stack ?? ""}`.trim();
  }
  try {
    return JSON.stringify(err, null, 2);
  } catch {
    return String(err);
  }
}

function isStaleChunkError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return /dynamically imported module|Importing a module script failed|Failed to fetch dynamically imported module/i.test(
    message
  );
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("UI crashed:", error);
    console.error("Component stack:", info.componentStack);

    // Un nouveau déploiement a changé les noms des chunks JS : la page qu'on a
    // sous les yeux référence encore un ancien chunk. Un simple rechargement
    // récupère la dernière version. On ne le fait qu'une fois par session pour
    // éviter une boucle si l'erreur est en fait persistante (auquel cas on
    // retombe sur l'écran d'erreur normal, voir render()).
    if (isStaleChunkError(error) && !sessionStorage.getItem(CHUNK_RELOAD_FLAG)) {
      sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1");
      window.location.reload();
    }
  }

  render() {
    if (this.state.error) {
      // Premier échec de ce type dans la session : un rechargement va être
      // déclenché dans componentDidCatch (appelé juste après ce render). On
      // n'affiche rien plutôt que de flasher l'écran d'erreur juste avant la
      // navigation. Si l'erreur revient après ce rechargement, le flag est
      // déjà posé et on retombe sur l'écran d'erreur normal ci-dessous.
      if (isStaleChunkError(this.state.error) && !sessionStorage.getItem(CHUNK_RELOAD_FLAG)) {
        return null;
      }
      return (
        <div style={{ padding: 24, fontFamily: "system-ui" }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
            Une erreur est survenue dans l’interface
          </h1>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.4 }}>
            {formatUnknownError(this.state.error)}
          </pre>
          <p style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
            Ouvre la console (F12) → “UI crashed” + “Component stack” pour voir le composant exact.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}