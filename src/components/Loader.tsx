import React from 'react';
import { motion } from 'motion/react';

export const Loader = () => {
  return (
    <div id="loader" className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050505]">
      <div className="relative h-24 w-24">
        {/* Outer 3D ring */}
        <motion.div
          animate={{
            rotateX: [0, 360],
            rotateY: [0, 360],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-full border-2 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
        />
        
        {/* Inner 3D ring */}
        <motion.div
          animate={{
            rotateX: [360, 0],
            rotateY: [360, 0],
            scale: [1, 0.8, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-2 rounded-full border-2 border-emerald-400/50 shadow-[0_0_15px_rgba(52,211,153,0.3)]"
        />
        
        {/* Core glow */}
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-8 rounded-full bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.8)]"
        />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center"
      >
        <h2 className="font-mono text-sm tracking-[0.3em] text-emerald-500 uppercase">
          Initializing Intelligence
        </h2>
        <div className="mt-2 h-1 w-48 overflow-hidden rounded-full bg-emerald-900/30">
          <motion.div
            animate={{
              x: [-200, 200],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
            className="h-full w-1/2 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]"
          />
        </div>
      </motion.div>
    </div>
  );
};
