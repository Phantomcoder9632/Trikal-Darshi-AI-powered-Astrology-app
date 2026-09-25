import { Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/typography';

/**
 * The website `.lp-wordmark`: two stacked serif lines in the gold palette.
 *
 * NOTE: previously this used MaskedView + LinearGradient (gradient-filled
 * text). On Android release builds the MaskedView native mount silently
 * failed and took every sibling rendered after it with it — the login form
 * below the wordmark never appeared ("white screen"). Plain gold serif text
 * renders identically at these sizes and mounts reliably.
 */
function WordmarkLine({ text, color }: { text: string; color: string }) {
  return (
    <Text
      style={{
        fontFamily: fontFamilies.serif,
        fontSize: 34,
        fontWeight: '700',
        letterSpacing: 1.8,
        lineHeight: 40,
        color,
        textAlign: 'center',
      }}
    >
      {text}
    </Text>
  );
}

export default function GradientWordmark({ scale = 1 }: { scale?: number }) {
  return (
    <View style={{ alignItems: 'center', transform: [{ scale }] }}>
      <WordmarkLine text="TRIKAL" color={colors.goldDeep} />
      <WordmarkLine text="DARSHI" color={colors.gold} />
    </View>
  );
}
