import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../theme/colors';
import { type as typeScale } from '../theme/typography';

/**
 * Minimal markdown-ish renderer for the AI's interpretation prose:
 * headings, bold, bullet lists with ✦ markers, and blockquotes.
 * The web app streams similar markdown; we mirror its visual language.
 */
export function MarkdownText({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  return (
    <View>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed === '') return null;

        if (/^#{1,6}\s+/.test(trimmed)) {
          const content = trimmed.replace(/^#{1,6}\s+/, '');
          return (
            <Text key={i} style={[typeScale.headlineSm, { color: colors.indigo, marginTop: 10, marginBottom: 4 }]}>
              {content}
            </Text>
          );
        }

        if (/^\s*([-*•])\s+/.test(line)) {
          const content = line.replace(/^\s*([-*•])\s+/, '');
          return (
            <View key={i} style={{ flexDirection: 'row', marginBottom: 5, paddingLeft: 4 }}>
              <Text style={{ color: colors.gold, marginRight: 6, fontSize: 12 }}>✦</Text>
              <Text style={[typeScale.bodySm, { color: colors.ink, flex: 1 }]}>{boldSegments(content)}</Text>
            </View>
          );
        }

        if (/^>\s?/.test(trimmed)) {
          const content = trimmed.replace(/^>\s?/, '');
          return (
            <View
              key={i}
              style={{
                borderLeftWidth: 3,
                borderLeftColor: colors.gold,
                paddingLeft: 10,
                marginVertical: 6,
                backgroundColor: 'rgba(240,223,175,0.25)',
                borderRadius: 4,
                paddingVertical: 6,
              }}
            >
              <Text style={[typeScale.bodySm, { color: colors.ochre, fontStyle: 'italic' }]}>{boldSegments(content)}</Text>
            </View>
          );
        }

        if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) {
          return <View key={i} style={{ height: 1, backgroundColor: 'rgba(232,213,167,0.9)', marginVertical: 10 }} />;
        }

        return (
          <Text key={i} style={[typeScale.body, { color: colors.ink, marginBottom: 8 }]}>
            {boldSegments(line)}
          </Text>
        );
      })}
    </View>
  );
}

/** Renders **bold** segments inside a line. */
function boldSegments(line: string): React.ReactNode {
  return line.split('**').map((part, idx) =>
    idx % 2 === 1 ? (
      <Text key={idx} style={{ fontWeight: '700', color: colors.indigo }}>
        {part}
      </Text>
    ) : (
      part
    )
  );
}

/** Inline-render a chat message: headers in ✦, bullets, bold. */
export function ChatMarkdown({ text }: { text: string }) {
  return <MarkdownText text={text} />;
}
