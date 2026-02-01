import { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { createChatTheme } from '@theme/chat';
import { useTheme, type Theme } from '@theme';

type InlineToken = { type: 'text' | 'bold' | 'italic'; value: string };

type RenderBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

// Remove ASCII control characters to avoid rendering artifacts.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = new RegExp('[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]', 'g');
const BULLET_PREFIXES = ['- ', '• ', '* '];
const COLLAPSE_LINE_THRESHOLD = 10;

const sanitize = (value: string) => value.replace(CONTROL_CHARS_REGEX, '').trim();

const tokenizeInline = (text: string): InlineToken[] => {
  const tokens: InlineToken[] = [];
  if (!text) {
    return tokens;
  }
  const regex = /(\*\*[^*]+\*\*|_[^_]+_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith('**') && raw.endsWith('**')) {
      tokens.push({ type: 'bold', value: raw.slice(2, -2) });
    } else if (raw.startsWith('_') && raw.endsWith('_')) {
      tokens.push({ type: 'italic', value: raw.slice(1, -1) });
    } else {
      tokens.push({ type: 'text', value: raw });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return tokens;
};

const isHeading = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.startsWith('#')) {
    return true;
  }
  const alpha = trimmed.replace(/[^A-Za-z]/g, '');
  return alpha.length > 3 && trimmed === trimmed.toUpperCase();
};

const toBlocks = (text: string): RenderBlock[] => {
  const cleaned = sanitize(text);
  if (!cleaned) {
    return [];
  }
  const paragraphs = cleaned.split(/\n{2,}/);
  const blocks: RenderBlock[] = [];

  paragraphs.forEach((paragraph) => {
    const lines = paragraph
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      return;
    }
    if (lines.length === 1 && isHeading(lines[0])) {
      const heading = lines[0].replace(/^#+\s*/, '');
      blocks.push({ type: 'heading', text: heading });
      return;
    }
    const isBulletList = lines.every((line) =>
      BULLET_PREFIXES.some((prefix) => line.startsWith(prefix)),
    );
    if (isBulletList) {
      const items = lines.map((line) => line.replace(/^(-|\*|•)\s*/, '').trim());
      blocks.push({ type: 'list', items });
      return;
    }
    blocks.push({ type: 'paragraph', text: lines.join(' ') });
  });

  return blocks;
};

type Props = {
  text: string;
  collapsibleLines?: number;
};

export function MentorMessageContent({ text, collapsibleLines }: Props) {
  const { theme } = useTheme();
  const chatTheme = useMemo(() => createChatTheme(theme), [theme]);
  const styles = useMemo(() => createStyles(theme, chatTheme), [theme, chatTheme]);
  const [collapsed, setCollapsed] = useState(true);
  const safeText = sanitize(text);
  const lineLimit = collapsibleLines ?? COLLAPSE_LINE_THRESHOLD;

  const { blocks, isCollapsible } = useMemo(() => {
    const lines = safeText.split(/\r?\n/);
    const shouldCollapse = lines.length > lineLimit;
    const displayText =
      shouldCollapse && collapsed ? lines.slice(0, lineLimit).join('\n') : safeText;
    return { blocks: toBlocks(displayText), isCollapsible: shouldCollapse };
  }, [collapsed, lineLimit, safeText]);

  if (!safeText) {
    return <Text style={styles.paragraph}>No mentor message yet.</Text>;
  }

  return (
    <View style={styles.container}>
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          return (
            <Text key={`heading-${idx}`} style={styles.heading}>
              {renderInline(block.text, styles)}
            </Text>
          );
        }
        if (block.type === 'list') {
          return (
            <View key={`list-${idx}`} style={styles.list}>
              {block.items.map((item, itemIdx) => (
                <View style={styles.listItem} key={`item-${itemIdx}`}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.listItemText}>{renderInline(item, styles)}</Text>
                </View>
              ))}
            </View>
          );
        }
        return (
          <Text key={`paragraph-${idx}`} style={styles.paragraph}>
            {renderInline(block.text, styles)}
          </Text>
        );
      })}

      {isCollapsible ? (
        <TouchableOpacity
          onPress={() => setCollapsed((current) => !current)}
          style={styles.toggle}
        >
          <Text style={styles.toggleText}>{collapsed ? 'Show more' : 'Show less'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const renderInline = (
  text: string,
  styles: ReturnType<typeof createStyles>,
) => {
  const tokens = tokenizeInline(text);
  if (tokens.length === 0) {
    return text;
  }
  return tokens.map((token, index) => {
    if (token.type === 'bold') {
      return (
        <Text key={index} style={styles.bold}>
          {token.value}
        </Text>
      );
    }
    if (token.type === 'italic') {
      return (
        <Text key={index} style={styles.italic}>
          {token.value}
        </Text>
      );
    }
    return <Text key={index}>{token.value}</Text>;
  });
};

const createStyles = (theme: Theme, chatTheme: ReturnType<typeof createChatTheme>) =>
  StyleSheet.create({
  container: {
    gap: chatTheme.spacing.sm,
  },
  heading: {
    color: chatTheme.bubble.mentor.text,
    ...chatTheme.typography.heading,
  },
  paragraph: {
    color: chatTheme.bubble.mentor.text,
    ...chatTheme.typography.body,
  },
  list: {
    gap: 6,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    color: chatTheme.bubble.mentor.text,
    ...chatTheme.typography.body,
    lineHeight: chatTheme.typography.body.lineHeight,
  },
  listItemText: {
    flex: 1,
    color: chatTheme.bubble.mentor.text,
    ...chatTheme.typography.body,
  },
  bold: {
    fontWeight: '700',
    color: chatTheme.bubble.mentor.text,
  },
  italic: {
    fontStyle: 'italic',
    color: chatTheme.bubble.mentor.text,
  },
  toggle: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  toggleText: {
    color: theme.palette.azure,
    fontWeight: '600',
  },
  });
