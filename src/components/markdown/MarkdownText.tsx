import { useCallback } from 'react';
import { Linking, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';

import { palette } from '../../theme/colors';
import { typography } from '../../theme/typography';

type Props = {
  children: string;
};

export function MarkdownText({ children }: Props) {
  const handleLinkPress = useCallback((url: string) => {
    if (!url) {
      return false;
    }
    Linking.openURL(url).catch((error) => {
      console.warn('MarkdownText: failed to open link', error);
    });
    return true;
  }, []);

  return (
    <Markdown style={markdownStyles} onLinkPress={handleLinkPress}>
      {children || ''}
    </Markdown>
  );
}

const markdownStyles = StyleSheet.create({
  body: {
    ...typography.body,
    color: palette.pearl,
    fontSize: 15,
    lineHeight: 22,
  },
  paragraph: {
    marginBottom: 10,
  },
  text: {
    color: palette.pearl,
  },
  heading1: {
    ...typography.title,
    color: palette.pearl,
    marginTop: 12,
    marginBottom: 8,
  },
  heading2: {
    ...typography.subtitle,
    color: palette.pearl,
    marginTop: 10,
    marginBottom: 6,
  },
  heading3: {
    ...typography.subtitle,
    fontSize: 18,
    color: palette.pearl,
    marginTop: 8,
    marginBottom: 6,
  },
  heading4: {
    ...typography.subtitle,
    fontSize: 16,
    color: palette.pearl,
    marginTop: 6,
    marginBottom: 4,
  },
  heading5: {
    ...typography.subtitle,
    fontSize: 15,
    color: palette.pearl,
    marginTop: 4,
    marginBottom: 4,
  },
  heading6: {
    ...typography.subtitle,
    fontSize: 14,
    color: palette.silver,
    marginTop: 4,
    marginBottom: 4,
  },
  strong: {
    fontWeight: '700',
    color: palette.pearl,
  },
  em: {
    fontStyle: 'italic',
    color: palette.pearl,
  },
  link: {
    color: palette.glow,
    fontWeight: '600',
  },
  hr: {
    borderBottomColor: 'rgba(148,163,184,0.35)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  blockquote: {
    borderLeftColor: palette.azure,
    borderLeftWidth: 3,
    paddingLeft: 12,
    color: palette.platinum,
    backgroundColor: 'rgba(14,165,233,0.05)',
    borderRadius: 12,
    marginVertical: 10,
  },
  bullet_list_icon: {
    color: palette.glow,
  },
  bullet_list: {
    paddingLeft: 6,
  },
  ordered_list: {
    paddingLeft: 6,
  },
  list_item: {
    marginBottom: 4,
  },
  list_item_text: {
    color: palette.pearl,
  },
  code_inline: {
    backgroundColor: '#111827',
    color: palette.pearl,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontFamily: 'Courier',
  },
  code_block: {
    backgroundColor: '#0F172A',
    color: palette.pearl,
    borderRadius: 12,
    padding: 14,
    fontFamily: 'Courier',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.6)',
    marginBottom: 12,
  },
  fence: {
    backgroundColor: '#0F172A',
    color: palette.pearl,
    borderRadius: 12,
    padding: 14,
    fontFamily: 'Courier',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.6)',
    marginBottom: 12,
  },
  table: {
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.3)',
    borderRadius: 12,
    marginBottom: 12,
  },
  thead: {
    backgroundColor: 'rgba(148,163,184,0.1)',
  },
  th: {
    ...typography.subtitle,
    color: palette.platinum,
    padding: 8,
  },
  tr: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148,163,184,0.2)',
  },
  td: {
    color: palette.pearl,
    padding: 8,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: palette.silver,
  },
});
