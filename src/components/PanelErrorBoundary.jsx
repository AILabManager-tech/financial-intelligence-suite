import { Component } from "react";
import { AlertTriangle } from "lucide-react";

// Generic per-panel error boundary. Each feature panel mounted by LayoutSurface
// is wrapped in one so that a render-time throw in a single panel (e.g. a
// formatter edge case) degrades to a contained fallback instead of unmounting
// the whole asset card / dashboard.
//
// `resetKey` lets the caller clear a caught error when the panel's context
// changes (e.g. the selected symbol): React keeps an error boundary in its
// failed state until remounted, so without this a one-off crash would stick
// across symbol switches. Default undefined → behaves like a plain boundary.
export default class PanelErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex items-center gap-2 p-4 rounded-xl bg-surface-800 border border-white/5 text-slate-500 mt-4"
          role="region"
          aria-label="Panneau indisponible"
        >
          <AlertTriangle className="w-4 h-4" aria-hidden="true" />
          <span className="text-xs">Ce panneau est temporairement indisponible.</span>
        </div>
      );
    }
    return this.props.children;
  }
}
