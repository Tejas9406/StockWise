import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

export const PlotlyChart = ({
  data = [],
  layout = {},
  config = {},
  style = { width: '100%', height: '360px' },
  className = '',
  loading = false,
  emptyMessage = 'No chart data available',
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || loading || !data || data.length === 0) return;

    const defaultLayout = {
      autosize: true,
      margin: { l: 45, r: 25, t: 35, b: 40 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: {
        family: 'Inter, system-ui, -apple-system, sans-serif',
        size: 12,
        color: '#64748b',
      },
      hovermode: 'closest',
      hoverlabel: {
        bgcolor: '#0f172a',
        bordercolor: '#334155',
        font: { color: '#f8fafc', family: 'Inter, sans-serif' },
      },
      xaxis: {
        gridcolor: 'rgba(226, 232, 240, 0.6)',
        linecolor: 'rgba(203, 213, 225, 0.8)',
        zerolinecolor: 'rgba(203, 213, 225, 0.8)',
      },
      yaxis: {
        gridcolor: 'rgba(226, 232, 240, 0.6)',
        linecolor: 'rgba(203, 213, 225, 0.8)',
        zerolinecolor: 'rgba(203, 213, 225, 0.8)',
      },
      ...layout,
    };

    const defaultConfig = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      ...config,
    };

    Plotly.react(containerRef.current, data, defaultLayout, defaultConfig);

    const handleResize = () => {
      if (containerRef.current) {
        Plotly.Plots.resize(containerRef.current);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        Plotly.purge(containerRef.current);
      }
    };
  }, [data, layout, config, loading]);

  if (loading) {
    return (
      <div
        style={style}
        className={`flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 ${className}`}
      >
        <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium text-slate-500">Rendering interactive Plotly visualization...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        style={style}
        className={`flex items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 ${className}`}
      >
        <p className="text-sm text-slate-400 font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return <div ref={containerRef} style={style} className={className} />;
};

export default PlotlyChart;
