'use client';

import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useAppStore();

  return (
    <main
      className={cn(
        'min-h-screen bg-zinc-950 pt-16 transition-all duration-300',
        sidebarOpen ? 'pl-64' : 'pl-16'
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
        className="p-6"
      >
        {children}
      </motion.div>
    </main>
  );
}
