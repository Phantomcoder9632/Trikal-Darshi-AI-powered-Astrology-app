import React, { useEffect } from 'react';
import { Platform, Image, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

/**
 * The Sri Yantra intro video (bundled from the brand film, audio stripped),
 * played back with the official expo-video player on Native, and HTML5 video on Web.
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
  /** Explicit height or percentage — defaults to 100% for full screen containers. */
  height?: DimensionValue;
  loop?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  if (Platform.OS === 'web') {
    const videoUri = typeof SOURCE === 'string' ? SOURCE : (Image.resolveAssetSource(SOURCE)?.uri || SOURCE);
    return (
      <video
        src={videoUri}
        autoPlay
        loop={loop}
        muted
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          border: 'none',
          backgroundColor: 'transparent',
        } as any}
      />
    );
  }

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
      style={[{ width: '100%', height: height ?? '100%', backgroundColor: 'transparent' }, style]}
      contentFit="cover"
      nativeControls={false}
    />
  );
}
