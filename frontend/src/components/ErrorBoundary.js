'use client';

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-white border-2 border-red-600 p-8 m-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl font-bold text-red-800 serif mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="bg-black text-[#fff1e0] px-6 py-2 font-bold text-sm uppercase tracking-wide hover:bg-gray-800 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
