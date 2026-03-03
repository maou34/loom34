import React from "react";

type Props = { children: React.ReactNode };
type State = { error: unknown };

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

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("UI crashed:", error);
    console.error("Component stack:", info.componentStack);
  }

  render() {
    if (this.state.error) {
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