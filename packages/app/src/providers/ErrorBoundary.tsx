import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@heroui/react';

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
  retryLabel?: string;
};

type State = {
  hasError: boolean;
};

/**
 * 全局错误边界。文案由调用方传入（避免 class 组件内直接依赖 hooks）。
 * App 根使用 i18n 键注入。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-xl font-semibold">
          {this.props.fallbackTitle ?? 'Something went wrong'}
        </h1>
        <Button variant="primary" onPress={this.handleRetry}>
          {this.props.retryLabel ?? 'Retry'}
        </Button>
      </div>
    );
  }
}
