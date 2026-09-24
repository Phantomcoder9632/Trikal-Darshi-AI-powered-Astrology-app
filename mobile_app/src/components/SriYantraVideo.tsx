import React, { useEffect } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

/**
 * The Sri Yantra intro video (bundled from the brand film, audio stripped),
 * played back with the official expo-video player.
 *
 * - `loop` true for loading screens (Dashboard/Today/Profile).
 * - `loop` false on the splash so it plays through exactly once.
 * - nativeControls stay off; it's a loader, not a player UI.
 */
const SOURCE = require('../../assets/sri_yantra_intro.mp4');

export default function SriYantraVideo({
  height,
  loop = true,
  style,
}: {
  /** Explicit pixel height — Android needs a bounded box for video. */
  height: number;
  loop?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const player = useVideoPlayer(SOURCE, (p) => {
    p.loop = loop;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    // Re-assert play state if the OS pauses us (backgrounding etc.)
    const sub = player.addListener('statusChange', (status) => {
      if (status.status === 'idle' && loop) player.play();
    });
    return () => sub.remove();
  }, [player, loop]);

  return (
    <VideoView
      player={player}
      style={[{ width: '100%', height, backgroundColor: 'transparent' }, style]}
      contentFit="cover"
      nativeControls={false}
    />
  );
}
