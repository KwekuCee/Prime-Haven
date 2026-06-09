import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';

export const SCENE_DURATIONS: Record<string, number> = {
  hero: 4500,
  services: 4500,
  stats: 4500,
  closing: 4500,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  hero: Scene1,
  services: Scene2,
  stats: Scene3,
  closing: Scene4,
};

const scenePos = [
  { x: '70vw', y: '60vh', scale: 3, opacity: 0.15 },
  { x: '10vw', y: '20vh', scale: 1.5, opacity: 0.1 },
  { x: '80vw', y: '15vh', scale: 2, opacity: 0.12 },
  { x: '40vw', y: '70vh', scale: 2.5, opacity: 0.08 },
];

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  const pos = scenePos[sceneIndex] ?? scenePos[0];

  return (
    <div className="w-full h-screen overflow-hidden relative bg-[#0a0f1e] text-white">
      {/* Persistent background: drifting gradient blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute rounded-full blur-3xl"
          style={{ width: '50vw', height: '50vh', background: 'radial-gradient(circle, #ff6b35, transparent)' }}
          animate={{ x: ['-10%', '40%', '10%'], y: ['5%', '40%', '20%'] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute rounded-full blur-3xl"
          style={{ width: '40vw', height: '40vh', background: 'radial-gradient(circle, #1a3a5c, transparent)', right: 0, bottom: 0 }}
          animate={{ x: ['0%', '-30%', '-10%'], y: ['0%', '-30%', '-15%'] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Persistent midground: orange orb that travels across scenes */}
      <motion.div
        className="absolute rounded-full blur-2xl pointer-events-none"
        style={{ width: '20vw', height: '20vw', background: '#ff6b35' }}
        animate={pos}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Persistent accent line */}
      <motion.div
        className="absolute h-[2px] bg-[#ff6b35] pointer-events-none"
        animate={{
          left: ['5%', '55%', '25%', '65%'][sceneIndex] ?? '5%',
          width: ['40%', '25%', '60%', '30%'][sceneIndex] ?? '40%',
          top: ['48%', '88%', '15%', '55%'][sceneIndex] ?? '48%',
          opacity: [0.8, 0.6, 0.9, 0.4][sceneIndex] ?? 0.8,
        }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Scene foreground content */}
      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>
    </div>
  );
}
