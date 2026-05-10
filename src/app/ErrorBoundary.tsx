import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors anywhere below it so a single broken screen (lazy
 * chunk failure, undefined-global ReferenceError, etc.) doesn't unmount the
 * whole React tree and leave a black void.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[error-boundary]", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-12">
        <div className="max-w-[560px]">
          <div className="caption text-destructive/80">что-то сломалось</div>
          <h1 className="mt-4 font-display text-[40px] leading-[1.05] tracking-[-0.02em]">
            не удалось отрисовать экран.
          </h1>
          <pre className="mt-6 max-w-full overflow-x-auto rounded-md border border-border/40 bg-surface-2/40 p-4 font-mono text-[12px] text-destructive">
            {this.state.error.message}
          </pre>
          <p className="mt-6 font-display text-[14px] italic text-muted-foreground">
            это не должно случаться. если повторяется — перезапусти приложение
            или сбрось БД через настройки.
          </p>
          <div className="mt-8 flex gap-6">
            <button
              type="button"
              onClick={this.reset}
              className="rounded-md bg-accent px-5 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-accent-foreground hover:bg-accent/90"
            >
              попробовать снова
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              перезагрузить
            </button>
          </div>
        </div>
      </div>
    );
  }
}
