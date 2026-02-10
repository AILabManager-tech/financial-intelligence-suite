import { Component } from "react";
import { AlertTriangle } from "lucide-react";

export default class ChartErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-surface-800 border border-white/5 text-slate-500">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs">Graphique temporairement indisponible</span>
        </div>
      );
    }
    return this.props.children;
  }
}
