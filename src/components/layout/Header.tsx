/**
 * Header Component
 * Navigation and branding
 */

// Header Component
import { Brain } from 'lucide-react';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  return (
    <header className={`fixed top-0 left-0 right-0 z-50 glass border-b border-white/5 ${className}`}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00d4aa] to-[#00b894] rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-black" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight">KAST</span>
              <span className="text-[#00d4aa] text-sm ml-2 font-mono">NEURAL</span>
            </div>
          </div>

          {/* Tagline */}
          <div className="hidden md:block text-sm text-gray-500">
            Risk-Aware Decision Intelligence
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#00d4aa] rounded-full animate-pulse" />
            <span className="text-sm text-gray-400">System Online</span>
          </div>
        </div>
      </div>
    </header>
  );
}
